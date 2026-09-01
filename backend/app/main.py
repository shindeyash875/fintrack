import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import limiter
from app.core.config import settings
from app.db.session import async_session_factory, engine
from app.db.seed import seed_starter_categories
from app.api.v1.router import api_v1_router

logger = logging.getLogger("fintrack")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Optionally seed starter categories if configured
    if settings.SEED_STARTER_CATEGORIES:
        try:
            await seed_starter_categories()
        except Exception as exc:
            print(f"[Startup Warning] Could not run category seed: {exc}")
    yield
    # Shutdown: Dispose engine connection pool
    await engine.dispose()


app = FastAPI(
    title="FinTrack API",
    description="Backend REST API for FinTrack Personal Expense Tracker",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)
app.state.limiter = limiter

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(api_v1_router)


# Root health endpoint for platform probes (Render /health)
@app.get(
    "/health",
    summary="Platform health check",
    tags=["Health"],
)
async def root_health():
    db_status = "connected"
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    payload = {
        "status": "ok" if db_status == "connected" else "error",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }

    if db_status != "connected":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload,
        )

    return payload


# Rate Limit Exception Handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "success": False,
            "error": {
                "code": "TOO_MANY_REQUESTS",
                "message": "Too many requests. Please slow down and try again later.",
                "field": None,
            },
        },
    )


# Standardized Validation Error Handler (SRS Section 3.1 & 3.4)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {}
    loc = first_error.get("loc", [])
    field_name = str(loc[-1]) if loc else None
    msg = first_error.get("msg", "Validation error")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": msg,
                "field": field_name,
            },
        },
    )


# Standardized HTTP Exception Handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_SERVER_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code_map.get(exc.status_code, "ERROR"),
                "message": str(exc.detail),
                "field": None,
            },
        },
    )


# Standardized Database Integrity Error Handler (Shield internal DB errors)
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.error("Database integrity error: %s", exc)
    err_str = str(exc).lower()
    if "uq_categories_user_name" in err_str or "category" in err_str:
        msg = "Category already exists."
    elif "users_email_key" in err_str or "email" in err_str:
        msg = "An account with this email address already exists."
    elif "unique" in err_str or "duplicate" in err_str:
        msg = "A record with this value already exists."
    else:
        msg = "A database constraint conflict occurred."

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": msg,
                "field": None,
            },
        },
    )


# Standardized Unhandled Exception Handler (SRS Section 3.1 & 3.4)
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred.",
                "field": None,
            },
        },
    )
