import logging
from typing import Set
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db, limiter
from app.models.user import User
from app.schemas.ai import ParseExpenseRequest, ParsedExpenseData, ScannedReceiptData
from app.schemas.common import ApiResponse
from app.services.ai.base import AIConfigurationError, AIProviderError
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_MIME_TYPES: Set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/jpg",
    "application/octet-stream",  # Fallback for some mobile camera uploads
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/scan-receipt",
    response_model=ApiResponse[ScannedReceiptData],
    summary="Scan receipt, bill, or UPI payment screenshot using Vision AI",
)
@limiter.limit("15/minute")
async def scan_receipt(
    request: Request,
    file: UploadFile = File(..., description="Receipt, bill, or payment screenshot image"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Extracts transaction title, total amount (INR), date, payment mode, and category
    from an uploaded image using Vision AI (Google Gemini / OpenAI / Claude).
    """
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{content_type}'. Please upload a JPEG, PNG, or WEBP image.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    try:
        scanned_data = await AIService.scan_receipt(
            session=session,
            user_id=current_user.id,
            image_bytes=image_bytes,
            mime_type=content_type if content_type != "application/octet-stream" else "image/jpeg",
        )
        return ApiResponse(success=True, data=scanned_data)

    except AIConfigurationError as exc:
        logger.warning(f"[AI Config Error] {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except AIProviderError as exc:
        logger.error(f"[AI Provider Error] {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Vision service could not process image: {exc}",
        )
    except Exception as exc:
        logger.error(f"[AI Scan Error] Unexpected exception: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to scan receipt image due to an internal error.",
        )


@router.post(
    "/parse-expense",
    response_model=ApiResponse[ParsedExpenseData],
    summary="Parse natural language or voice expense text using AI",
)
@limiter.limit("20/minute")
async def parse_expense(
    request: Request,
    payload: ParseExpenseRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Parses unstructured text (e.g. 'Spent 350 on Uber to office via UPI today')
    into clean structured financial data (amount, category, payment mode, date).
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense text cannot be empty.",
        )

    try:
        parsed_data = await AIService.parse_natural_language_expense(
            session=session,
            user_id=current_user.id,
            text=payload.text.strip(),
        )
        return ApiResponse(success=True, data=parsed_data)

    except AIConfigurationError as exc:
        logger.warning(f"[AI Config Error] {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except AIProviderError as exc:
        logger.error(f"[AI Provider Error] {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI parsing service error: {exc}",
        )
    except Exception as exc:
        logger.error(f"[AI Parse Error] Unexpected exception: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse expense text due to an internal error.",
        )

