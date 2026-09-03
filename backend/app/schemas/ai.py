from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ScannedReceiptData(BaseModel):
    """Structured extraction output for scanned receipts, bills, and UPI screenshots."""

    title: str = Field(
        ...,
        description="Clean, concise title or merchant name (e.g., 'Starbucks Coffee', 'D-Mart Supermarket', 'Swiggy Order', 'HP Petrol Pump')",
    )
    amount: Decimal = Field(
        ...,
        gt=0,
        description="Total monetary amount of the transaction in INR (must be positive number, e.g., 450.00)",
    )
    expense_date: date = Field(
        default_factory=date.today,
        description="Date of transaction in YYYY-MM-DD format. If date is not found or in future, use today's date.",
    )
    payment_mode: Optional[str] = Field(
        default=None,
        description="Detected payment mode: 'upi', 'card', or 'cash'. If not identified, return null.",
    )
    suggested_category_name: Optional[str] = Field(
        default=None,
        description="Best matching category name (e.g. 'Food', 'Groceries', 'Transport', 'Shopping', 'Bills & Utilities', 'Health', 'Entertainment', 'Other')",
    )
    suggested_category_id: Optional[UUID] = Field(
        default=None,
        description="Exact matched category UUID from user's active categories if match found",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Helpful summary of items, invoice number, or merchant location if visible",
    )
    confidence: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Model confidence score between 0.0 and 1.0",
    )
    raw_summary: Optional[str] = Field(
        default=None,
        description="Short 1-line itemized breakdown if multiple items are listed",
    )
