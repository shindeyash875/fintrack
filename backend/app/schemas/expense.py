import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExpenseBase(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Expense title / short description",
    )
    category_id: uuid.UUID = Field(
        ...,
        description="ID of the category this expense belongs to",
    )
    amount: Decimal = Field(
        ...,
        gt=0,
        decimal_places=2,
        description="Amount spent, must be strictly greater than 0",
    )
    expense_date: date = Field(
        default_factory=date.today,
        description="Date the expense occurred (cannot be in the future)",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Optional additional notes",
    )
    payment_mode: Optional[str] = Field(
        default=None,
        description="Payment mode: cash, card, upi, or null",
    )

    @field_validator("expense_date")
    @classmethod
    def validate_not_future_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Expense date cannot be in the future")
        return v

    @field_validator("payment_mode")
    @classmethod
    def validate_payment_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            normalized = v.strip().lower()
            if normalized not in ("cash", "card", "upi"):
                raise ValueError("Payment mode must be 'cash', 'card', 'upi', or null")
            return normalized
        return None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=50)
    category_id: Optional[uuid.UUID] = Field(default=None)
    amount: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    expense_date: Optional[date] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    payment_mode: Optional[str] = Field(default=None)

    @field_validator("expense_date")
    @classmethod
    def validate_not_future_date(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("Expense date cannot be in the future")
        return v

    @field_validator("payment_mode")
    @classmethod
    def validate_payment_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            normalized = v.strip().lower()
            if normalized not in ("cash", "card", "upi"):
                raise ValueError("Payment mode must be 'cash', 'card', 'upi', or null")
            return normalized
        return None


class ExpenseRead(ExpenseBase):
    id: uuid.UUID
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExpenseImportRowError(BaseModel):
    row_number: int
    raw_data: Optional[str] = None
    error: str


class ExpenseImportResult(BaseModel):
    total_processed: int
    imported_count: int
    skipped_duplicates_count: int
    errors: list[ExpenseImportRowError] = []


class ExpenseImportCsvPayload(BaseModel):
    csv_content: str = Field(..., min_length=1, description="Raw CSV content string")


class ExpenseImportItem(BaseModel):
    title: str = Field(..., min_length=1, max_length=50)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    expense_date: date
    category_name: Optional[str] = None
    payment_mode: Optional[str] = None
    notes: Optional[str] = None


class ExpenseImportJsonPayload(BaseModel):
    items: list[ExpenseImportItem] = Field(..., min_length=1)

