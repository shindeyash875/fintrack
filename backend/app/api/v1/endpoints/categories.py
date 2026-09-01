import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services.category_service import CategoryService
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryRead
from app.schemas.common import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "",
    response_model=ResponseEnvelope[List[CategoryRead]],
    summary="List all categories with expense counts",
)
async def list_categories(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    categories = await CategoryService.get_all_with_counts(session, user_id=current_user.id)
    return ResponseEnvelope(data=categories)


@router.post(
    "",
    response_model=ResponseEnvelope[CategoryRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new category",
)
async def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    try:
        category = await CategoryService.create(session, payload, user_id=current_user.id)
        return ResponseEnvelope(
            data=CategoryRead(
                id=category.id,
                name=category.name,
                created_at=category.created_at,
                updated_at=category.updated_at,
                expense_count=0,
            )
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unexpected error creating category: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category. Please try again.",
        )


@router.put(
    "/{category_id}",
    response_model=ResponseEnvelope[CategoryRead],
    summary="Rename an existing category",
)
async def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    category = await CategoryService.get_by_id(session, category_id, user_id=current_user.id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    try:
        updated = await CategoryService.update(session, category, payload, user_id=current_user.id)
        return ResponseEnvelope(
            data=CategoryRead(
                id=updated.id,
                name=updated.name,
                created_at=updated.created_at,
                updated_at=updated.updated_at,
            )
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unexpected error updating category: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category. Please try again.",
        )


@router.delete(
    "/{category_id}",
    response_model=ResponseEnvelope[dict],
    summary="Delete a category",
)
async def delete_category(
    category_id: uuid.UUID,
    reassign_to: Optional[uuid.UUID] = Query(None, description="Category to reassign linked expenses to"),
    cascade: bool = Query(False, description="Whether to cascade delete linked expenses"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    category = await CategoryService.get_by_id(session, category_id, user_id=current_user.id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    success, err = await CategoryService.delete(
        session, category, user_id=current_user.id, reassign_to=reassign_to, cascade=cascade
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=err or "Category cannot be deleted because it is in use",
        )
    return ResponseEnvelope(data={"deleted": True, "id": str(category_id)})
