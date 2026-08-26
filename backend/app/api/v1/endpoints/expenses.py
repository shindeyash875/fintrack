import json
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.expense_service import ExpenseService
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseRead,
    ExpenseImportResult,
    ExpenseImportCsvPayload,
    ExpenseImportJsonPayload,
)
from app.schemas.common import ResponseEnvelope

router = APIRouter()


@router.get(
    "",
    response_model=ResponseEnvelope[List[ExpenseRead]],
    summary="List paginated expenses with search, filter, and sort",
)
async def list_expenses(
    search: Optional[str] = Query(None, description="Search term in title or notes"),
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    category_id: Optional[uuid.UUID] = Query(None, description="Filter by category ID"),
    amount_min: Optional[Decimal] = Query(None, ge=0, description="Minimum amount"),
    amount_max: Optional[Decimal] = Query(None, ge=0, description="Maximum amount"),
    payment_mode: Optional[str] = Query(None, description="Payment mode (cash, card, upi)"),
    sort_by: str = Query("expense_date", description="Sort column (expense_date, amount, title)"),
    sort_dir: str = Query("desc", description="Sort direction (asc, desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    session: AsyncSession = Depends(get_db),
):
    items, meta = await ExpenseService.get_paginated(
        session=session,
        search=search,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        amount_min=amount_min,
        amount_max=amount_max,
        payment_mode=payment_mode,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )
    return ResponseEnvelope(data=items, meta=meta)


@router.post(
    "",
    response_model=ResponseEnvelope[ExpenseRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create an expense",
)
async def create_expense(
    payload: ExpenseCreate,
    session: AsyncSession = Depends(get_db),
):
    try:
        expense = await ExpenseService.create(session, payload)
        return ResponseEnvelope(data=expense)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create expense: {str(exc)}",
        )


@router.get(
    "/export/csv",
    summary="Export expenses matching active filters as CSV (FR-29)",
)
async def export_expenses_csv(
    search: Optional[str] = Query(None, description="Search term"),
    date_from: Optional[date] = Query(None, description="Start date"),
    date_to: Optional[date] = Query(None, description="End date"),
    category_id: Optional[uuid.UUID] = Query(None, description="Filter by category"),
    amount_min: Optional[Decimal] = Query(None, ge=0, description="Min amount"),
    amount_max: Optional[Decimal] = Query(None, ge=0, description="Max amount"),
    payment_mode: Optional[str] = Query(None, description="Payment mode"),
    sort_by: str = Query("expense_date"),
    sort_dir: str = Query("desc"),
    session: AsyncSession = Depends(get_db),
):
    expenses = await ExpenseService.get_all_filtered(
        session=session,
        search=search,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        amount_min=amount_min,
        amount_max=amount_max,
        payment_mode=payment_mode,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    csv_content = ExpenseService.generate_csv(expenses)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"fintrack_expenses_{timestamp}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get(
    "/export/json",
    summary="Export expenses matching active filters as JSON (FR-29)",
)
async def export_expenses_json(
    search: Optional[str] = Query(None, description="Search term"),
    date_from: Optional[date] = Query(None, description="Start date"),
    date_to: Optional[date] = Query(None, description="End date"),
    category_id: Optional[uuid.UUID] = Query(None, description="Filter by category"),
    amount_min: Optional[Decimal] = Query(None, ge=0, description="Min amount"),
    amount_max: Optional[Decimal] = Query(None, ge=0, description="Max amount"),
    payment_mode: Optional[str] = Query(None, description="Payment mode"),
    sort_by: str = Query("expense_date"),
    sort_dir: str = Query("desc"),
    session: AsyncSession = Depends(get_db),
):
    expenses = await ExpenseService.get_all_filtered(
        session=session,
        search=search,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        amount_min=amount_min,
        amount_max=amount_max,
        payment_mode=payment_mode,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    data = [exp.model_dump(mode="json") for exp in expenses]
    json_content = json.dumps(data, indent=2)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"fintrack_expenses_{timestamp}.json"
    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post(
    "/import/csv",
    response_model=ResponseEnvelope[ExpenseImportResult],
    summary="Import expenses from CSV with validation and duplicate detection",
)
async def import_expenses_csv(
    payload: ExpenseImportCsvPayload,
    session: AsyncSession = Depends(get_db),
):
    result = await ExpenseService.import_from_csv(session, payload.csv_content)
    return ResponseEnvelope(data=result)


@router.post(
    "/import/json",
    response_model=ResponseEnvelope[ExpenseImportResult],
    summary="Import expenses from JSON with validation and duplicate detection",
)
async def import_expenses_json(
    payload: ExpenseImportJsonPayload,
    session: AsyncSession = Depends(get_db),
):
    result = await ExpenseService.import_from_json(session, payload.items)
    return ResponseEnvelope(data=result)


@router.get(
    "/{expense_id}",
    response_model=ResponseEnvelope[ExpenseRead],
    summary="Retrieve a single expense",
)
async def get_expense(
    expense_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
):
    expense = await ExpenseService.get_by_id(session, expense_id)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return ResponseEnvelope(data=expense)


@router.put(
    "/{expense_id}",
    response_model=ResponseEnvelope[ExpenseRead],
    summary="Update an expense",
)
async def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    session: AsyncSession = Depends(get_db),
):
    updated = await ExpenseService.update(session, expense_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return ResponseEnvelope(data=updated)


@router.delete(
    "/{expense_id}",
    response_model=ResponseEnvelope[dict],
    summary="Delete an expense",
)
async def delete_expense(
    expense_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
):
    deleted = await ExpenseService.delete(session, expense_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return ResponseEnvelope(data={"deleted": True, "id": str(expense_id)})
