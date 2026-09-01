import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text, select
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db import session as db_session
from app.db.session import get_db, engine as dev_engine
from app.db.base import Base
from app.models.user import User
from app.models.category import Category
from app.models.expense import Expense
from app.models.budget import Budget
from app.services.auth_service import AuthService
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
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await init_engine.dispose()


    yield


@pytest_asyncio.fixture
async def client():
    """
    Base test HTTP client pointed to fintrack_test.
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

    orig_engine = db_session.engine
    orig_factory = db_session.async_session_factory
    db_session.engine = test_engine
    db_session.async_session_factory = test_session_factory

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

    app.dependency_overrides.pop(get_db, None)
    db_session.engine = orig_engine
    db_session.async_session_factory = orig_factory
    await test_engine.dispose()


@pytest_asyncio.fixture
async def test_user(client: AsyncClient):
    """
    Creates or returns a standard test user in fintrack_test with seeded starter categories.
    """
    test_engine = create_async_engine(
        settings.test_database_url,
        poolclass=NullPool,
        echo=False,
    )
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    email = f"testuser_{uuid.uuid4().hex[:8]}@fintrack.app"
    async with async_session() as session:
        user = User(
            email=email,
            hashed_password=hash_password("Password123!"),
            full_name="FinTrack Test User",
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.flush()
        await AuthService.seed_user_categories(session, user.id)
        await session.commit()
        await session.refresh(user)

    await test_engine.dispose()
    return user


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient, test_user: User):
    """
    AsyncClient pre-authenticated with JWT Bearer header for test_user.
    """
    token = create_access_token(user_id=str(test_user.id), email=test_user.email)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest_asyncio.fixture
async def user_a(client: AsyncClient):
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        user = User(
            email=f"user_a_{uuid.uuid4().hex[:8]}@fintrack.app",
            hashed_password=hash_password("Password123!"),
            full_name="User Alpha",
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.flush()
        await AuthService.seed_user_categories(session, user.id)
        await session.commit()
        await session.refresh(user)
    await test_engine.dispose()
    return user


@pytest_asyncio.fixture
async def user_b(client: AsyncClient):
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        user = User(
            email=f"user_b_{uuid.uuid4().hex[:8]}@fintrack.app",
            hashed_password=hash_password("Password123!"),
            full_name="User Beta",
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.flush()
        await AuthService.seed_user_categories(session, user.id)
        await session.commit()
        await session.refresh(user)
    await test_engine.dispose()
    return user


@pytest_asyncio.fixture
async def user_a_client(user_a: User):
    token = create_access_token(user_id=str(user_a.id), email=user_a.email)
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"Authorization": f"Bearer {token}"},
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def user_b_client(user_b: User):
    token = create_access_token(user_id=str(user_b.id), email=user_b.email)
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"Authorization": f"Bearer {token}"},
    ) as ac:
        yield ac
