import uuid
from datetime import date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.expense import ExpenseRead
from app.schemas.budget import BudgetStatusItem


class CategorySpendRank(BaseModel):
    category_id: uuid.UUID
    category_name: str
    total_amount: Decimal
    percentage: float


class DashboardSummary(BaseModel):
    total_spent_overall: Decimal
    total_spent_current_month: Decimal
    recent_expenses: List[ExpenseRead]
    top_categories: List[CategorySpendRank]
    overall_budget_status: Optional[BudgetStatusItem] = None
    average_daily_spend: Decimal
    average_weekly_spend: Decimal


class CategoryChartItem(BaseModel):
    category_id: uuid.UUID
    category_name: str
    amount: Decimal
    percentage: float


class TimeSeriesChartItem(BaseModel):
    label: str  # e.g., "2026-08-01", "Week 34", "2026-08"
    date_start: date
    amount: Decimal


class MonthComparison(BaseModel):
    current_month: date
    current_month_total: Decimal
    previous_month: date
    previous_month_total: Decimal
    percentage_change: float
    is_increase: bool
