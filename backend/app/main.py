import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch

from app.api.endpoints import router as api_router
from app.config import settings
from app.services.protection_service import protection_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("antiai-shield")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing AntiAI Shield backend...")
    torch.set_num_threads(2)
    cuda_avail = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
    logger.info(f"Compute Device: {device_name} (CUDA Available: {cuda_avail})")
    logger.info(f"Max Upload Size: {settings.MAX_UPLOAD_MB} MB")
    logger.info(f"Delete After Processing: {settings.DELETE_AFTER_PROCESSING}")
    # Initial cleanup of any stale residual files
    protection_service.cleanup_stale_files(max_age_minutes=settings.FILE_RETENTION_MINUTES)
    yield
    # Shutdown
    logger.info("Shutting down AntiAI Shield backend...")


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    version=settings.APP_VERSION,
    description=(
        "API para proteção adversarial de imagens contra treinamento e fine-tuning de modelos generativos (DreamBooth/LoRA)."
    ),
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if "*" not in settings.CORS_ORIGINS else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:.*|http://127\.0\.0\.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    """Guards against excessive upload size before streaming into memory."""
    content_length = request.headers.get("content-length")
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if content_length and int(content_length) > max_bytes:
        return JSONResponse(
            status_code=413,
            content={
                "detail": f"A imagem excede o limite de {settings.MAX_UPLOAD_MB} MB."
            },
        )
    return await call_next(request)


# Include API router
app.include_router(api_router, prefix="/api")


@app.get("/", summary="Root index")
async def root():
    return {
        "name": settings.APP_NAME,
        "tagline": "Proteja suas imagens antes de publicá-las.",
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
        "health_url": "/api/health",
    }
