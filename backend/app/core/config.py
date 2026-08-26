from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/fintrack",
        description="Async PostgreSQL connection string (Supabase pooled or local)",
    )
    DIRECT_URL: str = Field(
        default="",
        description="Direct PostgreSQL connection string for Alembic migrations",
    )

    # Supabase (reserved for Phase 2+)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://fintrack.vercel.app"

    # Seed
    SEED_STARTER_CATEGORIES: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
