import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_secure_random_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.seed import STARTER_CATEGORIES
from app.models.category import Category
from app.models.password_reset import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
)

logger = logging.getLogger("fintrack.auth")


class AuthService:
    @staticmethod
    async def seed_user_categories(session: AsyncSession, user_id: uuid.UUID) -> None:
        """
        Seeds the 8 standard starter categories isolated specifically to the given user_id.
        """
        for cat_name in STARTER_CATEGORIES:
            res = await session.execute(
                select(Category).where(
                    Category.user_id == user_id,
                    Category.name == cat_name,
                )
            )
            if not res.scalar_one_or_none():
                session.add(Category(user_id=user_id, name=cat_name))
        await session.flush()

    @classmethod
    async def register_user(
        cls,
        session: AsyncSession,
        payload: RegisterRequest,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        """
        Registers a new user with email and password, seeds their starter categories,
        and creates an authenticated session.
        """
        email_clean = payload.email.strip().lower()

        # Check existing user
        res = await session.execute(select(User).where(User.email == email_clean))
        existing_user = res.scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        hashed_pw = hash_password(payload.password)
        new_user = User(
            email=email_clean,
            hashed_password=hashed_pw,
            full_name=payload.full_name.strip() if payload.full_name else None,
            is_active=True,
            is_verified=False,
        )
        session.add(new_user)
        await session.flush()

        # Seed standard categories for new user
        await cls.seed_user_categories(session, new_user.id)

        # Issue tokens
        access_token, raw_refresh_token = await cls.create_user_session(
            session=session,
            user=new_user,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        await session.commit()
        await session.refresh(new_user)
        return new_user, access_token, raw_refresh_token

    @classmethod
    async def authenticate_user(
        cls,
        session: AsyncSession,
        payload: LoginRequest,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        """
        Authenticates an existing user with email and password.
        """
        email_clean = payload.email.strip().lower()
        res = await session.execute(select(User).where(User.email == email_clean))
        user = res.scalar_one_or_none()

        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been disabled. Please contact support.",
            )

        access_token, raw_refresh_token = await cls.create_user_session(
            session=session,
            user=user,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        await session.commit()
        return user, access_token, raw_refresh_token

    @classmethod
    async def authenticate_google(
        cls,
        session: AsyncSession,
        credential: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        """
        Verifies Google OAuth 2.0 / OpenID Connect ID token and authenticates or creates the user.
        """
        try:
            # Verify ID token with Google's public certificates
            req = google_requests.Request()
            id_info = google_id_token.verify_oauth2_token(
                credential,
                req,
                settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None,
            )
        except Exception as exc:
            logger.warning(f"Google ID token verification failed: {exc}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Google authentication token.",
            )

        google_sub = id_info.get("sub")
        email = id_info.get("email", "").strip().lower()
        name = id_info.get("name")
        email_verified = id_info.get("email_verified", False)

        if not email or not google_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token did not contain a valid email or user identity.",
            )

        # Look up by google_id first
        res = await session.execute(select(User).where(User.google_id == google_sub))
        user = res.scalar_one_or_none()

        if not user:
            # Look up by email
            res = await session.execute(select(User).where(User.email == email))
            user = res.scalar_one_or_none()

            if user:
                # Link existing email account to Google ID
                user.google_id = google_sub
                if email_verified:
                    user.is_verified = True
                if not user.full_name and name:
                    user.full_name = name
            else:
                # Create brand new user
                user = User(
                    email=email,
                    google_id=google_sub,
                    full_name=name,
                    is_active=True,
                    is_verified=bool(email_verified),
                    hashed_password=None,
                )
                session.add(user)
                await session.flush()
                await cls.seed_user_categories(session, user.id)

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been disabled.",
            )

        access_token, raw_refresh_token = await cls.create_user_session(
            session=session,
            user=user,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        await session.commit()
        await session.refresh(user)
        return user, access_token, raw_refresh_token

    @classmethod
    async def create_user_session(
        cls,
        session: AsyncSession,
        user: User,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Issues an Access Token (in memory) and a long-lived Refresh Token (hashed in DB).
        """
        access_token = create_access_token(user_id=str(user.id), email=user.email)
        raw_refresh_token = generate_secure_random_token(48)
        token_hashed = hash_token(raw_refresh_token)

        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=token_hashed,
            expires_at=expires_at,
            user_agent=user_agent[:255] if user_agent else None,
            ip_address=ip_address[:45] if ip_address else None,
        )
        session.add(refresh_record)
        await session.flush()

        return access_token, raw_refresh_token

    @classmethod
    async def rotate_refresh_token(
        cls,
        session: AsyncSession,
        raw_refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        """
        Rotates an existing refresh token: revokes old token and issues new access + refresh token pair.
        """
        token_hashed = hash_token(raw_refresh_token)
        res = await session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hashed)
        )
        token_record = res.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if not token_record or token_record.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked refresh token. Please sign in again.",
            )

        if token_record.expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please sign in again.",
            )

        # Revoke the old token (token rotation)
        token_record.revoked_at = now

        # Fetch user
        user_res = await session.execute(select(User).where(User.id == token_record.user_id))
        user = user_res.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is invalid or deactivated.",
            )

        # Issue brand new pair
        new_access_token, new_raw_refresh_token = await cls.create_user_session(
            session=session,
            user=user,
            user_agent=user_agent or token_record.user_agent,
            ip_address=ip_address or token_record.ip_address,
        )

        await session.commit()
        return user, new_access_token, new_raw_refresh_token

    @classmethod
    async def revoke_refresh_token(
        cls,
        session: AsyncSession,
        raw_refresh_token: str,
    ) -> None:
        """
        Revokes a single refresh token upon logout.
        """
        token_hashed = hash_token(raw_refresh_token)
        now = datetime.now(timezone.utc)
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hashed, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await session.commit()

    @classmethod
    async def revoke_all_user_sessions(
        cls,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> None:
        """
        Revokes all active refresh tokens for a user (Logout from all devices).
        """
        now = datetime.now(timezone.utc)
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await session.commit()

    @classmethod
    async def create_password_reset(
        cls,
        session: AsyncSession,
        email: str,
    ) -> Optional[str]:
        """
        Generates a secure password reset token for the given email.
        """
        email_clean = email.strip().lower()
        res = await session.execute(select(User).where(User.email == email_clean))
        user = res.scalar_one_or_none()

        if not user:
            return None  # Shield against user enumeration

        raw_reset_token = generate_secure_random_token(32)
        token_hashed = hash_token(raw_reset_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hashed,
            expires_at=expires_at,
        )
        session.add(reset_record)
        await session.commit()
        return raw_reset_token

    @classmethod
    async def reset_password(
        cls,
        session: AsyncSession,
        payload: ResetPasswordRequest,
    ) -> User:
        """
        Validates reset token and sets new password, revoking all active sessions for security.
        """
        token_hashed = hash_token(payload.token.strip())
        res = await session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hashed)
        )
        reset_record = res.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if not reset_record or reset_record.used_at is not None or reset_record.expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset link. Please request a new one.",
            )

        # Mark token used
        reset_record.used_at = now

        # Update user password
        user_res = await session.execute(select(User).where(User.id == reset_record.user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        user.hashed_password = hash_password(payload.new_password)

        # Invalidate all existing sessions
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )

        await session.commit()
        return user

    @classmethod
    async def change_password(
        cls,
        session: AsyncSession,
        user: User,
        payload: ChangePasswordRequest,
    ) -> User:
        """
        Allows an authenticated user to change their password.
        """
        if user.hashed_password:
            if not verify_password(payload.current_password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect.",
                )

        user.hashed_password = hash_password(payload.new_password)
        now = datetime.now(timezone.utc)

        # Invalidate all active sessions for this user except current (or all)
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )

        await session.commit()
        return user

    @classmethod
    async def list_user_sessions(
        cls,
        session: AsyncSession,
        user_id: uuid.UUID,
        current_raw_token: Optional[str] = None,
    ) -> List[RefreshToken]:
        """
        Lists active refresh sessions for the user.
        """
        now = datetime.now(timezone.utc)
        res = await session.execute(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .order_by(RefreshToken.created_at.desc())
        )
        return list(res.scalars().all())
