import io
import re
import uuid
from pathlib import Path
from typing import Tuple
from PIL import Image

# Allowed MIME types and their typical extensions
ALLOWED_SIGNATURES = {
    b"\xff\xd8\xff": ("image/jpeg", ".jpg"),
    b"\x89PNG\r\n\x1a\n": ("image/png", ".png"),
}


class ImageSecurityError(ValueError):
    """Raised when an uploaded file fails security validation."""
    pass


def validate_image_bytes(data: bytes, max_mb: int = 20) -> Tuple[str, str]:
    """
    Strictly validates image bytes:
    1. Checks maximum file size.
    2. Inspects magic bytes (file signature), not relying on client header/extension.
    3. Verifies file integrity using Pillow parser.
    4. Guards against decompression bombs.
    
    Returns:
        (detected_mime_type, detected_extension)
    """
    # 1. Size validation
    max_bytes = max_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise ImageSecurityError(
            f"A imagem excede o limite de {max_mb} MB (tamanho: {len(data) / (1024*1024):.2f} MB)."
        )

    if len(data) < 16:
        raise ImageSecurityError("O arquivo enviado é muito pequeno ou está corrompido.")

    # 2. Magic bytes validation
    detected_mime = None
    detected_ext = None

    for sig, (mime, ext) in ALLOWED_SIGNATURES.items():
        if data.startswith(sig):
            detected_mime = mime
            detected_ext = ext
            break

    # WEBP magic byte check: 'RIFF'....'WEBP'
    if not detected_mime and data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        detected_mime = "image/webp"
        detected_ext = ".webp"

    if not detected_mime:
        raise ImageSecurityError(
            "Esse arquivo não parece ser uma imagem compatível. Envie JPG, PNG ou WEBP."
        )

    # 3. Pillow structural integrity validation
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
            width, height = img.size
            if width < 32 or height < 32:
                raise ImageSecurityError("Dimensões da imagem muito pequenas (mínimo 32x32 pixels).")
            if width > 8192 or height > 8192:
                raise ImageSecurityError("Dimensões da imagem muito grandes (máximo 8192x8192 pixels).")
    except ImageSecurityError:
        raise
    except Exception as exc:
        raise ImageSecurityError("Falha na decodificação da imagem. O arquivo pode estar corrompido.") from exc

    return detected_mime, detected_ext


def sanitize_filename(original_name: str) -> str:
    """
    Sanitizes user filename, removing path traversal and forbidden characters.
    """
    # Strip any directory separators
    clean_name = Path(original_name).name
    # Keep only alphanumeric, dash, underscore, dot
    clean_name = re.sub(r"[^\w\-.]", "_", clean_name)
    if not clean_name:
        clean_name = "image"
    return clean_name


def generate_secure_file_id() -> str:
    """Generates an unguessable UUID for image tracking without exposing server paths."""
    return uuid.uuid4().hex
