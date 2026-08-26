import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class BudgetBase(BaseModel):
    category_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Category ID, or null for overall monthly budget",
    )
    period_month: date = Field(
        default_factory=lambda: date.today().replace(day=1),
        description="Budget period month, normalized to first day of month",
    )
    limit_amount: Decimal = Field(
        ...,
        gt=0,
        decimal_places=2,
        description="Budget limit amount, must be strictly greater than 0",
    )

    @field_validator("period_month")
    @classmethod
    def normalize_period_month(cls, v: date) -> date:
        return v.replace(day=1)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    limit_amount: Decimal = Field(..., gt=0, decimal_places=2)


class BudgetRead(BudgetBase):
    id: uuid.UUID
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BudgetStatusItem(BaseModel):
    budget_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    category_name: Optional[str] = None
    period_month: date
    limit_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_used: float
    status: str = Field(..., description="'on_track' | 'near_limit' | 'over_budget'")


class BudgetStatusResponse(BaseModel):
    overall: Optional[BudgetStatusItem] = None
    categories: list[BudgetStatusItem] = []
