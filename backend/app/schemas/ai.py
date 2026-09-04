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


class SpendingLeakItem(BaseModel):
    """Category or expense pattern where excess discretionary funds were lost."""

    category_name: str = Field(..., description="Category name where overspending or leak occurred")
    amount: Decimal = Field(..., description="Total amount spent in this category during the month (INR)")
    percentage_of_total: float = Field(..., description="Percentage of total monthly spend (0-100%)")
    leak_reason: str = Field(..., description="Detailed explanation of the spending leak and impact")


class CategoryDigestInsight(BaseModel):
    """Per-category monthly performance grade and observation."""

    category_name: str = Field(..., description="Category name")
    total_spent: Decimal = Field(..., description="Total spent in category (INR)")
    budget_limit: Optional[Decimal] = Field(default=None, description="Category budget limit if set (INR)")
    percentage_of_total: float = Field(..., description="Percentage of monthly spend")
    grade: str = Field(default="B", description="'A+' | 'A' | 'B' | 'C' | 'D'")
    insight: str = Field(..., description="Short contextual insight for this category")


class MonthlyDigestResponse(BaseModel):
    """Comprehensive AI Monthly Financial Health Digest and Executive Scorecard."""

    month: str = Field(..., description="Month in YYYY-MM or YYYY-MM-DD format")
    month_name: str = Field(..., description="Human formatted month name (e.g., 'September 2026')")
    health_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Overall financial health score from 0 to 100",
    )
    grade: str = Field(
        ...,
        description="Letter grade rating: 'A+', 'A', 'B', 'C', or 'D'",
    )
    headline: str = Field(
        ...,
        description="Punchy, memorable 1-line headline summarizing the month's performance",
    )
    executive_summary: str = Field(
        ...,
        description="2-3 sentence executive breakdown of cash flow and discipline",
    )
    total_spent: Decimal = Field(..., description="Total expenditure in the month (INR)")
    budget_limit: Optional[Decimal] = Field(
        default=None,
        description="Total overall monthly budget limit if set (INR)",
    )
    savings_or_deficit: Decimal = Field(
        ...,
        description="Net surplus (positive) or deficit (negative) vs budget (INR)",
    )
    total_transactions: int = Field(..., description="Total number of logged transactions in month")
    daily_average: Decimal = Field(..., description="Average daily expenditure for the month (INR)")
    top_spending_leaks: list[SpendingLeakItem] = Field(
        default_factory=list,
        description="Top 1-3 categories where avoidable overspending occurred",
    )
    biggest_wins: list[str] = Field(
        default_factory=list,
        description="2-4 financial victories, good habits, or under-budget categories",
    )
    action_plan_next_month: list[str] = Field(
        default_factory=list,
        description="3 concrete, high-impact tactical savings targets for the upcoming month",
    )
    category_insights: list[CategoryDigestInsight] = Field(
        default_factory=list,
        description="Category-by-category breakdown and ratings",
    )


# =========================================================================
# Feature 5.2: AI "Can I Afford This?" Purchase Affordability Simulator
# =========================================================================

class AffordabilityRequest(BaseModel):
    """Input payload for purchase affordability simulation."""

    item_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the desired item or goal (e.g., 'Sony WH-1000XM5 Headphones', 'Weekend Trip to Goa')",
    )
    amount: Decimal = Field(
        ...,
        gt=0,
        description="Total purchase price in INR",
    )
    category_id: Optional[UUID] = Field(
        default=None,
        description="Target expense category ID if known",
    )
    category_name: Optional[str] = Field(
        default=None,
        description="Category name fallback if ID is not available",
    )
    payment_method: Optional[str] = Field(
        default="one_time",
        description="Payment mode: 'one_time' or 'emi'",
    )
    emi_months: Optional[int] = Field(
        default=3,
        ge=1,
        le=36,
        description="Number of EMI months if paying in installments (e.g. 3, 6, 12)",
    )


class AffordabilityImpact(BaseModel):
    """Detailed financial breakdown and before/after budget metrics."""

    current_category_spent: Decimal = Field(..., description="Amount spent so far in this category this month")
    category_budget_limit: Optional[Decimal] = Field(default=None, description="Category budget limit if defined")
    category_remaining_after: Optional[Decimal] = Field(
        default=None,
        description="Category budget remaining after this purchase (can be negative if over budget)",
    )
    overall_spent: Decimal = Field(..., description="Overall amount spent across all categories this month")
    overall_budget_limit: Optional[Decimal] = Field(default=None, description="Overall monthly budget limit if set")
    overall_remaining_after: Optional[Decimal] = Field(
        default=None,
        description="Overall budget remaining after this purchase",
    )
    daily_budget_before: Decimal = Field(..., description="Safe daily spending allowance before purchase")
    daily_budget_after: Decimal = Field(..., description="Safe daily spending allowance after purchase")
    days_remaining_in_month: int = Field(..., description="Days left in the current calendar month")


class AffordabilityResponse(BaseModel):
    """Comprehensive AI purchase simulation verdict and smart decision roadmap."""

    verdict: str = Field(
        ...,
        description="Affordability decision: 'SAFE_TO_BUY', 'CAUTION', or 'NOT_RECOMMENDED'",
    )
    verdict_title: str = Field(
        ...,
        description="Punchy, clear headline verdict (e.g., 'Safe to Buy! You have ample buffer.')",
    )
    verdict_description: str = Field(
        ...,
        description="Detailed plain-English financial reasoning explaining the verdict",
    )
    item_name: str = Field(..., description="Item or expense name evaluated")
    amount: Decimal = Field(..., description="Total purchase cost evaluated")
    monthly_commitment: Decimal = Field(
        ...,
        description="Immediate monthly financial deduction (full cost if one-time, monthly installment if EMI)",
    )
    affordability_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Affordability index score from 0 (unsafe) to 100 (fully safe)",
    )
    impact: AffordabilityImpact = Field(..., description="Mathematical before/after budget metrics")
    recommendations: list[str] = Field(
        default_factory=list,
        description="2-4 tactical steps or guardrails for this purchase",
    )
    alternative_strategies: list[str] = Field(
        default_factory=list,
        description="Smart alternatives (e.g., target savings dates, EMI options, category budget adjustments)",
    )


# =========================================================================
# Feature 5.3: AI 50/30/20 Smart Auto-Budget & Savings Goal Planner
# =========================================================================

class AutoBudgetGenerateRequest(BaseModel):
    """Input parameters for generating 50/30/20 smart budget recommendations."""

    monthly_income: Optional[Decimal] = Field(
        default=None,
        gt=0,
        description="Target or expected monthly income in INR (if None, estimated from historical spending rate)",
    )
    savings_target_percentage: Optional[int] = Field(
        default=20,
        ge=5,
        le=50,
        description="Desired savings target percentage (default: 20%)",
    )
    lifestyle_mode: Optional[str] = Field(
        default="balanced",
        description="Budgeting strategy: 'frugal' (60/20/20), 'balanced' (50/30/20), 'growth' (40/30/30)",
    )


class CategoryBudgetRecommendation(BaseModel):
    """Recommended budget ceiling for a specific category within 50/30/20 buckets."""

    category_id: Optional[UUID] = Field(default=None, description="Category database ID")
    category_name: str = Field(..., description="Category display name")
    bucket_type: str = Field(
        ...,
        description="50/30/20 bucket allocation: 'needs', 'wants', or 'savings'",
    )
    recommended_limit: Decimal = Field(..., gt=0, description="Suggested monthly budget limit (INR)")
    historical_average: Decimal = Field(..., ge=0, description="User's historical monthly spend in this category")
    rationale: str = Field(..., description="1-sentence explanation of why this limit was chosen")


class SmartBudgetPlanResponse(BaseModel):
    """Comprehensive 50/30/20 smart auto-budget plan."""

    monthly_income_basis: Decimal = Field(..., description="Estimated or provided monthly income baseline (INR)")
    needs_allocation: Decimal = Field(..., description="50% Needs total budget limit (INR)")
    wants_allocation: Decimal = Field(..., description="30% Wants total budget limit (INR)")
    savings_allocation: Decimal = Field(..., description="20% Savings target amount (INR)")
    overall_recommended_limit: Decimal = Field(..., description="Total suggested spending ceiling (Needs + Wants)")
    categories: list[CategoryBudgetRecommendation] = Field(
        default_factory=list,
        description="Individual category budget limits",
    )
    ai_financial_philosophy: str = Field(
        ...,
        description="Strategic personalized rationale and guidance from the AI advisor",
    )
    actionable_milestones: list[str] = Field(
        default_factory=list,
        description="3-4 step-by-step milestones to adhere to this plan",
    )


class CategoryBudgetApplyItem(BaseModel):
    category_id: Optional[UUID] = None
    limit_amount: Decimal = Field(..., gt=0)


class ApplySmartBudgetRequest(BaseModel):
    """Payload to save and apply the AI-generated budget limits to user's database."""

    period_month: Optional[date] = Field(default=None, description="Month to apply budget to (defaults to current month)")
    overall_limit: Optional[Decimal] = Field(default=None, gt=0, description="Overall monthly limit")
    category_budgets: list[CategoryBudgetApplyItem] = Field(
        default_factory=list,
        description="List of category limits to save",
    )





