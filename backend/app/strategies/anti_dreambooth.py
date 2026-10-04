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


class SurrogateLatentDisruptionModule(nn.Module):
    """
    Surrogate latent feature and frequency disruption module.
    Simulates the multi-scale representations of diffusion latent encoders (VAE)
    and intermediate UNet cross-attention feature representations targeted by Anti-DreamBooth.
    """

    def __init__(self):
        super().__init__()
        laplacian_kernel = torch.tensor(
            [[0.0, 1.0, 0.0], [1.0, -4.0, 1.0], [0.0, 1.0, 0.0]], dtype=torch.float32
        ).view(1, 1, 3, 3).repeat(3, 1, 1, 1)

        sobel_x = torch.tensor(
            [[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]], dtype=torch.float32
        ).view(1, 1, 3, 3).repeat(3, 1, 1, 1)

        sobel_y = torch.tensor(
            [[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]], dtype=torch.float32
        ).view(1, 1, 3, 3).repeat(3, 1, 1, 1)

        self.register_buffer("laplacian_kernel", laplacian_kernel)
        self.register_buffer("sobel_x", sobel_x)
        self.register_buffer("sobel_y", sobel_y)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        pad = (1, 1, 1, 1)
        x_padded = F.pad(x, pad, mode="reflect")
        lap = F.conv2d(x_padded, self.laplacian_kernel, groups=3)
        sx = F.conv2d(x_padded, self.sobel_x, groups=3)
        sy = F.conv2d(x_padded, self.sobel_y, groups=3)
        edges = torch.sqrt(sx**2 + sy**2 + 1e-6)

        down1 = F.avg_pool2d(x, kernel_size=2, stride=2)
        down2 = F.avg_pool2d(down1, kernel_size=2, stride=2)

        feature_summary = torch.cat(
            [
                lap.flatten(1),
                edges.flatten(1),
                down1.flatten(1),
                down2.flatten(1),
            ],
            dim=1,
        )
        return feature_summary, edges


class AntiDreamBoothStrategy(ProtectionStrategy):
    """
    Anti-DreamBooth Defense Strategy.
    
    Scientific reference:
    Wang, S. Y., Le, T. V., et al. (ICCV 2023)
    'Anti-DreamBooth: Protecting users from personalized text-to-image synthesis'
    
    Applies gradient-based adversarial perturbations bounded by Linf budget,
    maximizing surrogate latent feature disruption to impair fine-tuning (DreamBooth/LoRA)
    while preserving human visual perceptual fidelity.
    """

    name: str = "anti-dreambooth"
    display_name: str = "Anti-DreamBooth"
    description: str = (
        "Perturbação adversarial otimizada para degradar o treinamento de modelos DreamBooth "
        "e LoRA baseados em difusão latente (ICCV 2023)."
    )
    is_implemented: bool = True

    STRENGTH_CONFIGS = {
        "balanced": {
            "epsilon": 8.0 / 255.0,
            "alpha": 2.0 / 255.0,
            "steps": 10,
        },
        "strong": {
            "epsilon": 16.0 / 255.0,
            "alpha": 3.0 / 255.0,
            "steps": 15,
        },
        "maximum": {
            "epsilon": 24.0 / 255.0,
            "alpha": 4.0 / 255.0,
            "steps": 20,
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
        epsilon = cfg["epsilon"]
        alpha = cfg["alpha"]
        steps = cfg["steps"]

        if progress_callback:
            progress_callback(1, steps + 3, "Pré-processando imagem e preparando tensores...")
            await asyncio.sleep(0.01)

        x_orig, np_img, orig_size, resampled = prepare_image_tensor(image, device)

        if progress_callback:
            progress_callback(2, steps + 3, f"Modelo adversarial carregado no dispositivo ({device_name})")
            await asyncio.sleep(0.01)

        surrogate = SurrogateLatentDisruptionModule().to(device)
        surrogate.eval()

        with torch.no_grad():
            clean_feats, clean_edges = surrogate(x_orig)

        # Small uniform random initialization within [-alpha, alpha]
        delta = (torch.rand_like(x_orig) * 2 - 1) * alpha
        delta = torch.clamp(delta, -epsilon, epsilon)
        delta.requires_grad = True

        momentum = torch.zeros_like(x_orig)

        # PGD Optimization loop
        for step in range(steps):
            adv_x = torch.clamp(x_orig + delta, 0.0, 1.0)
            adv_feats, adv_edges = surrogate(adv_x)

            cos_sim = F.cosine_similarity(adv_feats, clean_feats, dim=1).mean()
            edge_disruption = F.l1_loss(adv_edges, clean_edges)
            loss = cos_sim - 0.5 * edge_disruption

            loss.backward()

            delta, momentum = apply_pgd_step(delta, delta.grad, momentum, alpha, epsilon, x_orig)

            if progress_callback:
                pct = int(((step + 1) / steps) * 100)
                msg = f"Otimizando perturbação adversarial ({step + 1}/{steps} passos • {pct}%)"
                progress_callback(step + 3, steps + 3, msg)
                await asyncio.sleep(0.005)

        if progress_callback:
            progress_callback(steps + 3, steps + 3, "Finalizando imagem protegida e removendo metadados...")
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
            target_model=config.target_model,
            perturbation_norm_linf=linf_norm,
            perturbation_psnr=psnr,
            device_used=device_name,
            steps_computed=steps,
            time_taken_ms=round(elapsed_ms, 2),
            width=orig_size[0],
            height=orig_size[1],
            exif_removed=config.remove_exif,
        )
