import asyncio
import logging
from sqlalchemy import select
from app.core.config import settings
from app.db.session import async_session_factory
from app.models.category import Category

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


async def seed_starter_categories() -> None:
    """
    Idempotently seeds starter categories if SEED_STARTER_CATEGORIES is enabled.
    FR-10: Food, Transport, Rent, Utilities, Shopping, Health, Entertainment, Other.
    Zero demo expenses or demo budgets are ever seeded.
    """
    if not settings.SEED_STARTER_CATEGORIES:
        logger.info("SEED_STARTER_CATEGORIES is false. Skipping category seeding.")
        return

    logger.info("Checking starter categories...")
    async with async_session_factory() as session:
        for name in STARTER_CATEGORIES:
            stmt = select(Category).where(Category.name == name)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if not existing:
                category = Category(name=name)
                session.add(category)
                logger.info("Seeded category: %s", name)
            else:
                logger.info("Category already exists: %s", name)
        await session.commit()
    logger.info("Category seeding check complete.")


if __name__ == "__main__":
    asyncio.run(seed_starter_categories())
