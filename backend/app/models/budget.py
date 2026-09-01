import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    Date,
    Numeric,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.category import Category


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        CheckConstraint("limit_amount > 0", name="check_budget_limit_positive"),
        UniqueConstraint("user_id", "category_id", "period_month", name="uq_user_budget_category_period"),
        Index("ix_budgets_user_id", "user_id"),
        Index("ix_budgets_period_month", "period_month"),
        Index("ix_budgets_user_period", "user_id", "period_month"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=True,
    )
    period_month: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    limit_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
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

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="budgets",
        lazy="selectin",
    )
    category: Mapped[Optional["Category"]] = relationship(
        "Category",
        back_populates="budgets",
        lazy="selectin",
    )
