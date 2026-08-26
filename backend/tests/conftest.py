import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text, select
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.db import session as db_session
from app.db.session import get_db, engine as dev_engine
from app.db.base import Base
from app.models.category import Category
from app.models.expense import Expense
from app.models.budget import Budget
from app.db.seed import STARTER_CATEGORIES
from app.main import app


@pytest_asyncio.fixture(scope="session", autouse=True)
async def initialize_test_database():
    """
    Session-scoped:
    1. Ensures fintrack_test database exists in PostgreSQL.
    2. Runs Base.metadata.create_all on fintrack_test.
    """
    try:
        async with dev_engine.connect() as conn:
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            res = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": settings.TEST_DB_NAME},
            )
            if not res.scalar():
                await conn.execute(text(f"CREATE DATABASE {settings.TEST_DB_NAME}"))
    except Exception as exc:
        print(f"[conftest] Database check/create notice: {exc}")

    # Initialize schema in fintrack_test
    init_engine = create_async_engine(
        settings.test_database_url,
        poolclass=NullPool,
        echo=False,
    )
    async with init_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await init_engine.dispose()

    yield


@pytest_asyncio.fixture
async def client():
    """
    Function-scoped client:
    - Uses NullPool to prevent event loop mismatch across async tests on Windows.
    - Points exclusively to fintrack_test.
    - Guarantees starter categories are seeded.
    - Overrides get_db so all API routes use the test session.
    """
    test_engine = create_async_engine(
        settings.test_database_url,
        poolclass=NullPool,
        echo=False,
        future=True,
    )
    test_session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    # Patch db_session globals
    orig_engine = db_session.engine
    orig_factory = db_session.async_session_factory
    db_session.engine = test_engine
    db_session.async_session_factory = test_session_factory

    # Ensure starter categories exist in fintrack_test for this test
    async with test_session_factory() as session:
        for name in STARTER_CATEGORIES:
            res = await session.execute(select(Category).where(Category.name == name))
            if not res.scalar_one_or_none():
                session.add(Category(name=name))
        await session.commit()

    async def override_get_db():
        async with test_session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    # Teardown
    app.dependency_overrides.pop(get_db, None)
    db_session.engine = orig_engine
    db_session.async_session_factory = orig_factory
    await test_engine.dispose()
