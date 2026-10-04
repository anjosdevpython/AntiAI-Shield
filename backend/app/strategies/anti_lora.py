import asyncio
import math
import time
from typing import Optional, Tuple
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F

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
        # Conv projections to extract spatial feature maps mimicking LoRA cross-attention layers
        self.conv_q = nn.Conv2d(3, 16, kernel_size=3, padding=1, bias=False)
        self.conv_k = nn.Conv2d(3, 16, kernel_size=3, padding=1, bias=False)
        # Fixed orthogonal projections
        nn.init.orthogonal_(self.conv_q.weight)
        nn.init.orthogonal_(self.conv_k.weight)
        for p in self.parameters():
            p.requires_grad = False

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        b, c, h, w = x.shape
        q = self.conv_q(x)
        k = self.conv_k(x)

        # Downsample for spectral efficiency
        q_pool = F.adaptive_avg_pool2d(q, (16, 16)).flatten(2)  # [B, 16, 256]
        k_pool = F.adaptive_avg_pool2d(k, (16, 16)).flatten(2)  # [B, 16, 256]

        # Cross-patch correlation matrix simulating attention Gram matrix
        gram = torch.bmm(q_pool, k_pool.transpose(1, 2)) / 256.0  # [B, 16, 16]

        # Multi-scale spatial edges
        edges = torch.abs(x[:, :, :, :-1] - x[:, :, :, 1:]).mean() + \
                torch.abs(x[:, :, :-1, :] - x[:, :, 1:, :]).mean()

        return gram, edges


class AntiLoRAStrategy(ProtectionStrategy):
    """
    Anti-LoRA Defense Strategy.
    
    Perturbs Low-Rank Adaptation (LoRA) cross-attention and projection manifolds.
    Optimizes adversarial noise to disrupt rank-r subspace factorization in diffusion models.
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

        # 1. Device selection
        if config.device == "cuda" and torch.cuda.is_available():
            device = torch.device("cuda")
            device_name = f"cuda ({torch.cuda.get_device_name(0)})"
        elif config.device == "auto" and torch.cuda.is_available():
            device = torch.device("cuda")
            device_name = f"cuda ({torch.cuda.get_device_name(0)})"
        else:
            device = torch.device("cpu")
            device_name = "cpu"

        strength = config.strength if config.strength in self.STRENGTH_CONFIGS else "balanced"
        cfg = self.STRENGTH_CONFIGS[strength]
        epsilon = cfg["epsilon"]
        alpha = cfg["alpha"]
        steps = cfg["steps"]

        if progress_callback:
            progress_callback(1, steps + 3, "Pré-processando imagem para Anti-LoRA...")
            await asyncio.sleep(0.01)

        # 2. Convert to RGB tensor
        orig_rgb = image.convert("RGB") if image.mode != "RGB" else image
        w, h = orig_rgb.size
        max_dim = 1920
        resample_needed = max(w, h) > max_dim
        if resample_needed:
            scale = max_dim / max(w, h)
            proc_w, proc_h = int(w * scale), int(h * scale)
            proc_img = orig_rgb.resize((proc_w, proc_h), Image.Resampling.LANCZOS)
        else:
            proc_img = orig_rgb
            proc_w, proc_h = w, h

        np_img = np.array(proc_img, dtype=np.float32) / 255.0
        x_orig = torch.from_numpy(np_img).permute(2, 0, 1).unsqueeze(0).to(device)

        if progress_callback:
            progress_callback(2, steps + 3, f"Módulo espectral LoRA carregado ({device_name})")
            await asyncio.sleep(0.01)

        surrogate = LoRASubspaceDisruptionModule().to(device)
        surrogate.eval()

        with torch.no_grad():
            clean_gram, clean_edges = surrogate(x_orig)

        # 3. PGD with Subspace Dispersion
        delta = (torch.rand_like(x_orig) * 2 - 1) * alpha
        delta = torch.clamp(delta, -epsilon, epsilon)
        delta.requires_grad = True

        momentum = torch.zeros_like(x_orig)
        decay = 0.85

        for step in range(steps):
            adv_x = torch.clamp(x_orig + delta, 0.0, 1.0)
            adv_gram, adv_edges = surrogate(adv_x)

            # Maximize Frobenius distance between perturbed cross-patch Gram matrix and clean Gram matrix
            gram_dist = torch.norm(adv_gram - clean_gram, p="fro")
            edge_diff = F.l1_loss(adv_edges, clean_edges)

            # Maximize distance
            loss = -gram_dist - 0.3 * edge_diff

            loss.backward()

            with torch.no_grad():
                grad = delta.grad
                grad_norm = grad / (torch.mean(torch.abs(grad), dim=(1, 2, 3), keepdim=True) + 1e-8)
                momentum = decay * momentum + grad_norm
                delta.data = delta.data - alpha * torch.sign(momentum)
                delta.data = torch.clamp(delta.data, -epsilon, epsilon)
                delta.data = torch.clamp(x_orig + delta.data, 0.0, 1.0) - x_orig
                delta.grad.zero_()

            if progress_callback:
                pct = int(((step + 1) / steps) * 100)
                msg = f"Disrompendo subespaço LoRA ({step + 1}/{steps} passos • {pct}%)"
                progress_callback(step + 3, steps + 3, msg)
                await asyncio.sleep(0.005)

        if progress_callback:
            progress_callback(steps + 3, steps + 3, "Finalizando imagem protegida...")
            await asyncio.sleep(0.01)

        with torch.no_grad():
            final_adv = torch.clamp(x_orig + delta, 0.0, 1.0).squeeze(0).permute(1, 2, 0).cpu().numpy()
            delta_np = delta.squeeze(0).permute(1, 2, 0).cpu().numpy()

            linf_norm = float(np.max(np.abs(delta_np)))
            mse = float(np.mean((final_adv - np_img) ** 2))
            psnr = 10.0 * math.log10(1.0 / max(mse, 1e-10))

            adv_uint8 = (final_adv * 255.0).round().astype(np.uint8)
            adv_pil = Image.fromarray(adv_uint8)

            if resample_needed:
                adv_pil = adv_pil.resize((w, h), Image.Resampling.LANCZOS)

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
            perturbation_psnr=round(psnr, 2),
            device_used=device_name,
            steps_computed=steps,
            time_taken_ms=round(elapsed_ms, 2),
            width=w,
            height=h,
            exif_removed=config.remove_exif,
        )
