from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_db

router = APIRouter()


@router.get(
    "/health",
    summary="Deep health check",
    description="Validates application process liveness and active database round-trip (SELECT 1).",
)
async def health_check(session: AsyncSession = Depends(get_db)):
    db_status = "connected"
    try:
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
