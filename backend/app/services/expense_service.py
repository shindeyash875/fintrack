import csv
import io
import math
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.expense import Expense
from app.models.category import Category
from app.schemas.common import PaginationMeta
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseRead,
    ExpenseImportResult,
    ExpenseImportRowError,
    ExpenseImportItem,
)


class ExpenseService:
    @staticmethod
    async def get_paginated(
        session: AsyncSession,
        user_id: uuid.UUID,
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
        Queries expenses strictly belonging to user_id with combined search, filtering, and sorting.
        """
        query = (
            select(Expense, Category.name.label("category_name"))
            .join(Category, Category.id == Expense.category_id)
            .where(Expense.user_id == user_id)
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
    async def get_by_id(
        session: AsyncSession,
        expense_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[ExpenseRead]:
        query = (
            select(Expense, Category.name.label("category_name"))
            .join(Category, Category.id == Expense.category_id)
            .where(
                Expense.id == expense_id,
                Expense.user_id == user_id,
            )
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
    async def create(
        session: AsyncSession,
        data: ExpenseCreate,
        user_id: uuid.UUID,
    ) -> ExpenseRead:
        # Verify category belongs to user
        cat_stmt = select(Category).where(
            Category.id == data.category_id,
            Category.user_id == user_id,
        )
        cat = (await session.execute(cat_stmt)).scalar_one_or_none()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found or does not belong to user.",
            )

        expense = Expense(
            user_id=user_id,
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

        return ExpenseRead(
            id=expense.id,
            title=expense.title,
            category_id=expense.category_id,
            category_name=cat.name,
            amount=expense.amount,
            expense_date=expense.expense_date,
            notes=expense.notes,
            payment_mode=expense.payment_mode,
            created_at=expense.created_at,
            updated_at=expense.updated_at,
        )

    @staticmethod
    async def update(
        session: AsyncSession,
        expense_id: uuid.UUID,
        data: ExpenseUpdate,
        user_id: uuid.UUID,
    ) -> Optional[ExpenseRead]:
        stmt = select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == user_id,
        )
        expense = (await session.execute(stmt)).scalar_one_or_none()
        if not expense:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if "category_id" in update_data and update_data["category_id"]:
            cat_stmt = select(Category).where(
                Category.id == update_data["category_id"],
                Category.user_id == user_id,
            )
            cat = (await session.execute(cat_stmt)).scalar_one_or_none()
            if not cat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target category not found.",
                )

        for field, val in update_data.items():
            if field == "title" and val:
                val = val.strip()
            elif field == "notes" and val:
                val = val.strip()
            setattr(expense, field, val)

        await session.commit()
        await session.refresh(expense)
        cat_obj = await session.get(Category, expense.category_id)
        return ExpenseRead(
            id=expense.id,
            title=expense.title,
            category_id=expense.category_id,
            category_name=cat_obj.name if cat_obj else None,
            amount=expense.amount,
            expense_date=expense.expense_date,
            notes=expense.notes,
            payment_mode=expense.payment_mode,
            created_at=expense.created_at,
            updated_at=expense.updated_at,
        )

    @staticmethod
    async def delete(
        session: AsyncSession,
        expense_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        del_stmt = delete(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == user_id,
        )
        result = await session.execute(del_stmt)
        await session.commit()
        return result.rowcount > 0

    @staticmethod
    async def get_all_filtered(
        session: AsyncSession,
        user_id: uuid.UUID,
        search: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        category_id: Optional[uuid.UUID] = None,
        amount_min: Optional[Decimal] = None,
        amount_max: Optional[Decimal] = None,
        payment_mode: Optional[str] = None,
        sort_by: str = "expense_date",
        sort_dir: str = "desc",
    ) -> List[ExpenseRead]:
        query = (
            select(Expense, Category.name.label("category_name"))
            .join(Category, Category.id == Expense.category_id)
            .where(Expense.user_id == user_id)
        )

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

        sort_column = getattr(Expense, sort_by, Expense.expense_date)
        if sort_dir.lower() == "asc":
            query = query.order_by(sort_column.asc(), Expense.created_at.asc())
        else:
            query = query.order_by(sort_column.desc(), Expense.created_at.desc())

        result = await session.execute(query)
        items = []
        for exp, cat_name in result.all():
            items.append(
                ExpenseRead(
                    id=exp.id,
                    title=exp.title,
                    category_id=exp.category_id,
                    category_name=cat_name,
                    amount=exp.amount,
                    expense_date=exp.expense_date,
                    notes=exp.notes,
                    payment_mode=exp.payment_mode,
                    created_at=exp.created_at,
                    updated_at=exp.updated_at,
                )
            )
        return items

    @staticmethod
    def generate_csv(expenses: List[ExpenseRead]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Title", "Category", "Amount (INR)", "Payment Mode", "Notes"])
        for exp in expenses:
            writer.writerow([
                exp.expense_date.isoformat(),
                exp.title,
                exp.category_name or "Uncategorized",
                f"{exp.amount:.2f}",
                exp.payment_mode or "",
                exp.notes or "",
            ])
        return output.getvalue()

    @staticmethod
    async def import_from_csv(
        session: AsyncSession,
        csv_content: str,
        user_id: uuid.UUID,
    ) -> ExpenseImportResult:
        csv_file = io.StringIO(csv_content.strip())
        reader = csv.reader(csv_file)
        header_row = next(reader, None)
        if not header_row:
            return ExpenseImportResult(
                total_processed=0,
                imported_count=0,
                skipped_duplicates_count=0,
                errors=[ExpenseImportRowError(row_number=0, error="CSV content is empty")],
            )

        def clean_h(h):
            return h.strip().lower().replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_")

        col_map = {}
        for idx, h in enumerate(header_row):
            ch = clean_h(h)
            if ch in ("date", "expense_date"):
                col_map["date"] = idx
            elif ch in ("title", "description", "name"):
                col_map["title"] = idx
            elif ch in ("category", "category_name"):
                col_map["category"] = idx
            elif ch in ("amount", "cost", "price", "amount_inr"):
                col_map["amount"] = idx
            elif ch in ("payment_mode", "mode", "payment_method"):
                col_map["payment_mode"] = idx
            elif ch in ("notes", "note", "remarks"):
                col_map["notes"] = idx

        if "date" not in col_map or "title" not in col_map or "amount" not in col_map:
            return ExpenseImportResult(
                total_processed=0,
                imported_count=0,
                skipped_duplicates_count=0,
                errors=[
                    ExpenseImportRowError(
                        row_number=1,
                        error="Missing required headers. CSV must contain: Date, Title, and Amount",
                    )
                ],
            )

        cat_result = await session.execute(
            select(Category).where(Category.user_id == user_id)
        )
        categories = {c.name.strip().lower(): c for c in cat_result.scalars().all()}

        async def get_or_create_category(cat_name: Optional[str]) -> Category:
            normalized = (cat_name or "").strip().lower()
            if normalized and normalized in categories:
                return categories[normalized]
            target_name = cat_name.strip() if cat_name and cat_name.strip() else "Other"
            normalized_target = target_name.lower()
            if normalized_target in categories:
                return categories[normalized_target]

            new_cat = Category(user_id=user_id, name=target_name)
            session.add(new_cat)
            await session.flush()
            categories[normalized_target] = new_cat
            return new_cat

        imported_count = 0
        skipped_duplicates_count = 0
        errors: List[ExpenseImportRowError] = []
        total_processed = 0

        existing_res = await session.execute(
            select(Expense.title, Expense.amount, Expense.expense_date, Expense.category_id).where(
                Expense.user_id == user_id
            )
        )
        existing_set = {
            (row[0].strip().lower(), row[1], row[2], row[3]) for row in existing_res.all()
        }

        for row_idx, row in enumerate(reader, start=2):
            if not row or not any(field.strip() for field in row):
                continue
            total_processed += 1

            raw_title = row[col_map["title"]].strip() if col_map["title"] < len(row) else ""
            if not raw_title:
                errors.append(ExpenseImportRowError(row_number=row_idx, raw_data=",".join(row), error="Title cannot be empty"))
                continue
            if len(raw_title) > 50:
                raw_title = raw_title[:50]

            raw_amount = row[col_map["amount"]].strip() if col_map["amount"] < len(row) else ""
            raw_amount = raw_amount.replace("₹", "").replace("$", "").replace(",", "").strip()
            try:
                amount_dec = Decimal(raw_amount)
                if amount_dec <= 0:
                    errors.append(ExpenseImportRowError(row_number=row_idx, raw_data=",".join(row), error="Amount must be greater than 0"))
                    continue
            except (InvalidOperation, ValueError):
                errors.append(ExpenseImportRowError(row_number=row_idx, raw_data=",".join(row), error=f"Invalid amount format: '{raw_amount}'"))
                continue

            raw_date = row[col_map["date"]].strip() if col_map["date"] < len(row) else ""
            parsed_date = None
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
                try:
                    parsed_date = datetime.strptime(raw_date, fmt).date()
                    break
                except ValueError:
                    pass
            if not parsed_date:
                errors.append(ExpenseImportRowError(row_number=row_idx, raw_data=",".join(row), error=f"Invalid date format: '{raw_date}' (Use YYYY-MM-DD)"))
                continue
            if parsed_date > date.today():
                errors.append(ExpenseImportRowError(row_number=row_idx, raw_data=",".join(row), error=f"Expense date cannot be in the future: '{raw_date}'"))
                continue

            cat_name = row[col_map["category"]].strip() if "category" in col_map and col_map["category"] < len(row) else None
            cat_obj = await get_or_create_category(cat_name)

            raw_mode = row[col_map["payment_mode"]].strip().lower() if "payment_mode" in col_map and col_map["payment_mode"] < len(row) else None
            if raw_mode not in ("cash", "card", "upi"):
                raw_mode = None

            raw_notes = row[col_map["notes"]].strip() if "notes" in col_map and col_map["notes"] < len(row) else None

            key = (raw_title.lower(), amount_dec, parsed_date, cat_obj.id)
            if key in existing_set:
                skipped_duplicates_count += 1
                continue

            new_exp = Expense(
                user_id=user_id,
                title=raw_title,
                category_id=cat_obj.id,
                amount=amount_dec,
                expense_date=parsed_date,
                payment_mode=raw_mode,
                notes=raw_notes,
            )
            session.add(new_exp)
            existing_set.add(key)
            imported_count += 1

        if imported_count > 0:
            await session.commit()

        return ExpenseImportResult(
            total_processed=total_processed,
            imported_count=imported_count,
            skipped_duplicates_count=skipped_duplicates_count,
            errors=errors,
        )

    @staticmethod
    async def import_from_json(
        session: AsyncSession,
        items: List[ExpenseImportItem],
        user_id: uuid.UUID,
    ) -> ExpenseImportResult:
        cat_result = await session.execute(
            select(Category).where(Category.user_id == user_id)
        )
        categories = {c.name.strip().lower(): c for c in cat_result.scalars().all()}

        async def get_or_create_category(cat_name: Optional[str]) -> Category:
            normalized = (cat_name or "").strip().lower()
            if normalized and normalized in categories:
                return categories[normalized]
            target_name = cat_name.strip() if cat_name and cat_name.strip() else "Other"
            normalized_target = target_name.lower()
            if normalized_target in categories:
                return categories[normalized_target]

            new_cat = Category(user_id=user_id, name=target_name)
            session.add(new_cat)
            await session.flush()
            categories[normalized_target] = new_cat
            return new_cat

        existing_res = await session.execute(
            select(Expense.title, Expense.amount, Expense.expense_date, Expense.category_id).where(
                Expense.user_id == user_id
            )
        )
        existing_set = {
            (row[0].strip().lower(), row[1], row[2], row[3]) for row in existing_res.all()
        }

        imported_count = 0
        skipped_duplicates_count = 0
        errors: List[ExpenseImportRowError] = []

        for idx, item in enumerate(items, start=1):
            if item.amount <= 0:
                errors.append(ExpenseImportRowError(row_number=idx, error="Amount must be greater than 0"))
                continue
            if item.expense_date > date.today():
                errors.append(ExpenseImportRowError(row_number=idx, error="Expense date cannot be in the future"))
                continue

            cat_obj = await get_or_create_category(item.category_name)
            raw_mode = item.payment_mode.strip().lower() if item.payment_mode else None
            if raw_mode not in ("cash", "card", "upi"):
                raw_mode = None

            key = (item.title.strip().lower(), item.amount, item.expense_date, cat_obj.id)
            if key in existing_set:
                skipped_duplicates_count += 1
                continue

            new_exp = Expense(
                user_id=user_id,
                title=item.title.strip(),
                category_id=cat_obj.id,
                amount=item.amount,
                expense_date=item.expense_date,
                payment_mode=raw_mode,
                notes=item.notes.strip() if item.notes else None,
            )
            session.add(new_exp)
            existing_set.add(key)
            imported_count += 1

        if imported_count > 0:
            await session.commit()

        return ExpenseImportResult(
            total_processed=len(items),
            imported_count=imported_count,
            skipped_duplicates_count=skipped_duplicates_count,
            errors=errors,
        )
