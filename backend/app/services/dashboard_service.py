import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.category import Category
from app.models.expense import Expense
from app.services.budget_service import BudgetService
from app.services.expense_service import ExpenseService
from app.schemas.dashboard import (
    DashboardSummary,
    CategorySpendRank,
    CategoryChartItem,
    TimeSeriesChartItem,
    MonthComparison,
)


class DashboardService:
    @staticmethod
    async def get_summary(
        session: AsyncSession,
        user_id: uuid.UUID,
        today: Optional[date] = None,
    ) -> DashboardSummary:
        if not today:
            today = date.today()

        first_of_current_month = today.replace(day=1)
        if first_of_current_month.month == 12:
            next_month = date(first_of_current_month.year + 1, 1, 1)
        else:
            next_month = date(first_of_current_month.year, first_of_current_month.month + 1, 1)

        # 1. Total spent overall for this user
        total_overall_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
            Expense.user_id == user_id
        )
        total_spent_overall = (await session.execute(total_overall_stmt)).scalar_one()

        # 2. Total spent current month for this user
        total_current_month_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
            and_(
                Expense.user_id == user_id,
                Expense.expense_date >= first_of_current_month,
                Expense.expense_date < next_month,
            )
        )
        total_spent_current_month = (await session.execute(total_current_month_stmt)).scalar_one()

        # 3. Recent expenses (last 5) for this user
        recent_expenses, _ = await ExpenseService.get_paginated(
            session=session,
            user_id=user_id,
            page=1,
            page_size=5,
        )

        # 4. Top categories by spend in current month for this user
        top_cats_stmt = (
            select(
                Category.id,
                Category.name,
                func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("cat_total"),
            )
            .join(
                Expense,
                and_(
                    Expense.category_id == Category.id,
                    Expense.user_id == user_id,
                )
            )
            .where(
                and_(
                    Category.user_id == user_id,
                    Expense.expense_date >= first_of_current_month,
                    Expense.expense_date < next_month,
                )
            )
            .group_by(Category.id, Category.name)
            .order_by(func.sum(Expense.amount).desc())
            .limit(5)
        )
        top_rows = (await session.execute(top_cats_stmt)).all()
        top_categories = []
        for cat_id, cat_name, cat_total in top_rows:
            pct = (
                float((cat_total / total_spent_current_month) * 100)
                if total_spent_current_month > 0
                else 0.0
            )
            top_categories.append(
                CategorySpendRank(
                    category_id=cat_id,
                    category_name=cat_name,
                    total_amount=cat_total,
                    percentage=round(pct, 1),
                )
            )

        # 5. Overall budget status for this user
        budget_status = await BudgetService.get_status(session, first_of_current_month, user_id=user_id)
        overall_budget_status = budget_status.overall

        # 6. Average daily and weekly spend for the month so far
        days_in_month_so_far = max(today.day, 1)
        avg_daily = round(total_spent_current_month / Decimal(days_in_month_so_far), 2)
        avg_weekly = round(avg_daily * Decimal("7"), 2)

        return DashboardSummary(
            total_spent_overall=total_spent_overall,
            total_spent_current_month=total_spent_current_month,
            recent_expenses=recent_expenses,
            top_categories=top_categories,
            overall_budget_status=overall_budget_status,
            average_daily_spend=avg_daily,
            average_weekly_spend=avg_weekly,
        )

    @staticmethod
    async def get_charts_by_category(
        session: AsyncSession,
        user_id: uuid.UUID,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[CategoryChartItem]:
        query = (
            select(
                Category.id,
                Category.name,
                func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("cat_total"),
            )
            .join(
                Expense,
                and_(
                    Expense.category_id == Category.id,
                    Expense.user_id == user_id,
                )
            )
            .where(Category.user_id == user_id)
        )
        if date_from:
            query = query.where(Expense.expense_date >= date_from)
        if date_to:
            query = query.where(Expense.expense_date <= date_to)

        query = query.group_by(Category.id, Category.name).order_by(func.sum(Expense.amount).desc())
        rows = (await session.execute(query)).all()

        total = sum((r[2] for r in rows), Decimal("0.00"))
        items = []
        for cat_id, cat_name, cat_total in rows:
            pct = float((cat_total / total) * 100) if total > 0 else 0.0
            items.append(
                CategoryChartItem(
                    category_id=cat_id,
                    category_name=cat_name,
                    amount=cat_total,
                    percentage=round(pct, 1),
                )
            )
        return items

    @staticmethod
    async def get_charts_over_time(
        session: AsyncSession,
        user_id: uuid.UUID,
        granularity: str = "daily",
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[TimeSeriesChartItem]:
        today = date.today()
        if not date_to:
            date_to = today

        if granularity == "monthly":
            trunc_field = cast(func.date_trunc("month", Expense.expense_date), Date)
            if not date_from:
                date_from = (date_to.replace(day=1) - timedelta(days=180)).replace(day=1)
        elif granularity == "weekly":
            trunc_field = cast(func.date_trunc("week", Expense.expense_date), Date)
            if not date_from:
                date_from = date_to - timedelta(weeks=12)
        else:
            trunc_field = Expense.expense_date
            if not date_from:
                date_from = date_to - timedelta(days=30)

        query = (
            select(
                trunc_field.label("period"),
                func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("period_total"),
            )
            .where(
                and_(
                    Expense.user_id == user_id,
                    Expense.expense_date >= date_from,
                    Expense.expense_date <= date_to,
                )
            )
            .group_by(trunc_field)
            .order_by(trunc_field.asc())
        )
        rows = (await session.execute(query)).all()

        items = []
        for r in rows:
            period_date = r[0]
            if granularity == "monthly":
                label = period_date.strftime("%b %Y")
            elif granularity == "weekly":
                label = f"Wk of {period_date.strftime('%b %d')}"
            else:
                label = period_date.strftime("%b %d")

            items.append(
                TimeSeriesChartItem(
                    label=label,
                    date_start=period_date,
                    amount=r[1],
                )
            )
        return items

    @staticmethod
    async def get_compare(
        session: AsyncSession,
        user_id: uuid.UUID,
        today: Optional[date] = None,
    ) -> MonthComparison:
        if not today:
            today = date.today()

        current_month_start = today.replace(day=1)
        if current_month_start.month == 1:
            prev_month_start = date(current_month_start.year - 1, 12, 1)
        else:
            prev_month_start = date(current_month_start.year, current_month_start.month - 1, 1)

        if current_month_start.month == 12:
            current_month_end = date(current_month_start.year + 1, 1, 1)
        else:
            current_month_end = date(current_month_start.year, current_month_start.month + 1, 1)

        # Current month total for this user
        current_total_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
            and_(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start,
                Expense.expense_date < current_month_end,
            )
        )
        current_total = (await session.execute(current_total_stmt)).scalar_one()

        # Prev month total for this user
        prev_total_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
            and_(
                Expense.user_id == user_id,
                Expense.expense_date >= prev_month_start,
                Expense.expense_date < current_month_start,
            )
        )
        prev_total = (await session.execute(prev_total_stmt)).scalar_one()

        if prev_total > 0:
            diff = current_total - prev_total
            pct_change = round(float((diff / prev_total) * 100), 2)
        else:
            pct_change = 100.0 if current_total > 0 else 0.0

        return MonthComparison(
            current_month=current_month_start,
            current_month_total=current_total,
            previous_month=prev_month_start,
            previous_month_total=prev_total,
            percentage_change=pct_change,
            is_increase=current_total >= prev_total,
        )
