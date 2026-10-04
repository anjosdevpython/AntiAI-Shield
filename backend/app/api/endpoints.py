import torch
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.core.security import ImageSecurityError
from app.services.protection_service import ProtectionServiceError, protection_service

router = APIRouter()


@router.get("/health", summary="Health check endpoint")
async def health_check():
    """Returns application status and version."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@router.get("/config", summary="System configuration and device information")
async def get_system_config():
    """
    Returns runtime configuration, device capabilities (CUDA / CPU),
    and catalog of available protection strategies.
    """
    cuda_available = torch.cuda.is_available()
    device = "cuda" if cuda_available else "cpu"
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU (Standard Processor)"

    return {
        "device": device,
        "cuda_available": cuda_available,
        "device_name": device_name,
        "max_upload_mb": settings.MAX_UPLOAD_MB,
        "default_protection_level": settings.DEFAULT_PROTECTION_LEVEL,
        "delete_after_processing": settings.DELETE_AFTER_PROCESSING,
        "strategies": protection_service.get_available_strategies(),
        "strength_levels": [
            {
                "id": "balanced",
                "label": "Equilibrado",
                "description": "Boa relação entre preservação visual e proteção.",
                "recommended": True,
            },
            {
                "id": "strong",
                "label": "Forte",
                "description": "Maior resistência contra treinamento, com possível alteração visual ligeiramente maior.",
                "recommended": False,
            },
            {
                "id": "maximum",
                "label": "Máxima",
                "description": "Maior intensidade disponível, podendo aumentar artefatos ou alterações perceptíveis.",
                "recommended": False,
            },
        ],
    }


@router.post("/protect", summary="Apply adversarial protection to an uploaded image")
async def protect_image(
    file: UploadFile = File(..., description="Arquivo de imagem a ser protegido (JPG, PNG ou WEBP)"),
    method: str = Form("anti-dreambooth", description="Método adversarial"),
    strength: str = Form("balanced", description="Nível de intensidade: balanced, strong, maximum"),
    target_model: str = Form("stable-diffusion-v1-5", description="Modelo alvo de referência"),
    remove_exif: bool = Form(True, description="Remover metadados EXIF"),
    custom_epsilon: float = Form(None, description="Orçamento epsilon customizado (ex: 0.047)"),
    custom_steps: int = Form(None, description="Número customizado de iterações"),
    custom_focus: str = Form("balanced", description="Foco customizado: balanced, texture, structure"),
):
    """
    Receives image, validates file safety, applies adversarial perturbation,
    and returns processed result metadata with download and preview tokens.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de arquivo inválido ou ausente.",
        )

    try:
        content = await file.read()
        result = await protection_service.protect(
            image_bytes=content,
            original_filename=file.filename,
            method=method,
            strength=strength,
            target_model=target_model,
            remove_exif=remove_exif,
            custom_epsilon=custom_epsilon,
            custom_steps=custom_steps,
            custom_focus=custom_focus,
        )
        return result
    except ImageSecurityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except ProtectionServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Não foi possível proteger esta imagem. Tente novamente ou utilize uma imagem menor. ({str(e)})",
        )


@router.get("/preview/{image_id}", summary="Preview original or protected image")
async def get_preview(image_id: str, type: str = "protected"):
    """
    Returns image stream for frontend Before/After comparison.
    Type can be 'original' or 'protected'.
    """
    record = protection_service.get_record(image_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada ou expirada.",
        )

    path = record["orig_path"] if type == "original" else record["protected_path"]
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo não encontrado no servidor.",
        )

    return FileResponse(
        path=path,
        media_type=record["mime_type"],
        filename=path.name,
    )


@router.get("/download/{image_id}", summary="Download protected image")
async def download_image(image_id: str, background_tasks: BackgroundTasks):
    """
    Downloads protected image.
    If DELETE_AFTER_PROCESSING is enabled, triggers deferred cleanup of temporary files.
    """
    record = protection_service.get_record(image_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada ou expirada.",
        )

    protected_path = record["protected_path"]
    if not protected_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo protegido não encontrado.",
        )

    clean_orig_name = record["original_filename"]
    # Build clean output filename
    base_name = clean_orig_name.rsplit(".", 1)[0]
    out_filename = f"antiai_protected_{base_name}{record['file_ext']}"

    # Schedule deferred cleanup if configured
    if settings.DELETE_AFTER_PROCESSING:
        # Give a short delay or schedule cleanup after response stream completes
        background_tasks.add_task(protection_service.delete_record_files, image_id)

    return FileResponse(
        path=protected_path,
        media_type=record["mime_type"],
        filename=out_filename,
        headers={"Content-Disposition": f'attachment; filename="{out_filename}"'},
    )


@router.delete("/cleanup/{image_id}", summary="Manually trigger cleanup of image session")
async def cleanup_image(image_id: str):
    """Explicitly deletes original and protected files for an image session."""
    deleted = protection_service.delete_record_files(image_id)
    return {"image_id": image_id, "cleaned": deleted}
