import asyncio
import logging
import uuid
from typing import Optional
from sqlalchemy import select
from app.core.config import settings
from app.db.session import async_session_factory
from app.models.category import Category
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

STARTER_CATEGORIES = [
    "Food",
    "Transport",
    "Rent",
    "Utilities",
    "Shopping",
    "Health",
    "Entertainment",
    "Other",
]


async def seed_starter_categories_for_user(user_id: uuid.UUID) -> None:
    """
    Idempotently seeds starter categories for a specific user account.
    """
    async with async_session_factory() as session:
        for name in STARTER_CATEGORIES:
            stmt = select(Category).where(
                Category.user_id == user_id,
                Category.name == name,
            )
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if not existing:
                category = Category(user_id=user_id, name=name)
                session.add(category)
        await session.commit()


async def seed_starter_categories() -> None:
    """
    Global startup seed hook (optional).
    """
    if not settings.SEED_STARTER_CATEGORIES:
        return
    logger.info("SEED_STARTER_CATEGORIES check complete.")


if __name__ == "__main__":
    asyncio.run(seed_starter_categories())
