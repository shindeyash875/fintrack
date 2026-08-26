import math
import uuid
from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.expense import Expense
from app.models.category import Category
from app.schemas.common import PaginationMeta
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseRead


class ExpenseService:
    @staticmethod
    async def get_paginated(
        session: AsyncSession,
        search: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        category_id: Optional[uuid.UUID] = None,
        amount_min: Optional[Decimal] = None,
        amount_max: Optional[Decimal] = None,
        payment_mode: Optional[str] = None,
        sort_by: str = "expense_date",
        sort_dir: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ExpenseRead], PaginationMeta]:
        """
        Queries expenses with combined search, filtering, and sorting (FR-11 through FR-16).
        """
        query = select(Expense, Category.name.label("category_name")).join(
            Category, Category.id == Expense.category_id
        )

        # Filters
        if search:
            search_term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Expense.title.ilike(search_term),
                    Expense.notes.ilike(search_term),
                )
            )
        if date_from:
            query = query.where(Expense.expense_date >= date_from)
        if date_to:
            query = query.where(Expense.expense_date <= date_to)
        if category_id:
            query = query.where(Expense.category_id == category_id)
        if amount_min is not None:
            query = query.where(Expense.amount >= amount_min)
        if amount_max is not None:
            query = query.where(Expense.amount <= amount_max)
        if payment_mode:
            query = query.where(Expense.payment_mode == payment_mode.strip().lower())

        # Total count query
        count_query = select(func.count()).select_from(query.subquery())
        total = (await session.execute(count_query)).scalar_one()

        # Sorting
        sort_column = getattr(Expense, sort_by, Expense.expense_date)
        if sort_dir.lower() == "asc":
            query = query.order_by(sort_column.asc(), Expense.created_at.asc())
        else:
            query = query.order_by(sort_column.desc(), Expense.created_at.desc())

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await session.execute(query)
        rows = result.all()

        items = []
        for expense, category_name in rows:
            items.append(
                ExpenseRead(
                    id=expense.id,
                    title=expense.title,
                    category_id=expense.category_id,
                    category_name=category_name,
                    amount=expense.amount,
                    expense_date=expense.expense_date,
                    notes=expense.notes,
                    payment_mode=expense.payment_mode,
                    created_at=expense.created_at,
                    updated_at=expense.updated_at,
                )
            )

        total_pages = math.ceil(total / page_size) if total > 0 else 0
        meta = PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )
        return items, meta

    @staticmethod
    async def get_by_id(session: AsyncSession, expense_id: uuid.UUID) -> Optional[ExpenseRead]:
        query = (
            select(Expense, Category.name.label("category_name"))
            .join(Category, Category.id == Expense.category_id)
            .where(Expense.id == expense_id)
        )
        result = await session.execute(query)
        row = result.first()
        if not row:
            return None
        expense, cat_name = row
        return ExpenseRead(
            id=expense.id,
            title=expense.title,
            category_id=expense.category_id,
            category_name=cat_name,
            amount=expense.amount,
            expense_date=expense.expense_date,
            notes=expense.notes,
            payment_mode=expense.payment_mode,
            created_at=expense.created_at,
            updated_at=expense.updated_at,
        )

    @staticmethod
    async def create(session: AsyncSession, data: ExpenseCreate) -> ExpenseRead:
        expense = Expense(
            title=data.title.strip(),
            category_id=data.category_id,
            amount=data.amount,
            expense_date=data.expense_date,
            notes=data.notes.strip() if data.notes else None,
            payment_mode=data.payment_mode,
        )
        session.add(expense)
        await session.commit()
        await session.refresh(expense)
        cat = await session.get(Category, expense.category_id)
        return ExpenseRead(
            id=expense.id,
            title=expense.title,
            category_id=expense.category_id,
            category_name=cat.name if cat else None,
            amount=expense.amount,
            expense_date=expense.expense_date,
            notes=expense.notes,
            payment_mode=expense.payment_mode,
            created_at=expense.created_at,
            updated_at=expense.updated_at,
        )

    @staticmethod
    async def update(session: AsyncSession, expense_id: uuid.UUID, data: ExpenseUpdate) -> Optional[ExpenseRead]:
        expense = await session.get(Expense, expense_id)
        if not expense:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            if field == "title" and val:
                val = val.strip()
            elif field == "notes" and val:
                val = val.strip()
            setattr(expense, field, val)

        await session.commit()
        await session.refresh(expense)
        cat = await session.get(Category, expense.category_id)
        return ExpenseRead(
            id=expense.id,
            title=expense.title,
            category_id=expense.category_id,
            category_name=cat.name if cat else None,
            amount=expense.amount,
            expense_date=expense.expense_date,
            notes=expense.notes,
            payment_mode=expense.payment_mode,
            created_at=expense.created_at,
            updated_at=expense.updated_at,
        )

    @staticmethod
    async def delete(session: AsyncSession, expense_id: uuid.UUID) -> bool:
        expense = await session.get(Expense, expense_id)
        if not expense:
            return False
        await session.delete(expense)
        await session.commit()
        return True
