import uuid
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services.budget_service import BudgetService
from app.schemas.budget import (
    BudgetCreate,
    BudgetRead,
    BudgetStatusResponse,
)
from app.schemas.common import ResponseEnvelope

router = APIRouter()


@router.get(
    "",
    response_model=ResponseEnvelope[List[BudgetRead]],
    summary="List budgets for a given month",
)
async def list_budgets(
    period_month: date = Query(
        default_factory=lambda: date.today().replace(day=1),
        description="Month for budgets (YYYY-MM-DD, day normalized to 1)",
    ),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    budgets = await BudgetService.get_budgets_for_month(session, period_month, user_id=current_user.id)
    return ResponseEnvelope(data=budgets)


@router.post(
    "",
    response_model=ResponseEnvelope[BudgetRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a budget goal",
)
async def upsert_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    budget = await BudgetService.upsert(session, payload, user_id=current_user.id)
    return ResponseEnvelope(data=budget)


@router.get(
    "/status",
    response_model=ResponseEnvelope[BudgetStatusResponse],
    summary="Get live budget status, remaining balances, and progress",
)
async def get_budget_status(
    period_month: date = Query(
        default_factory=lambda: date.today().replace(day=1),
        description="Month for budget status (YYYY-MM-DD, day normalized to 1)",
    ),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    status_data = await BudgetService.get_status(session, period_month, user_id=current_user.id)
    return ResponseEnvelope(data=status_data)


@router.delete(
    "/{budget_id}",
    response_model=ResponseEnvelope[dict],
    summary="Delete a budget goal",
)
async def delete_budget(
    budget_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
):
    deleted = await BudgetService.delete(session, budget_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    return ResponseEnvelope(data={"deleted": True})
