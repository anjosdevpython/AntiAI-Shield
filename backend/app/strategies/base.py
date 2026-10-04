from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Callable, Optional
from PIL import Image


@dataclass
class ProtectionConfig:
    strength: str = "balanced"  # balanced, strong, maximum
    target_model: str = "stable-diffusion-v1-5"
    remove_exif: bool = True
    device: str = "auto"
    output_format: str = "PNG"
    # Custom strategy tuning parameters
    custom_epsilon: Optional[float] = None
    custom_steps: Optional[int] = None
    custom_focus: Optional[str] = "balanced"  # balanced, texture, structure
    # Semantic defense against multimodal LLMs (ChatGPT / Claude / Gemini)
    anti_llm_directive: bool = True


@dataclass
class ProtectionResult:
    image_bytes: bytes
    format: str
    method: str
    strength: str
    target_model: str
    perturbation_norm_linf: float
    perturbation_psnr: float
    device_used: str
    steps_computed: int
    time_taken_ms: float
    width: int
    height: int
    exif_removed: bool


ProgressCallback = Callable[[int, int, str], None]


class ProtectionStrategy(ABC):
    """Abstract base class for all image protection strategies."""

    name: str = "base"
    display_name: str = "Base Strategy"
    description: str = ""
    is_implemented: bool = True

    @abstractmethod
    async def protect(
        self,
        image: Image.Image,
        config: ProtectionConfig,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> ProtectionResult:
        """
        Applies adversarial perturbation to the input PIL image.
        
        Args:
            image: Input PIL image.
            config: Protection parameters.
            progress_callback: Optional callback for (step, total_steps, status_message).
            
        Returns:
            ProtectionResult containing processed image and metrics.
        """
        pass
