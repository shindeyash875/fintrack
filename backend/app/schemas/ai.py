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


class AIChatMessage(BaseModel):
    """Single message in a conversational AI chat history."""

    role: str = Field(
        ...,
        description="'user' or 'assistant' or 'system'",
    )
    content: str = Field(
        ...,
        description="Text content of the message",
    )


class AIChatRequest(BaseModel):
    """Request payload for chatting with the FinTrack AI Financial Advisor."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=1500,
        description="User question or statement regarding their finances",
    )
    history: Optional[list[AIChatMessage]] = Field(
        default_factory=list,
        description="Prior conversational turns for context awareness",
    )


class AIChatResponse(BaseModel):
    """Structured response from the FinTrack AI Financial Advisor."""

    reply: str = Field(
        ...,
        description="Markdown-formatted AI financial advice grounded in user's real data",
    )
    suggested_actions: list[str] = Field(
        default_factory=list,
        description="Suggested quick follow-up questions or action prompts",
    )
    referenced_metrics: Optional[dict] = Field(
        default=None,
        description="Key financial metrics cited during analysis (total spent, top category, etc.)",
    )


class SpendingAnomalyItem(BaseModel):
    """Detected unusual spending spike or anomaly."""

    title: str = Field(..., description="Transaction or event title")
    amount: Decimal = Field(..., description="Amount spent in INR")
    category_name: str = Field(..., description="Category of the anomalous expense")
    expense_date: date = Field(..., description="Date on which anomaly occurred")
    severity: str = Field(
        default="medium",
        description="'low' | 'medium' | 'high'",
    )
    explanation: str = Field(
        ...,
        description="Plain-English explanation of why this is considered an anomaly (e.g. '3.2x above your daily dining average')",
    )


class ForecastCategoryItem(BaseModel):
    """Category-specific month-end spending projection and risk classification."""

    category_name: str = Field(..., description="Name of category")
    current_spend: Decimal = Field(..., description="Total spent month-to-date in INR")
    predicted_month_end: Decimal = Field(..., description="Projected spend by end of month in INR")
    budget_limit: Optional[Decimal] = Field(
        default=None,
        description="Active category budget limit if configured",
    )
    projected_status: str = Field(
        default="within_budget",
        description="'within_budget' | 'at_risk' | 'exceeded'",
    )
    risk_level: str = Field(
        default="low",
        description="'low' | 'medium' | 'high'",
    )


class SpendingForecastResponse(BaseModel):
    """Comprehensive AI spending forecast, anomaly alerts, and daily allowance."""

    current_month_to_date: Decimal = Field(..., description="Total spent so far in current month (INR)")
    predicted_total_month_end: Decimal = Field(..., description="Projected total spend at month end (INR)")
    days_remaining: int = Field(..., description="Days remaining in current calendar month")
    daily_recommended_spend: Decimal = Field(
        ...,
        description="Recommended maximum daily spending allowance to remain within budget (INR)",
    )
    historical_average_monthly: Decimal = Field(
        ...,
        description="Baseline average monthly spend from past history (INR)",
    )
    confidence_score: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Forecast confidence score between 0.0 and 1.0",
    )
    summary: str = Field(
        ...,
        description="Executive summary of projected spending trajectory and financial health",
    )
    anomalies: list[SpendingAnomalyItem] = Field(
        default_factory=list,
        description="List of detected unusual spending spikes and outliers",
    )
    category_forecasts: list[ForecastCategoryItem] = Field(
        default_factory=list,
        description="Per-category spending projections and risk levels",
    )
    proactive_tips: list[str] = Field(
        default_factory=list,
        description="2-3 personalized, actionable tips to keep spending under control",
    )



class SpendingAnomalyItem(BaseModel):
    """Detected unusual spending spike or anomaly."""

    title: str = Field(..., description="Transaction or event title")
    amount: Decimal = Field(..., description="Amount spent in INR")
    category_name: str = Field(..., description="Category of the anomalous expense")
    expense_date: date = Field(..., description="Date on which anomaly occurred")
    severity: str = Field(
        default="medium",
        description="'low' | 'medium' | 'high'",
    )
    explanation: str = Field(
        ...,
        description="Plain-English explanation of why this is considered an anomaly (e.g. '3.2x above your daily dining average')",
    )


class ForecastCategoryItem(BaseModel):
    """Category-specific month-end spending projection and risk classification."""

    category_name: str = Field(..., description="Name of category")
    current_spend: Decimal = Field(..., description="Total spent month-to-date in INR")
    predicted_month_end: Decimal = Field(..., description="Projected spend by end of month in INR")
    budget_limit: Optional[Decimal] = Field(
        default=None,
        description="Active category budget limit if configured",
    )
    projected_status: str = Field(
        default="within_budget",
        description="'within_budget' | 'at_risk' | 'exceeded'",
    )
    risk_level: str = Field(
        default="low",
        description="'low' | 'medium' | 'high'",
    )


class SpendingForecastResponse(BaseModel):
    """Comprehensive AI spending forecast, anomaly alerts, and daily allowance."""

    current_month_to_date: Decimal = Field(..., description="Total spent so far in current month (INR)")
    predicted_total_month_end: Decimal = Field(..., description="Projected total spend at month end (INR)")
    days_remaining: int = Field(..., description="Days remaining in current calendar month")
    daily_recommended_spend: Decimal = Field(
        ...,
        description="Recommended maximum daily spending allowance to remain within budget (INR)",
    )
    historical_average_monthly: Decimal = Field(
        ...,
        description="Baseline average monthly spend from past history (INR)",
    )
    confidence_score: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Forecast confidence score between 0.0 and 1.0",
    )
    summary: str = Field(
        ...,
        description="Executive summary of projected spending trajectory and financial health",
    )
    anomalies: list[SpendingAnomalyItem] = Field(
        default_factory=list,
        description="List of detected unusual spending spikes and outliers",
    )
    category_forecasts: list[ForecastCategoryItem] = Field(
        default_factory=list,
        description="Per-category spending projections and risk levels",
    )
    proactive_tips: list[str] = Field(
        default_factory=list,
        description="2-3 personalized, actionable tips to keep spending under control",
    )



