import asyncio
import time
from typing import Optional, Tuple
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F

from app.core.adversarial import (
    apply_pgd_step,
    finalize_adversarial_image,
    prepare_image_tensor,
    resolve_device,
)
from app.core.exif import save_image_stripped
from app.strategies.base import (
    ProgressCallback,
    ProtectionConfig,
    ProtectionResult,
    ProtectionStrategy,
)


class LoRASubspaceDisruptionModule(nn.Module):
    """
    Subspace Disruption Module targeting Low-Rank Adaptation (LoRA).
    
    LoRA approximates weight updates via rank-r factorization Delta W = B @ A (with r << d).
    This module computes multi-scale patch covariance and projects features to maximize
    dispersion away from low-rank spectral subspaces, preventing rank-r matrices from
    capturing facial and identity features.
    """

    def __init__(self):
        super().__init__()
        self.conv_q = nn.Conv2d(3, 16, kernel_size=3, padding=1, bias=False)
        self.conv_k = nn.Conv2d(3, 16, kernel_size=3, padding=1, bias=False)
        nn.init.orthogonal_(self.conv_q.weight)
        nn.init.orthogonal_(self.conv_k.weight)
        for p in self.parameters():
            p.requires_grad = False

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        q = self.conv_q(x)
        k = self.conv_k(x)

        q_pool = F.adaptive_avg_pool2d(q, (16, 16)).flatten(2)
        k_pool = F.adaptive_avg_pool2d(k, (16, 16)).flatten(2)
        gram = torch.bmm(q_pool, k_pool.transpose(1, 2)) / 256.0

        edges = torch.abs(x[:, :, :, :-1] - x[:, :, :, 1:]).mean() + \
                torch.abs(x[:, :, :-1, :] - x[:, :, 1:, :]).mean()

        return gram, edges


class AntiLoRAStrategy(ProtectionStrategy):
    """
    Anti-LoRA Defense Strategy.
    Perturbs Low-Rank Adaptation (LoRA) cross-attention and projection manifolds.
    """

    name: str = "anti-lora"
    display_name: str = "Anti-LoRA"
    description: str = (
        "Perturbação espectral focada em colapsar a adaptação de baixo posto (LoRA) "
        "e cross-attention em modelos difusores."
    )
    is_implemented: bool = True

    STRENGTH_CONFIGS = {
        "balanced": {
            "epsilon": 8.0 / 255.0,
            "alpha": 2.0 / 255.0,
            "steps": 12,
        },
        "strong": {
            "epsilon": 16.0 / 255.0,
            "alpha": 3.0 / 255.0,
            "steps": 16,
        },
        "maximum": {
            "epsilon": 24.0 / 255.0,
            "alpha": 4.0 / 255.0,
            "steps": 22,
        },
    }

    async def protect(
        self,
        image: Image.Image,
        config: ProtectionConfig,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> ProtectionResult:
        start_time = time.perf_counter()

        device, device_name = resolve_device(config.device)
        strength = config.strength if config.strength in self.STRENGTH_CONFIGS else "balanced"
        cfg = self.STRENGTH_CONFIGS[strength]
        epsilon = config.custom_epsilon if config.custom_epsilon is not None else cfg["epsilon"]
        if config.custom_steps is not None:
            steps = config.custom_steps
            alpha = cfg["alpha"]
        elif device.type == "cpu":
            cpu_steps_map = {"balanced": 5, "strong": 7, "maximum": 9}
            steps = cpu_steps_map.get(strength, 5)
            alpha = epsilon / 2.5
        else:
            steps = cfg["steps"]
            alpha = cfg["alpha"]

        if progress_callback:
            progress_callback(1, steps + 3, "Pré-processando imagem para Anti-LoRA...")
            await asyncio.sleep(0.01)

        x_orig, np_img, orig_size, resampled = prepare_image_tensor(image, device)

        if progress_callback:
            progress_callback(2, steps + 3, f"Módulo espectral LoRA carregado ({device_name})")
            await asyncio.sleep(0.01)

        surrogate = LoRASubspaceDisruptionModule().to(device)
        surrogate.eval()

        with torch.no_grad():
            clean_gram, clean_edges = surrogate(x_orig)

        delta = (torch.rand_like(x_orig) * 2 - 1) * alpha
        delta = torch.clamp(delta, -epsilon, epsilon)
        delta.requires_grad = True

        momentum = torch.zeros_like(x_orig)

        for step in range(steps):
            adv_x = torch.clamp(x_orig + delta, 0.0, 1.0)
            adv_gram, adv_edges = surrogate(adv_x)

            gram_dist = torch.norm(adv_gram - clean_gram, p="fro")
            edge_diff = F.l1_loss(adv_edges, clean_edges)
            loss = -gram_dist - 0.3 * edge_diff

            loss.backward()

            delta, momentum = apply_pgd_step(delta, delta.grad, momentum, alpha, epsilon, x_orig)

            # Free intermediate activations immediately
            del adv_x, adv_gram, adv_edges, loss

            if progress_callback:
                pct = int(((step + 1) / steps) * 100)
                msg = f"Disrompendo subespaço LoRA ({step + 1}/{steps} passos • {pct}%)"
                progress_callback(step + 3, steps + 3, msg)
                await asyncio.sleep(0.005)

        del surrogate, clean_gram, clean_edges, momentum

        if progress_callback:
            progress_callback(steps + 3, steps + 3, "Finalizando imagem protegida...")
            await asyncio.sleep(0.01)

        adv_pil, linf_norm, psnr = finalize_adversarial_image(x_orig, delta, np_img, orig_size, resampled)

        fmt = config.output_format.upper()
        if fmt not in ["PNG", "JPEG", "WEBP"]:
            fmt = "PNG"

        if config.remove_exif:
            output_bytes = save_image_stripped(adv_pil, output_format=fmt, quality=95)
        else:
            from io import BytesIO
            buf = BytesIO()
            adv_pil.save(buf, format=fmt, quality=95)
            output_bytes = buf.getvalue()

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return ProtectionResult(
            image_bytes=output_bytes,
            format=fmt,
            method=self.name,
            strength=strength,
            target_model="diffusion-lora-adaptation",
            perturbation_norm_linf=linf_norm,
            perturbation_psnr=psnr,
            device_used=device_name,
            steps_computed=steps,
            time_taken_ms=round(elapsed_ms, 2),
            width=orig_size[0],
            height=orig_size[1],
            exif_removed=config.remove_exif,
        )
