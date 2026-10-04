from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment or defaults."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "AntiAI Shield"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"

    # Uploads & Processing
    MAX_UPLOAD_MB: int = 20
    DELETE_AFTER_PROCESSING: bool = True
    DEFAULT_PROTECTION_LEVEL: str = "balanced"  # balanced, strong, maximum
    DEVICE: str = "auto"  # auto, cuda, cpu

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://anti-ai-shield-jet.vercel.app",
        "https://antiai-shield-backend.onrender.com",
        "*",
    ]

    # File storage paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    UPLOADS_DIR: Path = BASE_DIR / "uploads"
    OUTPUTS_DIR: Path = BASE_DIR / "outputs"

    # Temporary file retention (in minutes) for background janitor
    FILE_RETENTION_MINUTES: int = 30

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()

# Ensure directories exist
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
