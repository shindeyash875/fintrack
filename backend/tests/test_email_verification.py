import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.models.email_verification import EmailVerificationToken
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.email_service import EmailService


@pytest.mark.asyncio
async def test_email_verification_flow(client: AsyncClient):
    unique_email = f"verify_{uuid.uuid4().hex[:8]}@fintrack.app"
    payload = {
        "email": unique_email,
        "password": "VerifyPassword123!",
        "full_name": "Verification User",
    }

    # 1. Register user
    reg_res = await client.post("/api/v1/auth/register", json=payload)
    assert reg_res.status_code == 201
    user_data = reg_res.json()["data"]["user"]
    assert user_data["is_verified"] is False

    # 2. Check token exists in database & create a known verification token
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        user_res = await session.execute(select(User).where(User.email == unique_email.lower()))
        user = user_res.scalar_one()

        token_res = await session.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id,
                EmailVerificationToken.used_at.is_(None),
            )
        )
        token_record = token_res.scalar_one_or_none()
        assert token_record is not None

        # Create a fresh token to test verification endpoint with raw token string
        raw_token = await AuthService.create_email_verification(session, user.id)
        await session.commit()

    # 3. Attempt verification with an invalid token
    bad_res = await client.post("/api/v1/auth/verify-email", json={"token": "invalid_fake_token_1234567890"})
    assert bad_res.status_code == 400
    assert "Invalid or expired" in bad_res.json()["error"]["message"]

    # 4. Verify with correct token
    verify_res = await client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert verify_res.status_code == 200
    assert verify_res.json()["data"]["is_verified"] is True

    # 5. Check database state
    async with session_factory() as session:
        user_res = await session.execute(select(User).where(User.id == user.id))
        user_updated = user_res.scalar_one()
        assert user_updated.is_verified is True

    # 6. Reusing same token fails
    reuse_res = await client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert reuse_res.status_code == 400

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_resend_verification_endpoint(client: AsyncClient):
    unique_email = f"resend_{uuid.uuid4().hex[:8]}@fintrack.app"
    payload = {
        "email": unique_email,
        "password": "VerifyPassword123!",
        "full_name": "Resend Test User",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # Resend verification
    resend_res = await client.post("/api/v1/auth/resend-verification", json={"email": unique_email})
    assert resend_res.status_code == 200
    assert resend_res.json()["data"]["email_sent"] is True


@pytest.mark.asyncio
async def test_send_verification_email_dry_run():
    # If SMTP is unconfigured or dummy in test mode, send_verification_email handles it safely without crashing
    result = await EmailService.send_verification_email(
        to_email="test@example.com",
        verification_token="mock_token_abc123",
        user_name="Test User",
    )
    assert isinstance(result, bool)
