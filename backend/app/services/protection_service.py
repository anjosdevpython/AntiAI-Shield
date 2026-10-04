import asyncio
import io
import time
from pathlib import Path
from typing import Dict, List, Optional
from PIL import Image

from app.config import settings
from app.core.exif import save_image_stripped
from app.core.prompt_injection import inject_visual_prompt_injection
from app.core.security import (
    generate_secure_file_id,
    sanitize_filename,
    validate_image_bytes,
)
from app.strategies import (
    AntiDreamBoothStrategy,
    AntiEditingStrategy,
    AntiLoRAStrategy,
    CustomStrategy,
    EnsembleStrategy,
    ProgressCallback,
    ProtectionConfig,
    ProtectionResult,
    ProtectionStrategy,
)


class ProtectionServiceError(Exception):
    """Raised when protection processing fails."""
    pass


class ImageProtectionService:
    """
    Central service orchestrating image protection strategies,
    validation, file lifecycle, and cleanup.
    """

    def __init__(self):
        # Register available strategies (Strategy Pattern)
        self.strategies: Dict[str, ProtectionStrategy] = {
            "anti-editing": AntiEditingStrategy(),
            "anti-dreambooth": AntiDreamBoothStrategy(),
            "anti-lora": AntiLoRAStrategy(),
            "ensemble": EnsembleStrategy(),
            "custom": CustomStrategy(),
        }
        # In-memory storage for active file records: image_id -> dict
        self._records: Dict[str, dict] = {}
        # Concurrency lock to prevent multiple heavy autograd workloads from exhausting 512MB RAM
        self._concurrency_lock = asyncio.Lock()

    def get_available_strategies(self) -> List[dict]:
        """Returns catalog of registered protection strategies."""
        return [
            {
                "id": strat.name,
                "name": strat.display_name,
                "description": strat.description,
                "is_implemented": strat.is_implemented,
            }
            for strat in self.strategies.values()
        ]

    async def protect(
        self,
        image_bytes: bytes,
        original_filename: str,
        method: str = "anti-dreambooth",
        strength: str = "balanced",
        target_model: str = "stable-diffusion-v1-5",
        remove_exif: bool = True,
        custom_epsilon: Optional[float] = None,
        custom_steps: Optional[int] = None,
        custom_focus: Optional[str] = "balanced",
        anti_llm_directive: bool = True,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> dict:
        """
        Executes protection workflow:
        1. Validates image integrity and limits.
        2. Applies selected protection strategy.
        3. Persists temporary output.
        4. Returns sanitized tracking payload.
        """
        # 1. Validation
        mime_type, file_ext = validate_image_bytes(image_bytes, max_mb=settings.MAX_UPLOAD_MB)
        safe_name = sanitize_filename(original_filename)

        # 2. Strategy lookup
        strategy = self.strategies.get(method.lower())
        if not strategy:
            raise ProtectionServiceError(f"Método de proteção desconhecido: '{method}'.")

        if not strategy.is_implemented:
            raise ProtectionServiceError(
                f"O método '{strategy.display_name}' ainda não está implementado neste ambiente. "
                "Utilize o método 'Anti-DreamBooth'."
            )

        # 3. Read PIL Image
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise ProtectionServiceError("Não foi possível carregar a imagem enviada.") from e

        # Determine target output format
        output_format = "PNG"
        if file_ext.lower() in [".jpg", ".jpeg"]:
            output_format = "JPEG"
        elif file_ext.lower() == ".webp":
            output_format = "WEBP"

        config = ProtectionConfig(
            strength=strength,
            target_model=target_model,
            remove_exif=remove_exif,
            device=settings.DEVICE,
            output_format=output_format,
            custom_epsilon=custom_epsilon,
            custom_steps=custom_steps,
            custom_focus=custom_focus,
            anti_llm_directive=anti_llm_directive,
        )

        # 4. Execute strategy safely under concurrency lock
        try:
            async with self._concurrency_lock:
                result: ProtectionResult = await strategy.protect(
                    image=pil_img,
                    config=config,
                    progress_callback=progress_callback,
                )
        except Exception as e:
            raise ProtectionServiceError(f"Falha durante o processamento da imagem: {str(e)}") from e

        # 5. Apply Semantic Visual Prompt Injection (Anti-ChatGPT / Anti-LLM) if enabled
        if anti_llm_directive:
            try:
                prot_pil = Image.open(io.BytesIO(result.image_bytes))
                injected_pil = inject_visual_prompt_injection(prot_pil, opacity_level="subtle")
                if remove_exif:
                    result.image_bytes = save_image_stripped(injected_pil, output_format=output_format, quality=95)
                else:
                    buf = io.BytesIO()
                    injected_pil.save(buf, format=output_format, quality=95)
                    result.image_bytes = buf.getvalue()
            except Exception:
                pass

        # 6. Persist protected and original files temporarily with UUID
        image_id = generate_secure_file_id()
        orig_filename = f"{image_id}_orig{file_ext}"
        protected_filename = f"{image_id}_protected{file_ext}"

        orig_path = settings.UPLOADS_DIR / orig_filename
        protected_path = settings.OUTPUTS_DIR / protected_filename

        # Write original safely
        with open(orig_path, "wb") as f_orig:
            f_orig.write(image_bytes)

        # Write protected
        with open(protected_path, "wb") as f_prot:
            f_prot.write(result.image_bytes)

        # Explicitly release image objects and trigger garbage collection
        del pil_img
        import gc
        gc.collect()

        # Store metadata
        record = {
            "image_id": image_id,
            "original_filename": safe_name,
            "orig_path": orig_path,
            "protected_path": protected_path,
            "file_ext": file_ext,
            "mime_type": mime_type,
            "created_at": time.time(),
            "method": result.method,
            "method_name": strategy.display_name,
            "strength": result.strength,
            "target_model": result.target_model,
            "width": result.width,
            "height": result.height,
            "perturbation_norm_linf": result.perturbation_norm_linf,
            "perturbation_psnr": result.perturbation_psnr,
            "device_used": result.device_used,
            "steps_computed": result.steps_computed,
            "time_taken_ms": result.time_taken_ms,
            "exif_removed": result.exif_removed,
            "anti_llm_directive": anti_llm_directive,
        }
        self._records[image_id] = record

        # Run routine cleanup of any stale files older than retention policy
        self.cleanup_stale_files(max_age_minutes=settings.FILE_RETENTION_MINUTES)

        return {
            "image_id": image_id,
            "original_filename": safe_name,
            "method": result.method,
            "method_name": strategy.display_name,
            "strength": result.strength,
            "target_model": result.target_model,
            "resolution": f"{result.width} × {result.height}",
            "width": result.width,
            "height": result.height,
            "perturbation_norm_linf": result.perturbation_norm_linf,
            "perturbation_psnr": result.perturbation_psnr,
            "device_used": result.device_used,
            "steps_computed": result.steps_computed,
            "time_taken_ms": result.time_taken_ms,
            "exif_removed": result.exif_removed,
            "anti_llm_directive": anti_llm_directive,
            "download_url": f"/api/download/{image_id}",
            "original_preview_url": f"/api/preview/{image_id}?type=original",
            "protected_preview_url": f"/api/preview/{image_id}?type=protected",
        }

    def get_record(self, image_id: str) -> Optional[dict]:
        return self._records.get(image_id)

    def delete_record_files(self, image_id: str) -> bool:
        """Deletes files related to the given image_id and removes record."""
        record = self._records.pop(image_id, None)
        deleted = False
        if record:
            for key in ["orig_path", "protected_path"]:
                p: Path = record.get(key)
                if p and p.exists():
                    try:
                        p.unlink()
                        deleted = True
                    except OSError:
                        pass
        return deleted

    def cleanup_stale_files(self, max_age_minutes: int = 30) -> None:
        """Removes orphaned temp files older than max_age_minutes."""
        cutoff = time.time() - (max_age_minutes * 60)
        # Clean memory records
        stale_ids = [k for k, v in self._records.items() if v.get("created_at", 0) < cutoff]
        for sid in stale_ids:
            self.delete_record_files(sid)

        # Check folders directly
        for folder in [settings.UPLOADS_DIR, settings.OUTPUTS_DIR]:
            if folder.exists():
                for item in folder.iterdir():
                    if item.is_file():
                        try:
                            if item.stat().st_mtime < cutoff:
                                item.unlink()
                        except OSError:
                            pass


# Global singleton instance
protection_service = ImageProtectionService()
