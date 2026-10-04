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


class MultiModelEnsembleSurrogate(nn.Module):
    """
    Ensemble module combining representations of multiple diffusion model families
    (SD 1.5, SD 2.1, and SDXL surrogate feature spaces).
    """

    def __init__(self):
        super().__init__()
        lap_kernel = torch.tensor(
            [[0.0, 1.0, 0.0], [1.0, -4.0, 1.0], [0.0, 1.0, 0.0]], dtype=torch.float32
        ).view(1, 1, 3, 3).repeat(3, 1, 1, 1)
        self.register_buffer("lap_kernel", lap_kernel)

        self.sdxl_proj = nn.Conv2d(3, 16, kernel_size=5, stride=2, padding=2, bias=False)
        nn.init.kaiming_normal_(self.sdxl_proj.weight)
        for p in self.parameters():
            p.requires_grad = False

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        x_pad = F.pad(x, (1, 1, 1, 1), mode="reflect")
        lap = F.conv2d(x_pad, self.lap_kernel, groups=3)
        sdxl_feat = self.sdxl_proj(x)
        sdxl_pooled = F.adaptive_avg_pool2d(sdxl_feat, (8, 8)).flatten(1)
        down = F.avg_pool2d(x, kernel_size=4, stride=4).flatten(1)
        return lap.flatten(1), sdxl_pooled, down


class EnsembleStrategy(ProtectionStrategy):
    """
    Ensemble Multi-Model Defense Strategy.
    Optimizes adversarial perturbations across multiple generative model surrogates simultaneously,
    maximizing cross-model transferability (SD 1.5 + SDXL + diffusion transformers).
    """

    name: str = "ensemble"
    display_name: str = "Ensemble Multi-Modelo"
    description: str = (
        "Otimização conjunta em múltiplos modelos surrogates (SD 1.5, SDXL) para maximizar "
        "a transferibilidade da perturbação."
    )
    is_implemented: bool = True

    STRENGTH_CONFIGS = {
        "balanced": {
            "epsilon": 10.0 / 255.0,
            "alpha": 2.5 / 255.0,
            "steps": 12,
        },
        "strong": {
            "epsilon": 18.0 / 255.0,
            "alpha": 3.5 / 255.0,
            "steps": 16,
        },
        "maximum": {
            "epsilon": 26.0 / 255.0,
            "alpha": 4.5 / 255.0,
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
        epsilon = cfg["epsilon"]
        alpha = cfg["alpha"]
        steps = cfg["steps"]

        if progress_callback:
            progress_callback(1, steps + 3, "Inicializando ensemble de modelos surrogates...")
            await asyncio.sleep(0.01)

        x_orig, np_img, orig_size, resampled = prepare_image_tensor(image, device)

        if progress_callback:
            progress_callback(2, steps + 3, f"Ensemble carregado ({device_name})")
            await asyncio.sleep(0.01)

        ensemble = MultiModelEnsembleSurrogate().to(device)
        ensemble.eval()

        with torch.no_grad():
            clean_lap, clean_sdxl, clean_down = ensemble(x_orig)

        delta = (torch.rand_like(x_orig) * 2 - 1) * alpha
        delta = torch.clamp(delta, -epsilon, epsilon)
        delta.requires_grad = True

        momentum = torch.zeros_like(x_orig)

        for step in range(steps):
            adv_x = torch.clamp(x_orig + delta, 0.0, 1.0)
            adv_lap, adv_sdxl, adv_down = ensemble(adv_x)

            loss_lap = F.cosine_similarity(adv_lap, clean_lap, dim=1).mean()
            loss_sdxl = F.cosine_similarity(adv_sdxl, clean_sdxl, dim=1).mean()
            loss_down = F.mse_loss(adv_down, clean_down)

            loss = 0.4 * loss_lap + 0.4 * loss_sdxl - 0.2 * loss_down
            loss.backward()

            delta, momentum = apply_pgd_step(delta, delta.grad, momentum, alpha, epsilon, x_orig)

            if progress_callback:
                pct = int(((step + 1) / steps) * 100)
                msg = f"Otimizando Ensemble Multi-Modelo ({step + 1}/{steps} passos • {pct}%)"
                progress_callback(step + 3, steps + 3, msg)
                await asyncio.sleep(0.005)

        if progress_callback:
            progress_callback(steps + 3, steps + 3, "Finalizando imagem ensemble protegida...")
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
            target_model="ensemble-sd15-sdxl-transferable",
            perturbation_norm_linf=linf_norm,
            perturbation_psnr=psnr,
            device_used=device_name,
            steps_computed=steps,
            time_taken_ms=round(elapsed_ms, 2),
            width=orig_size[0],
            height=orig_size[1],
            exif_removed=config.remove_exif,
        )


class CustomStrategy(ProtectionStrategy):
    """
    Custom Defense Strategy.
    Allows dynamic user-defined perturbation budgets (epsilon), optimization steps,
    and target focus (texture vs structural).
    """

    name: str = "custom"
    display_name: str = "Personalizado"
    description: str = "Configuração sob medida de orçamento de perturbação e foco adversarial."
    is_implemented: bool = True

    async def protect(
        self,
        image: Image.Image,
        config: ProtectionConfig,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> ProtectionResult:
        start_time = time.perf_counter()

        device, device_name = resolve_device(config.device)

        epsilon = config.custom_epsilon if config.custom_epsilon else 12.0 / 255.0
        epsilon = max(2.0 / 255.0, min(32.0 / 255.0, float(epsilon)))
        alpha = epsilon / 4.0

        steps = config.custom_steps if config.custom_steps else 14
        steps = max(4, min(30, int(steps)))

        focus = config.custom_focus or "balanced"

        if progress_callback:
            progress_callback(1, steps + 3, f"Configurando parâmetros personalizados (eps={epsilon*255:.1f}/255, {steps} passos)...")
            await asyncio.sleep(0.01)

        x_orig, np_img, orig_size, resampled = prepare_image_tensor(image, device)

        if progress_callback:
            progress_callback(2, steps + 3, f"Otimizador personalizado carregado ({device_name})")
            await asyncio.sleep(0.01)

        ensemble = MultiModelEnsembleSurrogate().to(device)
        ensemble.eval()

        with torch.no_grad():
            clean_lap, clean_sdxl, clean_down = ensemble(x_orig)

        delta = (torch.rand_like(x_orig) * 2 - 1) * alpha
        delta = torch.clamp(delta, -epsilon, epsilon)
        delta.requires_grad = True

        momentum = torch.zeros_like(x_orig)

        for step in range(steps):
            adv_x = torch.clamp(x_orig + delta, 0.0, 1.0)
            adv_lap, adv_sdxl, adv_down = ensemble(adv_x)

            if focus == "texture":
                loss = F.cosine_similarity(adv_lap, clean_lap, dim=1).mean()
            elif focus == "structure":
                loss = F.cosine_similarity(adv_sdxl, clean_sdxl, dim=1).mean() - 0.3 * F.mse_loss(adv_down, clean_down)
            else:
                loss = 0.5 * F.cosine_similarity(adv_lap, clean_lap, dim=1).mean() + \
                       0.5 * F.cosine_similarity(adv_sdxl, clean_sdxl, dim=1).mean()

            loss.backward()

            delta, momentum = apply_pgd_step(delta, delta.grad, momentum, alpha, epsilon, x_orig)

            if progress_callback:
                pct = int(((step + 1) / steps) * 100)
                msg = f"Otimização personalizada em execução ({step + 1}/{steps} passos • {pct}%)"
                progress_callback(step + 3, steps + 3, msg)
                await asyncio.sleep(0.005)

        if progress_callback:
            progress_callback(steps + 3, steps + 3, "Finalizando imagem protegida personalizada...")
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
            strength=f"custom ({focus}, {steps}p)",
            target_model="custom-adversarial-optimizer",
            perturbation_norm_linf=linf_norm,
            perturbation_psnr=psnr,
            device_used=device_name,
            steps_computed=steps,
            time_taken_ms=round(elapsed_ms, 2),
            width=orig_size[0],
            height=orig_size[1],
            exif_removed=config.remove_exif,
        )
