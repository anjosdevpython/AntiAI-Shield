from io import BytesIO
from PIL import Image


def strip_exif(image: Image.Image) -> Image.Image:
    """
    Strips all EXIF metadata (GPS location, camera make/model, timestamps, software info)
    by creating a clean in-memory pixel copy with zero metadata attributes.
    """
    # Create fresh image with clean mode and size, copying pixel data cleanly
    clean_image = Image.new(image.mode, image.size)
    clean_image.paste(image)
    # Ensure all metadata dictionaries are completely wiped
    clean_image.info.clear()
    return clean_image


def save_image_stripped(image: Image.Image, output_format: str = "PNG", quality: int = 95) -> bytes:
    """
    Saves an image into bytes cleanly, guaranteeing zero EXIF or ICC privacy leaks.
    """
    buf = BytesIO()
    clean = strip_exif(image)

    # Format specific options
    save_format = output_format.upper()
    if save_format in ["JPG", "JPEG"]:
        save_format = "JPEG"
        if clean.mode in ("RGBA", "P"):
            clean = clean.convert("RGB")
        clean.save(buf, format=save_format, quality=quality, optimize=True)
    elif save_format == "WEBP":
        clean.save(buf, format="WEBP", quality=quality, method=6)
    else:
        # Default to lossless PNG
        clean.save(buf, format="PNG", optimize=True)

    return buf.getvalue()
