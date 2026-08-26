import uuid
from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.expense import Expense
    from app.models.budget import Budget


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships (lazy="selectin" to avoid N+1 queries, passive_deletes=True delegates to DB constraints)
    expenses: Mapped[List["Expense"]] = relationship(
        "Expense",
        back_populates="category",
        lazy="selectin",
        passive_deletes=True,
    )
    budgets: Mapped[List["Budget"]] = relationship(
        "Budget",
        back_populates="category",
        lazy="selectin",
        passive_deletes=True,
    )
