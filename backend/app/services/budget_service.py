import uuid
from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.schemas.budget import (
    BudgetCreate,
    BudgetRead,
    BudgetStatusItem,
    BudgetStatusResponse,
)


class BudgetService:
    @staticmethod
    async def get_budgets_for_month(
        session: AsyncSession,
        period_month: date,
        user_id: uuid.UUID,
    ) -> List[BudgetRead]:
        normalized = period_month.replace(day=1)
        query = (
            select(Budget, Category.name.label("category_name"))
            .outerjoin(
                Category,
                and_(
                    Category.id == Budget.category_id,
                    Category.user_id == user_id,
                )
            )
            .where(
                Budget.user_id == user_id,
                Budget.period_month == normalized,
            )
        )
        result = await session.execute(query)
        items = []
        for budget, cat_name in result.all():
            items.append(
                BudgetRead(
                    id=budget.id,
                    category_id=budget.category_id,
                    category_name=cat_name,
                    period_month=budget.period_month,
                    limit_amount=budget.limit_amount,
                    created_at=budget.created_at,
                    updated_at=budget.updated_at,
                )
            )
        return items

    @staticmethod
    async def upsert(
        session: AsyncSession,
        data: BudgetCreate,
        user_id: uuid.UUID,
    ) -> BudgetRead:
        normalized = data.period_month.replace(day=1)

        # If setting category budget, verify category belongs to user
        cat_name = None
        if data.category_id:
            cat_stmt = select(Category).where(
                Category.id == data.category_id,
                Category.user_id == user_id,
            )
            cat = (await session.execute(cat_stmt)).scalar_one_or_none()
            if not cat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found.",
                )
            cat_name = cat.name

        # Check existing budget for same user, category, and month
        category_filter = (
            Budget.category_id.is_(None)
            if data.category_id is None
            else Budget.category_id == data.category_id
        )
        stmt = select(Budget).where(
            and_(
                Budget.user_id == user_id,
                category_filter,
                Budget.period_month == normalized,
            )
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()

        if existing:
            existing.limit_amount = data.limit_amount
            await session.commit()
            await session.refresh(existing)
            budget = existing
        else:
            budget = Budget(
                user_id=user_id,
                category_id=data.category_id,
                period_month=normalized,
                limit_amount=data.limit_amount,
            )
            session.add(budget)
            await session.commit()
            await session.refresh(budget)

        return BudgetRead(
            id=budget.id,
            category_id=budget.category_id,
            category_name=cat_name,
            period_month=budget.period_month,
            limit_amount=budget.limit_amount,
            created_at=budget.created_at,
            updated_at=budget.updated_at,
        )

    @staticmethod
    async def delete(
        session: AsyncSession,
        budget_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        del_stmt = delete(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == user_id,
        )
        result = await session.execute(del_stmt)
        await session.commit()
        return result.rowcount > 0

    @staticmethod
    async def get_status(
        session: AsyncSession,
        period_month: date,
        user_id: uuid.UUID,
    ) -> BudgetStatusResponse:
        normalized = period_month.replace(day=1)
        # Next month start for date bounds
        if normalized.month == 12:
            next_month = date(normalized.year + 1, 1, 1)
        else:
            next_month = date(normalized.year, normalized.month + 1, 1)

        # Get budgets for this user and month
        budgets_query = (
            select(Budget, Category.name.label("category_name"))
            .outerjoin(
                Category,
                and_(
                    Category.id == Budget.category_id,
                    Category.user_id == user_id,
                )
            )
            .where(
                Budget.user_id == user_id,
                Budget.period_month == normalized,
            )
        )
        budgets_result = (await session.execute(budgets_query)).all()

        # Get total spend overall for this user and month
        total_spend_query = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
            and_(
                Expense.user_id == user_id,
                Expense.expense_date >= normalized,
                Expense.expense_date < next_month,
            )
        )
        total_spent = (await session.execute(total_spend_query)).scalar_one()

        # Get spend by category for this user and month
        cat_spend_query = (
            select(
                Expense.category_id,
                func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("cat_total"),
            )
            .where(
                and_(
                    Expense.user_id == user_id,
                    Expense.expense_date >= normalized,
                    Expense.expense_date < next_month,
                )
            )
            .group_by(Expense.category_id)
        )
        cat_spend_map = {
            row.category_id: row.cat_total for row in (await session.execute(cat_spend_query)).all()
        }

        overall_item: Optional[BudgetStatusItem] = None
        category_items: List[BudgetStatusItem] = []

        for budget, cat_name in budgets_result:
            if budget.category_id is None:
                # Overall budget
                spent = total_spent
                rem = budget.limit_amount - spent
                pct, status_str = BudgetService._compute_status_values(budget.limit_amount, spent)
                overall_item = BudgetStatusItem(
                    budget_id=budget.id,
                    category_id=None,
                    category_name=None,
                    period_month=budget.period_month,
                    limit_amount=budget.limit_amount,
                    spent_amount=spent,
                    remaining_amount=rem,
                    percentage_used=pct,
                    status=status_str,
                )
            else:
                spent = cat_spend_map.get(budget.category_id, Decimal("0.00"))
                rem = budget.limit_amount - spent
                pct, status_str = BudgetService._compute_status_values(budget.limit_amount, spent)
                category_items.append(
                    BudgetStatusItem(
                        budget_id=budget.id,
                        category_id=budget.category_id,
                        category_name=cat_name,
                        period_month=budget.period_month,
                        limit_amount=budget.limit_amount,
                        spent_amount=spent,
                        remaining_amount=rem,
                        percentage_used=pct,
                        status=status_str,
                    )
                )

        return BudgetStatusResponse(overall=overall_item, categories=category_items)

    @staticmethod
    def _compute_status_values(limit: Decimal, spent: Decimal) -> tuple[float, str]:
        if limit <= 0:
            pct = 100.0 if spent > 0 else 0.0
            return pct, "over_budget" if spent > 0 else "on_track"

        pct = float((spent / limit) * 100)
        if pct < 80.0:
            status_str = "on_track"
        elif pct <= 100.0:
            status_str = "near_limit"
        else:
            status_str = "over_budget"
        return round(pct, 2), status_str
