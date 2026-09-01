from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user, limiter
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionResponse,
    TokenResponse,
    UserResponse,
    UserUpdateRequest,
)
from app.schemas.common import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()

REFRESH_COOKIE_NAME = "fintrack_refresh_token"


def set_refresh_cookie(response: Response, raw_refresh_token: str) -> None:
    """
    Sets the secure HttpOnly cookie for the long-lived refresh token.
    """
    max_age_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh_token,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE.lower(),
        path="/",
    )


def clear_refresh_cookie(response: Response) -> None:
    """
    Clears the HttpOnly refresh token cookie upon logout.
    """
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE.lower(),
        path="/",
    )


@router.post(
    "/register",
    response_model=ApiResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
@limiter.limit("10/minute")
async def register(
    request: Request,
    payload: RegisterRequest,
    response: Response,
    session: AsyncSession = Depends(get_db),
    user_agent: Optional[str] = Header(None),
):
    ip_addr = request.client.host if request.client else None
    user, access_token, raw_refresh = await AuthService.register_user(
        session=session,
        payload=payload,
        user_agent=user_agent,
        ip_address=ip_addr,
    )
    set_refresh_cookie(response, raw_refresh)

    token_data = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_verified=user.is_verified,
            has_password=bool(user.hashed_password),
            created_at=user.created_at,
        ),
    )
    return ApiResponse(
        data=token_data,
        message="Account created successfully.",
    )


@router.post(
    "/login",
    response_model=ApiResponse[TokenResponse],
    summary="Sign in with email and password",
)
@limiter.limit("15/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_db),
    user_agent: Optional[str] = Header(None),
):
    ip_addr = request.client.host if request.client else None
    user, access_token, raw_refresh = await AuthService.authenticate_user(
        session=session,
        payload=payload,
        user_agent=user_agent,
        ip_address=ip_addr,
    )
    set_refresh_cookie(response, raw_refresh)

    token_data = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_verified=user.is_verified,
            has_password=bool(user.hashed_password),
            created_at=user.created_at,
        ),
    )
    return ApiResponse(
        data=token_data,
        message="Signed in successfully.",
    )


@router.post(
    "/google",
    response_model=ApiResponse[TokenResponse],
    summary="Sign in with Google (OAuth 2.0 / OpenID Connect)",
)
@limiter.limit("15/minute")
async def google_auth(
    request: Request,
    payload: GoogleAuthRequest,
    response: Response,
    session: AsyncSession = Depends(get_db),
    user_agent: Optional[str] = Header(None),
):
    ip_addr = request.client.host if request.client else None
    user, access_token, raw_refresh = await AuthService.authenticate_google(
        session=session,
        credential=payload.credential,
        user_agent=user_agent,
        ip_address=ip_addr,
    )
    set_refresh_cookie(response, raw_refresh)

    token_data = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_verified=user.is_verified,
            has_password=bool(user.hashed_password),
            created_at=user.created_at,
        ),
    )
    return ApiResponse(
        data=token_data,
        message="Google sign-in successful.",
    )


@router.post(
    "/refresh",
    response_model=ApiResponse[TokenResponse],
    summary="Rotate refresh token and issue new access token",
)
@limiter.limit("30/minute")
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    fintrack_refresh_token: Optional[str] = Cookie(None),
    session: AsyncSession = Depends(get_db),
    user_agent: Optional[str] = Header(None),
):
    if not fintrack_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token cookie.",
        )

    ip_addr = request.client.host if request.client else None
    user, new_access_token, new_raw_refresh = await AuthService.rotate_refresh_token(
        session=session,
        raw_refresh_token=fintrack_refresh_token,
        user_agent=user_agent,
        ip_address=ip_addr,
    )
    set_refresh_cookie(response, new_raw_refresh)

    token_data = TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_verified=user.is_verified,
            has_password=bool(user.hashed_password),
            created_at=user.created_at,
        ),
    )
    return ApiResponse(
        data=token_data,
        message="Session refreshed successfully.",
    )


@router.post(
    "/logout",
    response_model=ApiResponse[dict],
    summary="Logout and revoke current refresh session",
)
async def logout(
    response: Response,
    fintrack_refresh_token: Optional[str] = Cookie(None),
    session: AsyncSession = Depends(get_db),
):
    if fintrack_refresh_token:
        await AuthService.revoke_refresh_token(session, fintrack_refresh_token)
    clear_refresh_cookie(response)
    return ApiResponse(
        data={"logged_out": True},
        message="Signed out successfully.",
    )


@router.post(
    "/logout-all",
    response_model=ApiResponse[dict],
    summary="Logout from all devices and revoke all active sessions",
)
async def logout_all_devices(
    response: Response,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    await AuthService.revoke_all_user_sessions(session, current_user.id)
    clear_refresh_cookie(response)
    return ApiResponse(
        data={"logged_out_all": True},
        message="Successfully signed out from all devices.",
    )


@router.post(
    "/forgot-password",
    response_model=ApiResponse[dict],
    summary="Request a secure password reset link",
)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_db),
):
    reset_token = await AuthService.create_password_reset(session, payload.email)
    # In a production setup, reset_token is sent via Email/SMTP.
    # In development/test mode, we return the reset_token safely in the response payload for testing.
    data = {"email_sent": True}
    if settings.DEBUG and reset_token:
        data["debug_reset_token"] = reset_token

    return ApiResponse(
        data=data,
        message="If an account with that email exists, password reset instructions have been generated.",
    )


@router.post(
    "/reset-password",
    response_model=ApiResponse[dict],
    summary="Reset password using a valid reset token",
)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db),
):
    await AuthService.reset_password(session, payload)
    return ApiResponse(
        data={"reset_success": True},
        message="Password has been reset successfully. Please sign in with your new password.",
    )


@router.post(
    "/change-password",
    response_model=ApiResponse[dict],
    summary="Change password for authenticated user",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    await AuthService.change_password(session, current_user, payload)
    return ApiResponse(
        data={"updated": True},
        message="Password updated successfully.",
    )


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
):
    return ApiResponse(
        data=UserResponse(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            is_verified=current_user.is_verified,
            has_password=bool(current_user.hashed_password),
            created_at=current_user.created_at,
        ),
        message="Profile retrieved.",
    )


@router.get(
    "/sessions",
    response_model=ApiResponse[List[SessionResponse]],
    summary="List active login sessions for current user",
)
async def get_sessions(
    current_user: User = Depends(get_current_active_user),
    fintrack_refresh_token: Optional[str] = Cookie(None),
    session: AsyncSession = Depends(get_db),
):
    records = await AuthService.list_user_sessions(session, current_user.id)
    current_hash = None
    if fintrack_refresh_token:
        from app.core.security import hash_token
        current_hash = hash_token(fintrack_refresh_token)

    results = []
    for r in records:
        results.append(
            SessionResponse(
                id=r.id,
                user_agent=r.user_agent,
                ip_address=r.ip_address,
                created_at=r.created_at,
                expires_at=r.expires_at,
                is_current=(r.token_hash == current_hash),
            )
        )
    return ApiResponse(
        data=results,
        message="Active sessions retrieved.",
    )
