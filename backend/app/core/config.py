from typing import List, Optional
from urllib.parse import quote_plus
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_VERSION: str = "1.0.0"

    # Database connection parameters
    DB_HOST: str = Field(default="localhost", description="PostgreSQL host")
    DB_PORT: int = Field(default=5432, description="PostgreSQL port")
    DB_NAME: str = Field(default="fintrack", description="PostgreSQL database name")
    DB_USER: str = Field(default="postgres", description="PostgreSQL username")
    DB_PASSWORD: str = Field(default="postgres", description="PostgreSQL password")

    # Complete database connection string (auto-assembled from DB_* parameters if not provided)
    DATABASE_URL: Optional[str] = Field(
        default=None,
        description="Async PostgreSQL connection string (auto-constructed from DB_* params if omitted)",
    )

    TEST_DB_NAME: str = Field(default="fintrack_test", description="PostgreSQL test database name")

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://fintrack.vercel.app"
    CORS_ORIGIN_REGEX: Optional[str] = Field(
        default=r"^https:\/\/(.*\.)?vercel\.app$",
        description="Regex pattern for allowed origins (matches all Vercel production and preview deployments)",
    )

    # Seed
    SEED_STARTER_CATEGORIES: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def test_database_url(self) -> str:
        encoded_password = quote_plus(self.DB_PASSWORD) if self.DB_PASSWORD else ""
        auth = f"{self.DB_USER}:{encoded_password}" if self.DB_PASSWORD else self.DB_USER
        return f"postgresql+asyncpg://{auth}@{self.DB_HOST}:{self.DB_PORT}/{self.TEST_DB_NAME}"

    @model_validator(mode="after")
    def assemble_database_url(self) -> "Settings":
        if not self.DATABASE_URL:
            encoded_password = quote_plus(self.DB_PASSWORD) if self.DB_PASSWORD else ""
            auth = f"{self.DB_USER}:{encoded_password}" if self.DB_PASSWORD else self.DB_USER
            self.DATABASE_URL = f"postgresql+asyncpg://{auth}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
