from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    DashboardSummary,
    CategoryChartItem,
    TimeSeriesChartItem,
    MonthComparison,
)
from app.schemas.common import ResponseEnvelope

router = APIRouter()


@router.get(
    "/summary",
    response_model=ResponseEnvelope[DashboardSummary],
    summary="Retrieve overall dashboard summary and metric cards",
)
async def get_dashboard_summary(session: AsyncSession = Depends(get_db)):
    summary = await DashboardService.get_summary(session)
    return ResponseEnvelope(data=summary)


@router.get(
    "/charts/by-category",
    response_model=ResponseEnvelope[List[CategoryChartItem]],
    summary="Spending breakdown by category for pie/donut chart",
)
async def get_spend_by_category(
    date_from: Optional[date] = Query(None, description="Start date"),
    date_to: Optional[date] = Query(None, description="End date"),
    session: AsyncSession = Depends(get_db),
):
    items = await DashboardService.get_charts_by_category(session, date_from, date_to)
    return ResponseEnvelope(data=items)


@router.get(
    "/charts/over-time",
    response_model=ResponseEnvelope[List[TimeSeriesChartItem]],
    summary="Spending over time for bar/line chart",
)
async def get_spend_over_time(
    granularity: str = Query("daily", description="Granularity: daily, weekly, monthly"),
    date_from: Optional[date] = Query(None, description="Start date"),
    date_to: Optional[date] = Query(None, description="End date"),
    session: AsyncSession = Depends(get_db),
):
    items = await DashboardService.get_charts_over_time(
        session, granularity=granularity, date_from=date_from, date_to=date_to
    )
    return ResponseEnvelope(data=items)


@router.get(
    "/compare",
    response_model=ResponseEnvelope[MonthComparison],
    summary="Month-over-month spending comparison and percentage change",
)
async def get_month_comparison(session: AsyncSession = Depends(get_db)):
    compare_data = await DashboardService.get_compare(session)
    return ResponseEnvelope(data=compare_data)
