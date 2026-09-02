import re
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="Account password (min 8 characters)")
    full_name: Optional[str] = Field(None, max_length=100, description="Full display name")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = Field(None, description="Google OAuth 2.0 / OpenID Connect ID Token")
    id_token: Optional[str] = Field(None, description="Alias for Google ID Token")

    @model_validator(mode="after")
    def ensure_token(self) -> "GoogleAuthRequest":
        token = self.credential or self.id_token
        if not token:
            raise ValueError("Google ID token is required")
        if not self.credential:
            self.credential = token
        return self


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    is_verified: bool
    has_password: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Token validity in seconds")
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered account email")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, description="Password reset verification token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long")
        return v


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100, description="Updated display name")


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10, description="Email verification token")


class ResendVerificationRequest(BaseModel):
    email: Optional[EmailStr] = Field(None, description="Registered account email (optional if authenticated)")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str) and v.strip():
            return v.strip().lower()
        return v



class SessionResponse(BaseModel):
    id: uuid.UUID
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}
