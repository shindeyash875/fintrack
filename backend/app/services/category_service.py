import logging
import uuid
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.category import Category
from app.models.expense import Expense
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryRead, normalize_title_case

logger = logging.getLogger(__name__)


class CategoryService:
    @staticmethod
    async def get_all_with_counts(session: AsyncSession) -> List[CategoryRead]:
        """
        Retrieves all categories with their associated expense count (FR-9).
        """
        stmt = (
            select(
                Category,
                func.count(Expense.id).label("expense_count")
            )
            .outerjoin(Expense, Expense.category_id == Category.id)
            .group_by(Category.id)
            .order_by(Category.name.asc())
        )
        result = await session.execute(stmt)
        categories = []
        for cat, count in result.all():
            categories.append(
                CategoryRead(
                    id=cat.id,
                    name=cat.name,
                    created_at=cat.created_at,
                    updated_at=cat.updated_at,
                    expense_count=count,
                )
            )
        return categories

    @staticmethod
    async def get_by_id(session: AsyncSession, category_id: uuid.UUID) -> Optional[Category]:
        return await session.get(Category, category_id)

    @staticmethod
    async def create(session: AsyncSession, data: CategoryCreate) -> Category:
        normalized_name = normalize_title_case(data.name)

        # Case-insensitive duplicate check
        stmt = select(Category).where(func.lower(Category.name) == func.lower(normalized_name))
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category already exists.",
            )

        category = Category(name=normalized_name)
        session.add(category)
        try:
            await session.commit()
            await session.refresh(category)
            return category
        except IntegrityError as exc:
            await session.rollback()
            logger.warning("IntegrityError on category create: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category already exists.",
            )

    @staticmethod
    async def update(session: AsyncSession, category: Category, data: CategoryUpdate) -> Category:
        normalized_name = normalize_title_case(data.name)

        # Case-insensitive duplicate check excluding self
        stmt = select(Category).where(
            and_(
                func.lower(Category.name) == func.lower(normalized_name),
                Category.id != category.id,
            )
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category already exists.",
            )

        category.name = normalized_name
        try:
            await session.commit()
            await session.refresh(category)
            return category
        except IntegrityError as exc:
            await session.rollback()
            logger.warning("IntegrityError on category update: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category already exists.",
            )

    @staticmethod
    async def delete(
        session: AsyncSession,
        category: Category,
        reassign_to: Optional[uuid.UUID] = None,
        cascade: bool = False,
    ) -> Tuple[bool, Optional[str]]:
        """
        Safely deletes a category adhering to FR-8.
        Returns (success, error_message).
        """
        # Count attached expenses
        stmt = select(func.count(Expense.id)).where(Expense.category_id == category.id)
        count = (await session.execute(stmt)).scalar_one()

        if count > 0:
            if reassign_to:
                target_cat = await session.get(Category, reassign_to)
                if not target_cat:
                    return False, "Target reassignment category does not exist"
                # Reassign expenses
                update_stmt = (
                    Expense.__table__.update()
                    .where(Expense.category_id == category.id)
                    .values(category_id=reassign_to)
                )
                await session.execute(update_stmt)
                await session.flush()
            elif cascade:
                # Delete linked expenses
                delete_stmt = (
                    Expense.__table__.delete()
                    .where(Expense.category_id == category.id)
                )
                await session.execute(delete_stmt)
                await session.flush()
            else:
                return False, f"Category is in use by {count} expenses. Specify reassignment or cascade."

        # Delete category using SQLAlchemy 2.0 ORM delete construct
        del_stmt = delete(Category).where(Category.id == category.id)
        await session.execute(del_stmt)
        await session.commit()
        return True, None
