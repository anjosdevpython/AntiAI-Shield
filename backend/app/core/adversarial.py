import math
from typing import Tuple
import numpy as np
from PIL import Image
import torch


def resolve_device(device_setting: str = "auto") -> Tuple[torch.device, str]:
    """Resolves torch compute device and descriptive label."""
    if device_setting == "cuda" and torch.cuda.is_available():
        return torch.device("cuda"), f"cuda ({torch.cuda.get_device_name(0)})"
    elif device_setting == "auto" and torch.cuda.is_available():
        return torch.device("cuda"), f"cuda ({torch.cuda.get_device_name(0)})"
    return torch.device("cpu"), "cpu"


def prepare_image_tensor(
    image: Image.Image,
    device: torch.device,
    max_dim: int = 768,
) -> Tuple[torch.Tensor, np.ndarray, Tuple[int, int], bool]:
    """
    Converts PIL Image to normalized PyTorch tensor [1, 3, H, W] in [0, 1].
    Applies high-quality Lanczos downsampling if the image exceeds max_dim.
    
    Returns:
        (x_orig_tensor, normalized_numpy_array, (width, height), resampled_boolean)
    """
    orig_rgb = image.convert("RGB") if image.mode != "RGB" else image
    w, h = orig_rgb.size
    resample_needed = max(w, h) > max_dim

    if resample_needed:
        scale = max_dim / max(w, h)
        proc_w, proc_h = int(w * scale), int(h * scale)
        proc_img = orig_rgb.resize((proc_w, proc_h), Image.Resampling.LANCZOS)
    else:
        proc_img = orig_rgb

    np_img = np.array(proc_img, dtype=np.float32) / 255.0
    x_tensor = torch.from_numpy(np_img).permute(2, 0, 1).unsqueeze(0).to(device)

    return x_tensor, np_img, (w, h), resample_needed


def finalize_adversarial_image(
    x_orig: torch.Tensor,
    delta: torch.Tensor,
    orig_np: np.ndarray,
    orig_size: Tuple[int, int],
    resampled: bool,
) -> Tuple[Image.Image, float, float]:
    """
    Converts perturbed tensor x_orig + delta back to PIL Image,
    restoring original resolution if downsampled, and computing Linf norm and PSNR.
    
    Returns:
        (adv_pil_image, linf_norm, psnr_db)
    """
    with torch.no_grad():
        final_adv = torch.clamp(x_orig + delta, 0.0, 1.0).squeeze(0).permute(1, 2, 0).cpu().numpy()
        delta_np = delta.squeeze(0).permute(1, 2, 0).cpu().numpy()

        # Scientific metrics
        linf_norm = float(np.max(np.abs(delta_np)))
        mse = float(np.mean((final_adv - orig_np) ** 2))
        psnr = 10.0 * math.log10(1.0 / max(mse, 1e-10))

        # Reconstruct uint8 PIL
        adv_uint8 = (final_adv * 255.0).round().astype(np.uint8)
        adv_pil = Image.fromarray(adv_uint8)

        if resampled:
            adv_pil = adv_pil.resize(orig_size, Image.Resampling.LANCZOS)

        return adv_pil, linf_norm, round(psnr, 2)


def apply_pgd_step(
    delta: torch.Tensor,
    grad: torch.Tensor,
    momentum: torch.Tensor,
    alpha: float,
    epsilon: float,
    x_orig: torch.Tensor,
    decay: float = 0.85,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Performs Projected Gradient Descent (PGD) momentum step:
    1. Normalizes gradients via Linf mean.
    2. Updates momentum accumulator.
    3. Sign ascent step: delta = delta - alpha * sign(momentum).
    4. Projects into Linf ball [-epsilon, epsilon].
    5. Projects so (x_orig + delta) stays within valid image range [0, 1].
    """
    with torch.no_grad():
        grad_norm = grad / (torch.mean(torch.abs(grad), dim=(1, 2, 3), keepdim=True) + 1e-8)
        momentum = decay * momentum + grad_norm
        delta.data = delta.data - alpha * torch.sign(momentum)
        delta.data = torch.clamp(delta.data, -epsilon, epsilon)
        delta.data = torch.clamp(x_orig + delta.data, 0.0, 1.0) - x_orig
        delta.grad.zero_()

    return delta, momentum
