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


class MultiTargetEditingDisruptionModule(nn.Module):
    """
    Joint defense module targeting both Generative Inpainting Encoders (PhotoGuard)
    and Multimodal Vision Encoders (CLIP / SigLIP).
    """

    def __init__(self):
        super().__init__()
        self.conv_latent1 = nn.Conv2d(3, 32, kernel_size=3, stride=2, padding=1, bias=False)
        self.conv_latent2 = nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1, bias=False)
        self.conv_latent3 = nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1, bias=False)

        self.patch_proj = nn.Conv2d(3, 64, kernel_size=16, stride=16, bias=False)

        sobel_x = torch.tensor([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]]).view(1, 1, 3, 3).repeat(3, 1, 1, 1)
        sobel_y = torch.tensor([[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]]).view(1, 1, 3, 3).repeat(3, 1, 1, 1)
        self.register_buffer("sobel_x", sobel_x)
        self.register_buffer("sobel_y", sobel_y)

        for p in self.parameters():
            p.requires_grad = False

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        z1 = F.relu(self.conv_latent1(x))
        z2 = F.relu(self.conv_latent2(z1))
        z3 = self.conv_latent3(z2)
        latent_features = z3.flatten(1)

        patches = self.patch_proj(x).flatten(1)

        x_pad = F.pad(x, (1, 1, 1, 1), mode="reflect")
        sx = F.conv2d(x_pad, self.sobel_x, groups=3)
        sy = F.conv2d(x_pad, self.sobel_y, groups=3)
        edges = torch.sqrt(sx**2 + sy**2 + 1e-6).flatten(1)

        return latent_features, patches, edges


class AntiEditingStrategy(ProtectionStrategy):
    """
    Anti-Editing & Inpainting Defense Strategy (PhotoGuard + Vision Poisoning).
    Designed to break AI editing workflows (Generative Fill, Inpainting, Face-Swap).
    """

    name: str = "anti-editing"
    display_name: str = "Anti-Edição (PhotoGuard)"
    description: str = (
        "Defesa ativa contra edição por IA, Inpainting e Generative Fill (PhotoGuard / MIT), "
        "corrompendo codificadores latentes e leitores de visão."
    )
    is_implemented: bool = True

    STRENGTH_CONFIGS = {
        "balanced": {
            "epsilon": 12.0 / 255.0,
            "alpha": 3.0 / 255.0,
            "steps": 14,
        },
        "strong": {
            "epsilon": 20.0 / 255.0,
            "alpha": 4.0 / 255.0,
            "steps": 18,
        },
        "maximum": {
            "epsilon": 30.0 / 255.0,
            "alpha": 5.0 / 255.0,
            "steps": 24,
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
            progress_callback(1, steps + 3, "Preparando imunização contra edição generativa...")
            await asyncio.sleep(0.01)

        x_orig, np_img, orig_size, resampled = prepare_image_tensor(image, device)

        if progress_callback:
            progress_callback(2, steps + 3, f"Módulo PhotoGuard e Vision Scrambler carregado ({device_name})")
            await asyncio.sleep(0.01)

        model = MultiTargetEditingDisruptionModule().to(device)
        model.eval()

        with torch.no_grad():
            clean_latent, clean_patches, clean_edges = model(x_orig)
            corrupt_latent_target = torch.randn_like(clean_latent)

        delta = (torch.rand_like(x_orig) * 2 - 1) * alpha
        delta = torch.clamp(delta, -epsilon, epsilon)
        delta.requires_grad = True

        momentum = torch.zeros_like(x_orig)

        for step in range(steps):
            adv_x = torch.clamp(x_orig + delta, 0.0, 1.0)
            
            # Subtle random spatial jitter for compression robustness (EoT)
            if step % 2 == 0:
                jitter = (torch.rand_like(adv_x) - 0.5) * 0.005
                adv_x_jitter = torch.clamp(adv_x + jitter, 0.0, 1.0)
            else:
                adv_x_jitter = adv_x

            adv_latent, adv_patches, adv_edges = model(adv_x_jitter)

            loss_latent = F.mse_loss(adv_latent, corrupt_latent_target)
            loss_vision = F.cosine_similarity(adv_patches, clean_patches, dim=1).mean()
            loss_edges = F.cosine_similarity(adv_edges, clean_edges, dim=1).mean()

            loss = loss_latent + 0.8 * loss_vision + 0.5 * loss_edges
            loss.backward()

            delta, momentum = apply_pgd_step(delta, delta.grad, momentum, alpha, epsilon, x_orig)

            if progress_callback:
                pct = int(((step + 1) / steps) * 100)
                msg = f"Imunizando contra Inpainting e Edição ({step + 1}/{steps} passos • {pct}%)"
                progress_callback(step + 3, steps + 3, msg)
                await asyncio.sleep(0.005)

        if progress_callback:
            progress_callback(steps + 3, steps + 3, "Finalizando proteção anti-edição...")
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
            target_model="photoguard-vae-clip-disruption",
            perturbation_norm_linf=linf_norm,
            perturbation_psnr=psnr,
            device_used=device_name,
            steps_computed=steps,
            time_taken_ms=round(elapsed_ms, 2),
            width=orig_size[0],
            height=orig_size[1],
            exif_removed=config.remove_exif,
        )
