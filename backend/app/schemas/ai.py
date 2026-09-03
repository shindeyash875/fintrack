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
class ParseExpenseRequest(BaseModel):
    """Input payload for parsing natural language and voice expense text."""

    text: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="Natural language expense string (e.g. 'Spent 350 on Uber via UPI today')",
    )


class ParsedExpenseData(BaseModel):
    """Structured extraction output for natural language expense text."""

    title: str = Field(
        ...,
        description="Clean, concise title for the expense (e.g. 'Uber Ride to Office', 'Dinner at Barbeque Nation', 'Chai and Snacks')",
    )
    amount: Decimal = Field(
        ...,
        gt=0,
        description="Monetary amount in INR (must be positive number, e.g. 350.00)",
    )
    expense_date: date = Field(
        default_factory=date.today,
        description="Resolved date in YYYY-MM-DD format based on relative words ('today', 'yesterday', 'last Monday'). Never future.",
    )
    payment_mode: Optional[str] = Field(
        default=None,
        description="Detected payment mode: 'upi', 'card', or 'cash'. If not mentioned, return null.",
    )
    suggested_category_name: Optional[str] = Field(
        default=None,
        description="Best matching category name from available categories (e.g. 'Food', 'Transport', 'Groceries', 'Rent', 'Shopping', etc.)",
    )
    suggested_category_id: Optional[UUID] = Field(
        default=None,
        description="Exact matched category UUID from user's active categories if match found",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Any extra details, context, or merchant notes extracted from the phrase",
    )
    confidence: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Model confidence score between 0.0 and 1.0",
    )
    raw_summary: Optional[str] = Field(
        default=None,
        description="Clean one-line human summary of what was understood",
    )

