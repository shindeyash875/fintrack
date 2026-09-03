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

    # JWT & Authentication
    JWT_SECRET_KEY: str = Field(
        default="fintrack-insecure-dev-secret-key-replace-in-production-1234567890",
        description="Secret key for signing Access JWTs",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, description="Access token expiration in minutes")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, description="Refresh token expiration in days")
    RESET_TOKEN_EXPIRE_MINUTES: int = Field(default=60, description="Password reset token expiration in minutes")
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = Field(default=24, description="Email verification token expiration in hours")

    # Google OAuth / OpenID Connect
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None, description="Google OAuth 2.0 Client ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None, description="Google OAuth 2.0 Client Secret")

    # Cookie Security
    COOKIE_SECURE: bool = Field(default=False, description="Enforce HTTPS Secure attribute on cookies")
    COOKIE_SAMESITE: str = Field(default="lax", description="SameSite attribute for cookies (lax, strict, none)")

    # Email & SMTP (Resend)
    SMTP_HOST: str = Field(default="smtp.resend.com", description="SMTP server host")
    SMTP_PORT: int = Field(default=587, description="SMTP server port (587 for STARTTLS, 465 for SSL)")
    SMTP_USER: str = Field(default="resend", description="SMTP username (for Resend, always 'resend')")
    SMTP_PASSWORD: Optional[str] = Field(default=None, description="SMTP password / Resend API key (re_...)")
    SMTP_FROM_EMAIL: str = Field(default="onboarding@resend.dev", description="Sender email address")
    SMTP_FROM_NAME: str = Field(default="FinTrack", description="Sender display name")
    SMTP_STARTTLS: bool = Field(default=True, description="Use STARTTLS for SMTP connection")
    SMTP_SSL: bool = Field(default=False, description="Use SSL for SMTP connection (e.g. port 465)")

    # Frontend URL (for constructing password reset and verification links)
    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        description="Frontend base URL for generating password reset and verification links",
    )

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://fintrack.vercel.app"
    CORS_ORIGIN_REGEX: Optional[str] = Field(
        default=r"^(https?:\/\/((.*\.)?vercel\.app|(.*\.)?onrender\.com|(.*\.)?netlify\.app|localhost(:\d+)?|127\.0\.0\.1(:\d+)?|192\.168\.\d+\.\d+(:\d+)?|10\.\d+\.\d+\.\d+(:\d+)?|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?))$",
        description="Regex pattern for allowed origins (matches all Vercel, Render, Netlify, localhost, and local Wi-Fi LAN IP deployments)",
    )

    # Seed
    SEED_STARTER_CATEGORIES: bool = False

    # Universal AI Engine (Gemini / OpenAI / Claude)
    AI_PROVIDER: str = Field(default="gemini", description="Active AI provider: 'gemini' | 'openai' | 'claude'")
    AI_MODEL: Optional[str] = Field(default=None, description="Model identifier override (e.g. 'gemini-2.0-flash', 'gpt-4o-mini', 'claude-3-5-haiku-20241022')")
    AI_API_KEY: Optional[str] = Field(default=None, description="Universal API key for the active AI provider")
    GEMINI_API_KEY: Optional[str] = Field(default=None, description="Google Gemini API key fallback")
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API key fallback")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, description="Anthropic Claude API key fallback")

    @property
    def effective_ai_api_key(self) -> Optional[str]:
        if self.AI_API_KEY and self.AI_API_KEY.strip():
            return self.AI_API_KEY.strip()
        provider = self.AI_PROVIDER.lower().strip()
        if provider == "gemini":
            return self.GEMINI_API_KEY.strip() if self.GEMINI_API_KEY else None
        elif provider == "openai":
            return self.OPENAI_API_KEY.strip() if self.OPENAI_API_KEY else None
        elif provider == "claude":
            return self.ANTHROPIC_API_KEY.strip() if self.ANTHROPIC_API_KEY else None
        return None

    @property
    def effective_ai_model(self) -> str:
        if self.AI_MODEL and self.AI_MODEL.strip():
            return self.AI_MODEL.strip()
        provider = self.AI_PROVIDER.lower().strip()
        if provider == "gemini":
            return "gemini-3.6-flash"
        elif provider == "openai":
            return "gpt-4o-mini"
        elif provider == "claude":
            return "claude-3-5-haiku-20241022"
        return "gemini-3.6-flash"

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
