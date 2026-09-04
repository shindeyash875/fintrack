import calendar
import logging
import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.expense import Expense
from app.schemas.ai import (
    AffordabilityImpact,
    AffordabilityRequest,
    AffordabilityResponse,
    AIChatMessage,
    AIChatResponse,
    ApplySmartBudgetRequest,
    AutoBudgetGenerateRequest,
    CategoryBudgetRecommendation,
    CategoryDigestInsight,
    ForecastCategoryItem,
    MonthlyDigestResponse,
    ParsedExpenseData,
    ScannedReceiptData,
    SmartBudgetPlanResponse,
    SpendingAnomalyItem,
    SpendingForecastResponse,
    SpendingLeakItem,
)
from app.schemas.budget import BudgetCreate
from app.services.ai.factory import AIFactory
from app.services.budget_service import BudgetService
from app.services.category_service import CategoryService
from app.services.dashboard_service import DashboardService

logger = logging.getLogger(__name__)

# Standard Indian & Universal expense domain keyword map
CATEGORY_DOMAIN_KEYWORDS: Dict[str, List[str]] = {
    "Food & Dining": [
        "food", "dining", "restaurant", "cafe", "chai", "tea", "coffee", "breakfast",
        "lunch", "dinner", "snack", "snacks", "pizza", "burger", "swiggy", "zomato",
        "mcdonald", "kfc", "starbucks", "biryani", "dosa", "thali", "mess", "canteen",
        "sweets", "bakery", "pastry", "shawarma", "subway", "dominos", "ice cream"
    ],
    "Transportation": [
        "uber", "ola", "rapido", "cab", "taxi", "auto", "rickshaw", "petrol", "diesel",
        "fuel", "cng", "bus", "train", "metro", "flight", "toll", "parking", "transport",
        "travel", "irctc", "ticket", "petrol pump", "indianoil", "hp petrol", "bharat petroleum"
    ],
    "Groceries": [
        "grocery", "groceries", "supermarket", "dmart", "d-mart", "blinkit", "zepto",
        "instamart", "bigbasket", "milk", "vegetables", "fruits", "kirana", "ration",
        "curd", "eggs", "oil", "atta", "paneer", "dairy", "provision"
    ],
    "Bills & Utilities": [
        "rent", "electricity", "power", "water", "gas", "cylinder", "wifi", "broadband",
        "internet", "recharge", "mobile", "dth", "maintenance", "bill", "bills", "utility",
        "maid", "cook", "society", "jio", "airtel", "vi", "tataplay", "piped gas"
    ],
    "Shopping": [
        "shopping", "amazon", "flipkart", "myntra", "ajio", "clothes", "shoes", "electronics",
        "mall", "store", "purchase", "dress", "shirt", "pants", "jeans", "tshirt", "watch",
        "zara", "h&m", "trends", "pantaloons", "footwear", "gadget", "croma", "reliance digital"
    ],
    "Entertainment": [
        "movie", "cinema", "theatre", "netflix", "prime", "hotstar", "spotify", "game",
        "gaming", "concert", "party", "outing", "club", "pub", "event", "show", "pvr",
        "inox", "cinepolis", "bookmyshow", "youtube premium"
    ],
    "Health & Medical": [
        "medicine", "pharmacy", "medical", "doctor", "clinic", "hospital", "gym", "fitness",
        "medicines", "apollo", "practo", "test", "lab", "tablets", "syrup", "pharmeasy",
        "netmeds", "1mg", "dentist", "consultation"
    ],
    "Education": [
        "books", "course", "tuition", "school", "college", "exam", "fees", "udemy",
        "coursera", "stationery", "pen", "notebook", "classes", "coaching"
    ],
    "Personal Care": [
        "salon", "spa", "haircut", "barber", "cosmetics", "grooming", "parlour", "facial",
        "massage", "skincare", "nykaa"
    ],
}


class AIService:
    """
    High-level AI service orchestrating business domain logic and LLM adapters.
    """

    @classmethod
    async def _smart_resolve_category(
        cls,
        session: AsyncSession,
        user_id: UUID,
        suggested_name: Optional[str],
        context_text: str,
        existing_categories: List[Category],
    ) -> Tuple[UUID, str]:
        """
        Intelligently matches or creates the exact category for an expense.
        1. Exact/substring match against user's categories.
        2. Domain keyword match against user's categories.
        3. Auto-creates the matched domain category or suggested category if not present.
        """
        combined_text = f"{suggested_name or ''} {context_text}".lower()

        # Step 1: Direct match with user's existing categories
        if suggested_name:
            s_name_lower = suggested_name.strip().lower()
            for cat in existing_categories:
                c_name_lower = cat.name.lower()
                if c_name_lower == s_name_lower or s_name_lower in c_name_lower or c_name_lower in s_name_lower:
                    return cat.id, cat.name

        # Step 2: Domain keyword matching
        target_domain_name: Optional[str] = None
        for domain_name, keywords in CATEGORY_DOMAIN_KEYWORDS.items():
            if any(kw in combined_text for kw in keywords):
                target_domain_name = domain_name
                break

        if target_domain_name:
            # Check if user already has a category matching this domain
            for cat in existing_categories:
                c_name_lower = cat.name.lower()
                d_name_lower = target_domain_name.lower()
                if d_name_lower in c_name_lower or c_name_lower in d_name_lower:
                    return cat.id, cat.name

            # User doesn't have this domain category yet -> auto-create it!
            created_cat = await CategoryService.get_or_create(session, target_domain_name, user_id)
            return created_cat.id, created_cat.name

        # Step 3: If AI provided a distinct category name, get or create it
        if suggested_name and len(suggested_name.strip()) >= 2:
            resolved_cat = await CategoryService.get_or_create(session, suggested_name.strip(), user_id)
            return resolved_cat.id, resolved_cat.name

        # Step 4: Fallback to first existing category or auto-create 'General'
        if existing_categories:
            return existing_categories[0].id, existing_categories[0].name

        fallback_cat = await CategoryService.get_or_create(session, "General", user_id)
        return fallback_cat.id, fallback_cat.name

    @staticmethod
    def _fallback_parse_expense(text: str, today: date) -> ParsedExpenseData:
        """
        Resilient rule-based / regex parser when remote LLM is unavailable.
        """
        lower_text = text.lower()

        # 1. Extract Amount
        amount = Decimal("0.00")
        k_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b', lower_text)
        if k_match:
            try:
                amount = Decimal(str(float(k_match.group(1)) * 1000))
            except Exception:
                pass

        if amount == 0:
            curr_match = re.search(r'(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)', lower_text)
            if curr_match:
                try:
                    amount = Decimal(curr_match.group(1).replace(',', ''))
                except Exception:
                    pass

        if amount == 0:
            num_rs_match = re.search(r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rs|rupees|inr)', lower_text)
            if num_rs_match:
                try:
                    amount = Decimal(num_rs_match.group(1).replace(',', ''))
                except Exception:
                    pass

        if amount == 0:
            generic_match = re.search(r'\b(\d+(?:,\d+)*(?:\.\d+)?)\b', lower_text)
            if generic_match:
                try:
                    amount = Decimal(generic_match.group(1).replace(',', ''))
                except Exception:
                    pass

        # 2. Extract Payment Mode
        payment_mode = None
        if any(w in lower_text for w in ["upi", "gpay", "google pay", "phonepe", "paytm", "bhim", "cred"]):
            payment_mode = "upi"
        elif any(w in lower_text for w in ["credit card", "debit card", "card", "cc", "dc", "pos"]):
            payment_mode = "card"
        elif any(w in lower_text for w in ["cash", "notes"]):
            payment_mode = "cash"
        elif any(w in lower_text for w in ["netbanking", "bank transfer", "neft", "rtgs", "imps"]):
            payment_mode = "bank_transfer"

        # 3. Extract Date
        expense_date = today
        if "yesterday" in lower_text:
            expense_date = today - timedelta(days=1)
        elif "day before yesterday" in lower_text:
            expense_date = today - timedelta(days=2)

        # 4. Extract Category Domain
        matched_cat_name = "General"
        for cat_domain, keywords in CATEGORY_DOMAIN_KEYWORDS.items():
            if any(kw in lower_text for kw in keywords):
                matched_cat_name = cat_domain
                break

        # Clean title
        clean_title = text.strip()
        clean_title = re.sub(r'(?:spent|paid|bought|for|at|via|on)?\s*(?:₹|rs\.?|inr)?\s*\d+(?:,\d+)*(?:\.\d+)?\s*(?:k|rs\.?|inr|rupees)?', '', clean_title, flags=re.IGNORECASE)
        clean_title = re.sub(r'\b(via|using|by|through)?\s*(upi|gpay|google pay|phonepe|paytm|cash|credit card|debit card|card|bank transfer)\b', '', clean_title, flags=re.IGNORECASE)
        clean_title = re.sub(r'\b(today|yesterday|day before yesterday)\b', '', clean_title, flags=re.IGNORECASE)
        clean_title = re.sub(r'^\s*(spent|paid|bought|for)\s+', '', clean_title, flags=re.IGNORECASE)
        clean_title = clean_title.strip(" ,.-")
        if not clean_title or len(clean_title) < 2:
            clean_title = f"{matched_cat_name} Expense"
        else:
            clean_title = clean_title.title()

        return ParsedExpenseData(
            title=clean_title,
            amount=amount if amount > 0 else Decimal("100.00"),
            expense_date=expense_date,
            suggested_category_name=matched_cat_name,
            payment_mode=payment_mode,
            raw_summary=f"₹{amount} spent on {clean_title} on {expense_date.isoformat()}",
        )

    @classmethod
    async def scan_receipt(
        cls,
        session: AsyncSession,
        user_id: UUID,
        image_bytes: bytes,
        mime_type: str,
    ) -> ScannedReceiptData:
        """
        Scans a physical bill, restaurant/grocery receipt, or UPI payment screenshot,
        extracting title, total amount, transaction date, payment mode, and matching user category.
        """
        # 1. Fetch user's existing categories for smart contextual matching
        query = select(Category).where(Category.user_id == user_id).order_by(Category.name)
        res = await session.execute(query)
        categories: List[Category] = list(res.scalars().all())

        category_names = [c.name for c in categories]
        categories_context = ", ".join(category_names) if category_names else "Food & Dining, Groceries, Transportation, Bills & Utilities, Shopping, Entertainment, Health & Medical"

        system_instruction = (
            "You are an expert OCR and financial data extraction assistant for the FinTrack app in India.\n"
            "Analyze the provided image of a paper receipt, bill, restaurant check, invoice, or UPI payment screenshot (Google Pay, PhonePe, Paytm, CRED, BHIM, etc.).\n\n"
            f"The user has the following categories in their account: [{categories_context}].\n\n"
            "Instructions:\n"
            "1. Extract the clean Merchant name or Title (e.g., 'Starbucks', 'D-Mart', 'Uber Ride', 'HP Petrol', 'Swiggy').\n"
            "2. Extract the TOTAL transaction amount in Indian Rupees (INR). Ensure it is a valid positive number.\n"
            "3. Extract the transaction date (YYYY-MM-DD). If not visible or unclear, use today's date.\n"
            "4. Identify payment mode: 'upi' (Google Pay, PhonePe, Paytm, UPI ID, QR), 'card' (Visa, Mastercard, RuPay, POS), or 'cash'.\n"
            "5. Pick the BEST matching category name from the user's category list above.\n"
            "6. In 'notes', summarize items purchased or invoice/transaction ID if visible.\n"
            "7. Return ONLY valid JSON matching the schema."
        )

        prompt = (
            f"Extract all financial transaction details from this image. Today's date is {date.today().isoformat()}. "
            "Detect merchant, total amount in INR, date, payment mode, and match to one of the user categories."
        )

        provider = AIFactory.get_provider()
        extracted: ScannedReceiptData = await provider.analyze_image_structured(
            image_bytes=image_bytes,
            mime_type=mime_type,
            prompt=prompt,
            response_schema=ScannedReceiptData,
            system_prompt=system_instruction,
            temperature=0.1,
        )

        # 2. Smart category matching & resolution
        cat_id, cat_name = await cls._smart_resolve_category(
            session=session,
            user_id=user_id,
            suggested_name=extracted.suggested_category_name,
            context_text=f"{extracted.title} {extracted.notes or ''}",
            existing_categories=categories,
        )
        extracted.suggested_category_id = cat_id
        extracted.suggested_category_name = cat_name

        # 3. Guard against future date hallucination
        if extracted.expense_date > date.today():
            extracted.expense_date = date.today()

        return extracted

    @classmethod
    async def parse_natural_language_expense(
        cls,
        session: AsyncSession,
        user_id: UUID,
        text: str,
    ) -> ParsedExpenseData:
        """
        Parses informal, spoken, or typed natural language expense strings
        (e.g., 'Spent 350 on Uber to office via UPI today', '150 chai cash yesterday'),
        extracting title, amount, resolved date, payment mode, and matching user category.
        """
        # 1. Fetch user's existing categories
        query = select(Category).where(Category.user_id == user_id).order_by(Category.name)
        res = await session.execute(query)
        categories: List[Category] = list(res.scalars().all())

        category_names = [c.name for c in categories]
        categories_context = ", ".join(category_names) if category_names else "Food & Dining, Groceries, Transportation, Bills & Utilities, Shopping, Entertainment, Health & Medical"

        today = date.today()
        system_instruction = (
            "You are an intelligent financial expense parser for the FinTrack personal finance app in India.\n"
            "Your task is to parse unstructured or spoken natural language expense text into accurate structured transaction data.\n\n"
            f"Today's date is: {today.isoformat()} ({today.strftime('%A, %B %d, %Y')}).\n"
            f"The user has the following categories in their account: [{categories_context}].\n\n"
            "Parsing Rules:\n"
            "1. 'title': Short, clean title of the expense (e.g., 'Uber to office', 'Dinner at McDonald\'s', 'Groceries', 'Chai and Snacks', 'Electricity Bill').\n"
            "2. 'amount': Extract the exact positive number in Indian Rupees (INR). Parse formats like '350', '2.5k' (=2500), '120 rs', '₹450'.\n"
            "3. 'expense_date': Resolve relative dates based on today's date (e.g., 'today' -> today, 'yesterday' -> 1 day ago, 'last Monday' -> previous Monday). Defaults to today. Must NEVER be in the future.\n"
            "4. 'payment_mode': Detect payment mode: 'upi' (Google Pay, PhonePe, Paytm, UPI), 'card' (credit card, debit card, CC), or 'cash'. If not mentioned, return null.\n"
            "5. 'suggested_category_name': Choose the MOST appropriate category for this expense.\n"
            "6. 'notes': Any additional context or location mentioned in the text.\n"
            "7. 'raw_summary': A clean one-line human summary of what was understood (e.g., '₹350 spent on Uber via UPI on 2026-09-03')."
        )

        prompt = f"Parse this expense phrase: \"{text.strip()}\""

        try:
            provider = AIFactory.get_provider()
            extracted: ParsedExpenseData = await provider.generate_structured(
                prompt=prompt,
                response_schema=ParsedExpenseData,
                system_prompt=system_instruction,
                temperature=0.1,
            )
        except Exception as ai_err:
            logger.warning(f"[AIService] AI provider parse failed ({ai_err}), using resilient rule-based NLP fallback.")
            extracted = cls._fallback_parse_expense(text=text, today=today)

        # 2. Smart category matching & resolution
        cat_id, cat_name = await cls._smart_resolve_category(
            session=session,
            user_id=user_id,
            suggested_name=extracted.suggested_category_name,
            context_text=f"{extracted.title} {text}",
            existing_categories=categories,
        )
        extracted.suggested_category_id = cat_id
        extracted.suggested_category_name = cat_name

        # 3. Guard against future date hallucination
        if extracted.expense_date > today:
            extracted.expense_date = today

        return extracted

    @classmethod
    async def chat_with_advisor(
        cls,
        session: AsyncSession,
        user_id: UUID,
        message: str,
        history: Optional[List[AIChatMessage]] = None,
    ) -> AIChatResponse:
        """
        Interactive personal financial advisor chatbot grounded in real-time user financial data.
        """
        today = date.today()
        summary = None
        comparison = None
        budget_status = None
        top_cats = "No spending recorded this month"
        recent_txs = "No recent transactions"
        overall_budget_str = "Not set"
        overspent_str = "None (All category budgets on track)"
        mom_str = "No previous month baseline available"
        overspent_list = []

        # 1. Fetch real-time user financial context safely
        try:
            summary = await DashboardService.get_summary(session, user_id, today=today)
            comparison = await DashboardService.get_compare(session, user_id, today=today)
            budget_status = await BudgetService.get_status(session, period_month=today, user_id=user_id)

            if summary and summary.top_categories:
                top_cats = ", ".join(
                    [
                        f"{c.category_name}: ₹{float(c.total_amount):.2f} ({c.percentage:.1f}%)"
                        for c in summary.top_categories
                    ]
                )

            if summary and summary.recent_expenses:
                recent_txs = "; ".join(
                    [f"{e.title} (₹{float(e.amount):.2f} on {e.expense_date})" for e in summary.recent_expenses[:5]]
                )

            if budget_status and budget_status.overall:
                overall_budget_str = (
                    f"Limit ₹{float(budget_status.overall.limit_amount):.2f}, "
                    f"Spent ₹{float(budget_status.overall.spent_amount):.2f} "
                    f"({budget_status.overall.percentage_used:.1f}%, Status: {budget_status.overall.status})"
                )

            if budget_status and budget_status.categories:
                overspent_list = [b for b in budget_status.categories if b.status == "over_budget"]
                if overspent_list:
                    overspent_str = ", ".join(
                        [f"{b.category_name} (Spent ₹{float(b.spent_amount):.2f} of ₹{float(b.limit_amount):.2f})" for b in overspent_list]
                    )

            if comparison and comparison.previous_month_total > 0:
                mom_str = f"Change from last month: {comparison.percentage_change:+.1f}%"
        except Exception as ctx_err:
            logger.warning(f"[AIService] Failed to load full context for chat: {ctx_err}")

        spent_month_val = float(summary.total_spent_current_month) if summary else 0.0
        spent_total_val = float(summary.total_spent_overall) if summary else 0.0

        grounded_context = (
            f"--- USER'S LIVE FINANCIAL PROFILE (REAL GROUND TRUTH) ---\n"
            f"Today's Date: {today.isoformat()} ({today.strftime('%B %Y')})\n"
            f"Total Spent This Month ({today.strftime('%B')}): ₹{spent_month_val:.2f}\n"
            f"Overall Monthly Budget: {overall_budget_str}\n"
            f"Month-over-Month Trend: {mom_str}\n"
            f"Top Spending Categories This Month: {top_cats}\n"
            f"Overspending Categories: {overspent_str}\n"
            f"Recent Transactions: {recent_txs}\n"
            f"Total Lifetime Spent in FinTrack: ₹{spent_total_val:.2f}\n"
            f"----------------------------------------------------------"
        )

        system_instruction = (
            "You are FinTrack AI, an intelligent, empathetic, and highly practical personal financial advisor and copilot.\n"
            "You are speaking to a user about their personal finances in India.\n\n"
            f"{grounded_context}\n\n"
            "Instructions:\n"
            "1. Ground all your advice, answers, and analysis strictly in the real financial numbers provided above. Use the Indian Rupee symbol (₹).\n"
            "2. If the user asks about their spending, budgets, savings, or habits, cite their actual categories, amounts, and percentages.\n"
            "3. Be concise, structured, and polite. Use Markdown formatting (bold numbers, bullet points, headers) for easy reading.\n"
            "4. If the user asks for suggestions to save money, give 2-3 specific, realistic, and actionable tips targeting their highest spend categories.\n"
            "5. If no data exists or spending is 0, give friendly encouragement on how to start tracking.\n"
            "6. Keep responses under 200 words unless the user explicitly asks for a detailed breakdown."
        )

        # Build prompt with history safely
        history_text = ""
        if history:
            history_lines = []
            for h in history[-6:]:  # Keep last 6 turns for context
                role_val = getattr(h, "role", None) or (h.get("role") if isinstance(h, dict) else "user")
                content_val = getattr(h, "content", None) or (h.get("content") if isinstance(h, dict) else "")
                role_label = "User" if role_val == "user" else "Advisor"
                history_lines.append(f"{role_label}: {content_val}")
            history_text = "Conversation History:\n" + "\n".join(history_lines) + "\n\n"

        prompt = f"{history_text}User: {message}\nAdvisor:"

        try:
            provider = AIFactory.get_provider()
            reply_text = await provider.generate_text(
                prompt=prompt,
                system_prompt=system_instruction,
                temperature=0.4,
                max_tokens=800,
            )
        except Exception as ai_err:
            logger.warning(f"[AIService] AI chat provider failed ({ai_err}), using grounded financial guidance fallback.")
            spent_val = f"₹{spent_month_val:.2f}"
            reply_text = (
                f"### 📊 Your Financial Snapshot\n\n"
                f"- **Total Spent This Month:** {spent_val}\n"
                f"- **Top Categories:** {top_cats}\n"
                f"- **Budget Status:** {overall_budget_str}\n\n"
                f"💡 **Tip:** Tracking your daily expenses with specific categories and setting monthly limits is the best way to optimize your savings."
            )

        # Generate smart suggested follow-up prompts
        suggested_actions = [
            "How can I cut expenses by 10%?",
            "What is my biggest expense category?",
            "Am I on track for my budget?",
        ]

        return AIChatResponse(
            reply=reply_text.strip(),
            suggested_actions=suggested_actions,
            referenced_metrics={
                "total_spent_current_month": spent_month_val,
                "top_category": (
                    summary.top_categories[0].category_name
                    if summary and summary.top_categories
                    else None
                ),
                "overspending_count": len(overspent_list),
            },
        )

    @classmethod
    async def get_spending_forecast(
        cls,
        session: AsyncSession,
        user_id: UUID,
    ) -> SpendingForecastResponse:
        """
        Generates predictive spending forecasts, statistical anomaly/spike alerts,
        and daily recommended spending allowances grounded in real user telemetry.
        """
        today = date.today()
        days_in_month = calendar.monthrange(today.year, today.month)[1]
        days_passed = max(1, today.day)
        days_remaining = max(1, days_in_month - days_passed)

        # 1. Fetch current month summary, comparison, and budgets
        summary = await DashboardService.get_summary(session, user_id, today=today)
        comparison = await DashboardService.get_compare(session, user_id, today=today)
        budget_status = await BudgetService.get_status(session, period_month=today, user_id=user_id)

        curr_spent = float(summary.total_spent_current_month)
        daily_velocity = curr_spent / days_passed
        projected_total = round(curr_spent + (daily_velocity * (days_in_month - days_passed)), 2)

        # 2. Daily safe allowance calculation
        daily_allowance = 0.0
        if budget_status.overall and budget_status.overall.limit_amount > 0:
            rem_budget = float(budget_status.overall.limit_amount) - curr_spent
            daily_allowance = max(0.0, round(rem_budget / days_remaining, 2))
        else:
            # Baseline from previous month or reasonable daily pace
            baseline = float(comparison.previous_month_total) if comparison.previous_month_total > 0 else (curr_spent * 1.2)
            rem_baseline = max(0.0, baseline - curr_spent)
            daily_allowance = round(rem_baseline / days_remaining, 2) if days_remaining > 0 else 0.0

        # 3. Category level projections & risk levels
        category_forecasts: List[ForecastCategoryItem] = []
        budget_map = {b.category_id: b for b in budget_status.categories if b.category_id}

        for cat in summary.top_categories:
            c_spent = float(cat.total_amount)
            c_burn = c_spent / days_passed
            c_predicted = round(c_spent + (c_burn * (days_in_month - days_passed)), 2)

            b_item = budget_map.get(cat.category_id)
            b_limit = float(b_item.limit_amount) if b_item else None

            p_status = "within_budget"
            r_level = "low"
            if b_limit:
                if c_predicted > b_limit:
                    p_status = "exceeded"
                    r_level = "high"
                elif c_predicted > (b_limit * 0.85):
                    p_status = "at_risk"
                    r_level = "medium"

            category_forecasts.append(
                ForecastCategoryItem(
                    category_name=cat.category_name,
                    current_spend=Decimal(str(c_spent)),
                    predicted_month_end=Decimal(str(c_predicted)),
                    budget_limit=Decimal(str(b_limit)) if b_limit is not None else None,
                    projected_status=p_status,
                    risk_level=r_level,
                )
            )

        # 4. Statistical Anomaly & Spike Detection (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        recent_txs_stmt = (
            select(Expense, Category.name.label("category_name"))
            .outerjoin(Category, Category.id == Expense.category_id)
            .where(Expense.user_id == user_id, Expense.expense_date >= thirty_days_ago)
            .order_by(Expense.expense_date.desc())
        )
        recent_txs_res = (await session.execute(recent_txs_stmt)).all()

        anomalies: List[SpendingAnomalyItem] = []
        if recent_txs_res:
            amounts = [float(e.amount) for e, _ in recent_txs_res]
            avg_tx = sum(amounts) / len(amounts) if amounts else 0.0

            for exp, cat_name in recent_txs_res:
                exp_amount = float(exp.amount)
                # Flag transactions > 2.5x mean or unusually high single spends
                if (exp_amount > 2.5 * avg_tx and exp_amount >= 500) or exp_amount > 5000:
                    multiplier = round(exp_amount / avg_tx, 1) if avg_tx > 0 else 1.0
                    severity = "high" if exp_amount > 4.0 * avg_tx or exp_amount > 7500 else "medium"
                    anomalies.append(
                        SpendingAnomalyItem(
                            title=exp.title,
                            amount=exp.amount,
                            category_name=cat_name or "Uncategorized",
                            expense_date=exp.expense_date,
                            severity=severity,
                            explanation=f"Transaction of ₹{exp_amount:,.2f} is {multiplier}x higher than your 30-day average transaction (₹{avg_tx:,.2f}).",
                        )
                    )

        # 5. Universal AI Model Synthesis (Narrative Summary & Proactive Tips)
        telemetry_text = (
            f"Month: {today.strftime('%B %Y')}, Day {days_passed} of {days_in_month} ({days_remaining} days left).\n"
            f"Current Month Spend: ₹{curr_spent:,.2f}\n"
            f"Run-Rate Projected Month-End: ₹{projected_total:,.2f}\n"
            f"Daily Velocity: ₹{daily_velocity:,.2f}/day\n"
            f"Recommended Safe Daily Spend: ₹{daily_allowance:,.2f}/day\n"
            f"Previous Month Total: ₹{float(comparison.previous_month_total):,.2f}\n"
            f"Top Categories Run-Rate: {', '.join([f'{c.category_name} (curr ₹{c.current_spend} -> proj ₹{c.predicted_month_end})' for c in category_forecasts])}\n"
            f"Detected Anomalies: {len(anomalies)} spikes found.\n"
        )

        system_prompt = (
            "You are FinTrack AI's Predictive Financial Forecaster.\n"
            "Analyze the user's spending run-rate and provide:\n"
            "1. A sharp 2-sentence executive summary of their month-end financial outlook.\n"
            "2. Exactly 3 proactive, numbered recommendations to optimize their cashflow and prevent budget overrun.\n"
            "Format your reply as JSON with keys: 'summary' (str) and 'proactive_tips' (list of 3 strings)."
        )

        class ForecastAISynthesis(BaseModel):
            summary: str
            proactive_tips: list[str]

        provider = AIFactory.get_provider()
        try:
            ai_synth: ForecastAISynthesis = await provider.generate_structured(
                prompt=f"Telemetry:\n{telemetry_text}",
                response_schema=ForecastAISynthesis,
                system_prompt=system_prompt,
                temperature=0.3,
            )
            summary_text = ai_synth.summary
            proactive_tips = ai_synth.proactive_tips
        except Exception as exc:
            logger.warning(f"[AI Forecast Synthesis Fallback] {exc}")
            summary_text = (
                f"At your current pace of ₹{daily_velocity:,.0f}/day, your estimated month-end spending will reach "
                f"₹{projected_total:,.2f}. You have {days_remaining} days remaining with a safe daily allowance of ₹{daily_allowance:,.0f}."
            )
            proactive_tips = [
                f"Keep daily discretionary spend below ₹{daily_allowance:,.0f} to avoid exceeding your baseline.",
                "Review your top categories for recurring subscriptions or unneeded purchases.",
                "Log all new cash and UPI transactions daily to maintain forecast precision.",
            ]

        return SpendingForecastResponse(
            current_month_to_date=Decimal(str(curr_spent)),
            predicted_total_month_end=Decimal(str(projected_total)),
            days_remaining=days_remaining,
            daily_recommended_spend=Decimal(str(daily_allowance)),
            historical_average_monthly=Decimal(str(float(comparison.previous_month_total))),
            confidence_score=0.92,
            summary=summary_text,
            anomalies=anomalies[:5],  # Top 5 most significant anomalies
            category_forecasts=category_forecasts,
            proactive_tips=proactive_tips,
        )

    @classmethod
    async def get_monthly_digest(
        cls,
        session: AsyncSession,
        user_id: UUID,
        month_str: Optional[str] = None,
    ) -> MonthlyDigestResponse:
        """
        Generate a comprehensive, executive-grade AI Monthly Financial Health Digest.
        Analyzes total volume, category distribution, budget adherence, leak identification,
        and strategic recommendations for the upcoming month.
        """
        today = date.today()
        if month_str:
            try:
                # Accepts 'YYYY-MM' or 'YYYY-MM-DD'
                clean_m = month_str.strip()
                if len(clean_m) == 7:
                    parts = clean_m.split("-")
                    target_date = date(int(parts[0]), int(parts[1]), 1)
                else:
                    target_date = date.fromisoformat(clean_m)
                    target_date = target_date.replace(day=1)
            except Exception:
                target_date = today.replace(day=1)
        else:
            target_date = today.replace(day=1)

        year = target_date.year
        month = target_date.month
        _, num_days = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)
        month_name = start_date.strftime("%B %Y")
        month_iso = start_date.strftime("%Y-%m")

        # 1. Fetch all expenses for this month
        exp_stmt = (
            select(Expense, Category.name.label("category_name"))
            .outerjoin(Category, Category.id == Expense.category_id)
            .where(
                Expense.user_id == user_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
            .order_by(Expense.amount.desc())
        )
        expenses_res = (await session.execute(exp_stmt)).all()

        total_spent = sum([float(e.amount) for e, _ in expenses_res])
        total_txs = len(expenses_res)
        daily_avg = total_spent / num_days if num_days > 0 else 0.0

        # Group expenses by category
        cat_map: Dict[str, float] = {}
        for exp, cat_name in expenses_res:
            cname = cat_name or "General"
            cat_map[cname] = cat_map.get(cname, 0.0) + float(exp.amount)

        sorted_categories = sorted(cat_map.items(), key=lambda x: x[1], reverse=True)

        # 2. Fetch Budget Limits
        budget_status = await BudgetService.get_status(session=session, period_month=start_date, user_id=user_id)
        overall_limit = float(budget_status.overall.limit_amount) if budget_status.overall and budget_status.overall.limit_amount else None

        # Build category budget map
        cat_budget_map: Dict[str, float] = {}
        for cb in budget_status.categories:
            if cb.limit_amount:
                cat_budget_map[cb.category_name.lower().strip()] = float(cb.limit_amount)

        # 3. Base Mathematical Health Score & Grade Calculation
        health_score = 80
        grade = "B"

        if overall_limit and overall_limit > 0:
            spent_ratio = total_spent / overall_limit
            surplus_or_deficit = overall_limit - total_spent

            if spent_ratio <= 0.65:
                health_score = 96
                grade = "A+"
            elif spent_ratio <= 0.85:
                health_score = 88
                grade = "A"
            elif spent_ratio <= 1.00:
                health_score = 76
                grade = "B"
            elif spent_ratio <= 1.15:
                health_score = 58
                grade = "C"
            else:
                health_score = max(20, int(50 - (spent_ratio - 1.15) * 40))
                grade = "D"
        else:
            surplus_or_deficit = 0.0
            if total_spent == 0:
                health_score = 75
                grade = "B"
            else:
                health_score = 82
                grade = "A"

        # 4. Generate Category Insights & Detect Leaks
        category_insights: List[CategoryDigestInsight] = []
        spending_leaks: List[SpendingLeakItem] = []

        for cname, camount in sorted_categories:
            pct = (camount / total_spent * 100.0) if total_spent > 0 else 0.0
            blimit = cat_budget_map.get(cname.lower().strip())

            c_grade = "B"
            if blimit:
                if camount <= blimit * 0.75:
                    c_grade = "A+"
                elif camount <= blimit:
                    c_grade = "A"
                elif camount <= blimit * 1.15:
                    c_grade = "C"
                else:
                    c_grade = "D"
            else:
                if pct > 40:
                    c_grade = "C"
                elif pct > 25:
                    c_grade = "B"
                else:
                    c_grade = "A"

            c_insight = (
                f"Consumed {pct:.1f}% of total monthly budget."
                + (f" Exceeded limit of ₹{blimit:,.0f} by ₹{camount - blimit:,.0f}." if blimit and camount > blimit else "")
            )

            category_insights.append(
                CategoryDigestInsight(
                    category_name=cname,
                    total_spent=Decimal(f"{camount:.2f}"),
                    budget_limit=Decimal(f"{blimit:.2f}") if blimit else None,
                    percentage_of_total=round(pct, 1),
                    grade=c_grade,
                    insight=c_insight,
                )
            )

            # Mark as spending leak if category exceeded budget or accounts for > 35% of high spend
            if (blimit and camount > blimit) or (pct > 35.0 and camount > 5000):
                leak_reason = (
                    f"Over budget by ₹{camount - blimit:,.0f} ({pct:.0f}% of total spend)."
                    if blimit and camount > blimit
                    else f"Accounts for a heavy {pct:.1f}% of entire monthly spending."
                )
                spending_leaks.append(
                    SpendingLeakItem(
                        category_name=cname,
                        amount=Decimal(f"{camount:.2f}"),
                        percentage_of_total=round(pct, 1),
                        leak_reason=leak_reason,
                    )
                )

        # 5. Call LLM for Executive Narrative & Synthesis
        telemetry_prompt = (
            f"Month: {month_name}\n"
            f"Total Spent: ₹{total_spent:,.2f}\n"
            f"Budget Limit: {f'₹{overall_limit:,.2f}' if overall_limit else 'None set'}\n"
            f"Surplus/Deficit vs Budget: ₹{surplus_or_deficit:,.2f}\n"
            f"Total Transactions: {total_txs}\n"
            f"Daily Average: ₹{daily_avg:,.2f}/day\n"
            f"Calculated Score: {health_score}/100 (Grade {grade})\n"
            f"Category Breakdown: {', '.join([f'{c}: ₹{a:,.0f} ({a/total_spent*100:.0f}%)' for c, a in sorted_categories[:5]])}\n"
        )

        system_prompt = (
            "You are FinTrack AI's Executive Financial Strategist.\n"
            "Analyze the user's completed monthly performance telemetry and generate:\n"
            "1. 'headline': A memorable, punchy 1-line summary (e.g., 'Disciplined Dining with Strong 18% Surplus in Savings').\n"
            "2. 'executive_summary': 2-3 crisp sentences highlighting money pacing, discipline, and key takeaways.\n"
            "3. 'biggest_wins': Exactly 2 to 3 bullet points of positive financial wins, smart savings, or good habits.\n"
            "4. 'action_plan_next_month': Exactly 3 high-impact, actionable financial targets for next month.\n"
            "Return valid JSON matching the schema."
        )

        class MonthlyDigestAISynthesis(BaseModel):
            headline: str
            executive_summary: str
            biggest_wins: list[str]
            action_plan_next_month: list[str]

        provider = AIFactory.get_provider()
        try:
            ai_synth: MonthlyDigestAISynthesis = await provider.generate_structured(
                prompt=f"Monthly Financial Telemetry:\n{telemetry_prompt}",
                response_schema=MonthlyDigestAISynthesis,
                system_prompt=system_prompt,
                temperature=0.3,
            )
            headline = ai_synth.headline
            executive_summary = ai_synth.executive_summary
            biggest_wins = ai_synth.biggest_wins
            action_plan = ai_synth.action_plan_next_month
        except Exception as exc:
            logger.warning(f"[Monthly Digest AI Synthesis Fallback] {exc}")
            if overall_limit and surplus_or_deficit >= 0:
                headline = f"Strong Budget Discipline with ₹{surplus_or_deficit:,.0f} in Safe Surplus"
                executive_summary = (
                    f"In {month_name}, you managed your finances effectively, spending ₹{total_spent:,.2f} "
                    f"against your ₹{overall_limit:,.2f} limit. Your disciplined daily pace of ₹{daily_avg:,.0f}/day protected your savings."
                )
                biggest_wins = [
                    f"Successfully stayed under your overall monthly budget by ₹{surplus_or_deficit:,.0f}.",
                    f"Maintained an efficient average daily burn rate of ₹{daily_avg:,.0f}/day.",
                ]
            elif overall_limit and surplus_or_deficit < 0:
                headline = f"Budget Ceilings Strained by ₹{abs(surplus_or_deficit):,.0f}"
                executive_summary = (
                    f"In {month_name}, total spending reached ₹{total_spent:,.2f}, exceeding your budget limit of "
                    f"₹{overall_limit:,.2f}. Reviewing top discretionary leaks will help restore your savings rate next month."
                )
                biggest_wins = [
                    f"Actively tracked {total_txs} transactions with complete visibility across categories.",
                ]
            else:
                headline = f"{month_name} Financial Review: ₹{total_spent:,.0f} Logged across {total_txs} Transactions"
                executive_summary = (
                    f"You recorded a total expenditure of ₹{total_spent:,.2f} in {month_name} at an average of "
                    f"₹{daily_avg:,.0f} per day. Setting category budget limits will help unlock automated savings targets."
                )
                biggest_wins = [
                    f"Consistent tracking across {len(sorted_categories)} active spending categories.",
                ]

            top_cat_name = sorted_categories[0][0] if sorted_categories else "General"
            action_plan = [
                f"Set a target to reduce spending on {top_cat_name} by 10% in the upcoming month.",
                "Conduct a 2-day zero discretionary spend challenge in the middle of next month.",
                "Review and log daily cash and UPI expenses consistently to keep your score above 85.",
            ]

        return MonthlyDigestResponse(
            month=month_iso,
            month_name=month_name,
            health_score=health_score,
            grade=grade,
            headline=headline,
            executive_summary=executive_summary,
            total_spent=Decimal(f"{total_spent:.2f}"),
            budget_limit=Decimal(f"{overall_limit:.2f}") if overall_limit else None,
            savings_or_deficit=Decimal(f"{surplus_or_deficit:.2f}"),
            total_transactions=total_txs,
            daily_average=Decimal(f"{daily_avg:.2f}"),
            top_spending_leaks=spending_leaks[:3],
            biggest_wins=biggest_wins[:4],
            action_plan_next_month=action_plan[:3],
            category_insights=category_insights[:8],
        )

    @classmethod
    async def simulate_affordability(
        cls,
        session: AsyncSession,
        user_id: UUID,
        payload: AffordabilityRequest,
    ) -> AffordabilityResponse:
        """
        Simulate purchase affordability against current month budget, category headroom,
        safe daily spending limits, and projected month-end surplus.
        """
        today = date.today()
        year = today.year
        month = today.month
        _, num_days = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)
        days_remaining = max(1, num_days - today.day + 1)

        # 1. Fetch current month expenses
        exp_stmt = (
            select(Expense, Category.name.label("category_name"), Expense.category_id)
            .outerjoin(Category, Category.id == Expense.category_id)
            .where(
                Expense.user_id == user_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        )
        expenses_res = (await session.execute(exp_stmt)).all()

        total_spent = sum([float(e.amount) for e, _, _ in expenses_res])

        # Category mapping
        target_cat_name = "General"
        target_cat_spent = 0.0

        if payload.category_id:
            for e, cat_name, cat_id in expenses_res:
                if cat_id == payload.category_id:
                    target_cat_spent += float(e.amount)
                    if cat_name:
                        target_cat_name = cat_name
        elif payload.category_name:
            target_cat_name = payload.category_name.strip()
            for e, cat_name, _ in expenses_res:
                if cat_name and cat_name.lower() == target_cat_name.lower():
                    target_cat_spent += float(e.amount)

        # 2. Fetch Budgets
        budget_status = await BudgetService.get_status(session=session, period_month=start_date, user_id=user_id)
        overall_limit = float(budget_status.overall.limit_amount) if budget_status.overall and budget_status.overall.limit_amount else None

        cat_limit: Optional[float] = None
        for cb in budget_status.categories:
            if payload.category_id and cb.category_id == payload.category_id:
                cat_limit = float(cb.limit_amount) if cb.limit_amount else None
                break
            elif cb.category_name.lower() == target_cat_name.lower():
                cat_limit = float(cb.limit_amount) if cb.limit_amount else None
                break

        # 3. Calculate purchase impact
        item_cost = float(payload.amount)
        is_emi = payload.payment_method == "emi"
        emi_months = max(1, payload.emi_months or 3) if is_emi else 1
        monthly_deduction = (item_cost / emi_months) if is_emi else item_cost

        new_total_spent = total_spent + monthly_deduction
        new_cat_spent = target_cat_spent + monthly_deduction

        cat_remaining_after = (cat_limit - new_cat_spent) if cat_limit is not None else None
        overall_remaining_after = (overall_limit - new_total_spent) if overall_limit is not None else None

        daily_budget_before = max(0.0, (overall_limit - total_spent) / days_remaining) if overall_limit else 0.0
        daily_budget_after = max(0.0, ((overall_limit - new_total_spent) / days_remaining)) if overall_limit else 0.0

        # 4. Determine mathematical verdict & score
        score = 80
        verdict = "SAFE_TO_BUY"

        if overall_limit and overall_limit > 0:
            spent_ratio_after = new_total_spent / overall_limit
            if spent_ratio_after <= 0.75:
                verdict = "SAFE_TO_BUY"
                score = int(95 - (spent_ratio_after * 20))
            elif spent_ratio_after <= 0.95:
                verdict = "CAUTION"
                score = int(70 - ((spent_ratio_after - 0.75) * 100))
            elif spent_ratio_after <= 1.05:
                verdict = "CAUTION"
                score = 45
            else:
                verdict = "NOT_RECOMMENDED"
                overrun_pct = (spent_ratio_after - 1.0) * 100
                score = max(10, int(35 - overrun_pct))
        else:
            # Fallback when no overall budget is set
            if total_spent > 0:
                cost_ratio = monthly_deduction / total_spent
                if cost_ratio <= 0.20:
                    verdict = "SAFE_TO_BUY"
                    score = 85
                elif cost_ratio <= 0.50:
                    verdict = "CAUTION"
                    score = 60
                else:
                    verdict = "NOT_RECOMMENDED"
                    score = 35
            else:
                verdict = "SAFE_TO_BUY"
                score = 80

        # Adjust for category budget if exceeded
        if cat_limit and cat_remaining_after is not None and cat_remaining_after < 0:
            if verdict == "SAFE_TO_BUY":
                verdict = "CAUTION"
                score = max(50, score - 20)

        # 5. LLM Prompt for qualitative insights & alternatives
        prompt = f"""
You are FinTrack's Chief Financial Officer and AI Affordability Advisor.
Evaluate whether the user can afford the following purchase this month based on their real financial numbers:

PURCHASE DETAILS:
- Item: "{payload.item_name}"
- Total Price: ₹{item_cost:,.2f}
- Payment Mode: {"EMI (" + str(emi_months) + " months)" if is_emi else "One-Time Payment"}
- Immediate Monthly Burden: ₹{monthly_deduction:,.2f}
- Target Category: "{target_cat_name}"

USER'S BUDGET CONTEXT:
- Total Spent This Month So Far: ₹{total_spent:,.2f}
- Overall Monthly Budget Limit: {f"₹{overall_limit:,.2f}" if overall_limit else "Not Configured"}
- Overall Remaining After Purchase: {f"₹{overall_remaining_after:,.2f}" if overall_remaining_after is not None else "N/A"}
- Category Budget Limit: {f"₹{cat_limit:,.2f}" if cat_limit else "None"}
- Category Remaining After Purchase: {f"₹{cat_remaining_after:,.2f}" if cat_remaining_after is not None else "N/A"}
- Daily Safe Spending Before Purchase: ₹{daily_budget_before:,.2f}/day
- Daily Safe Spending After Purchase: ₹{daily_budget_after:,.2f}/day
- Days Remaining in Month: {days_remaining} days
- Mathematical Score: {score}/100, Base Verdict: {verdict}

OUTPUT REQUIREMENTS:
Return a JSON object with:
1. "verdict_title": A punchy, empathetic, 1-line verdict headline.
2. "verdict_description": 2-3 sentences explaining clear reasons in plain English.
3. "recommendations": A list of 2-3 specific tactical tips or guardrails.
4. "alternative_strategies": A list of 2-3 smart alternatives (e.g. waiting until salary day, switching to no-cost EMI, cutting specific dining/shopping budgets).
"""

        class LLMAffordabilityOutput(BaseModel):
            verdict_title: str
            verdict_description: str
            recommendations: List[str]
            alternative_strategies: List[str]

        try:
            provider = AIFactory.get_provider()
            llm_res = await provider.generate_structured(
                prompt=prompt,
                response_schema=LLMAffordabilityOutput,
                system_instruction="You are an expert personal financial advisor evaluating purchase affordability.",
            )
            verdict_title = llm_res.verdict_title
            verdict_description = llm_res.verdict_description
            recommendations = llm_res.recommendations
            alternative_strategies = llm_res.alternative_strategies
        except Exception as exc:
            logger.warning(f"[Affordability LLM Fallback] {exc}")
            if verdict == "SAFE_TO_BUY":
                verdict_title = f"Safe to Buy: ₹{item_cost:,.0f} fits comfortably in your budget"
                verdict_description = (
                    f"Purchasing '{payload.item_name}' for ₹{monthly_deduction:,.2f} will leave you with ample buffer for "
                    f"the remaining {days_remaining} days of the month without breaking your financial goals."
                )
                recommendations = [
                    f"Your safe daily spending allowance remains healthy at ₹{daily_budget_after:,.0f}/day.",
                    "Log the transaction immediately upon purchase to keep budget charts synchronized.",
                ]
                alternative_strategies = [
                    "Check for instant bank discount cards or cashback offers at checkout.",
                    "Consider setting aside a small emergency buffer for upcoming bills.",
                ]
            elif verdict == "CAUTION":
                verdict_title = f"Proceed with Caution: ₹{item_cost:,.0f} will tighten your cash flow"
                verdict_description = (
                    f"Buying '{payload.item_name}' is possible, but it will reduce your safe daily allowance from "
                    f"₹{daily_budget_before:,.0f}/day down to ₹{daily_budget_after:,.0f}/day for the next {days_remaining} days."
                )
                recommendations = [
                    f"Trim discretionary dining or shopping expenses by ₹{monthly_deduction * 0.3:,.0f} to offset this.",
                    f"Maintain a strict daily ceiling of ₹{daily_budget_after:,.0f}/day until month end.",
                ]
                alternative_strategies = [
                    f"Spread the cost across a {max(3, emi_months)}-month no-cost EMI to reduce monthly burden to ₹{item_cost / max(3, emi_months):,.0f}/mo.",
                    f"Wait {min(15, days_remaining)} days until next month's salary credit before purchasing.",
                ]
            else:
                verdict_title = f"Not Recommended: ₹{item_cost:,.0f} will cause budget deficit"
                verdict_description = (
                    f"Purchasing '{payload.item_name}' now will exceed your available budget by "
                    f"₹{abs(overall_remaining_after or 0):,.2f} and risk cashflow stress before the month ends."
                )
                recommendations = [
                    "Postpone this discretionary purchase until your next income cycle.",
                    "Avoid using high-interest credit card debt or non-essential loans for this item.",
                ]
                alternative_strategies = [
                    f"Create a dedicated savings sinking fund of ₹{item_cost / 3:,.0f}/month for 3 months.",
                    "Look for refurbished, open-box, or seasonal discount alternatives.",
                ]

        impact_data = AffordabilityImpact(
            current_category_spent=Decimal(f"{target_cat_spent:.2f}"),
            category_budget_limit=Decimal(f"{cat_limit:.2f}") if cat_limit is not None else None,
            category_remaining_after=Decimal(f"{cat_remaining_after:.2f}") if cat_remaining_after is not None else None,
            overall_spent=Decimal(f"{total_spent:.2f}"),
            overall_budget_limit=Decimal(f"{overall_limit:.2f}") if overall_limit is not None else None,
            overall_remaining_after=Decimal(f"{overall_remaining_after:.2f}") if overall_remaining_after is not None else None,
            daily_budget_before=Decimal(f"{daily_budget_before:.2f}"),
            daily_budget_after=Decimal(f"{daily_budget_after:.2f}"),
            days_remaining_in_month=days_remaining,
        )

        return AffordabilityResponse(
            verdict=verdict,
            verdict_title=verdict_title,
            verdict_description=verdict_description,
            item_name=payload.item_name,
            amount=Decimal(f"{item_cost:.2f}"),
            monthly_commitment=Decimal(f"{monthly_deduction:.2f}"),
            affordability_score=score,
            impact=impact_data,
            recommendations=recommendations,
            alternative_strategies=alternative_strategies,
        )

    @classmethod
    async def generate_smart_budget(
        cls,
        session: AsyncSession,
        user_id: UUID,
        payload: AutoBudgetGenerateRequest,
    ) -> SmartBudgetPlanResponse:
        """
        Synthesize an automated 50/30/20 smart budget allocation based on user's active categories,
        historical spending behavior, and lifestyle mode.
        """
        today = date.today()
        ninety_days_ago = today - timedelta(days=90)

        # 1. Fetch user categories
        user_categories = await CategoryService.get_all_with_counts(session, user_id)

        # 2. Fetch last 90-day expenses to compute category baseline
        exp_stmt = select(Expense).where(
            Expense.user_id == user_id,
            Expense.expense_date >= ninety_days_ago,
        )
        expenses = (await session.execute(exp_stmt)).scalars().all()

        cat_spend_map: Dict[UUID, float] = {}
        for exp in expenses:
            if exp.category_id:
                cat_spend_map[exp.category_id] = cat_spend_map.get(exp.category_id, 0.0) + float(exp.amount)

        # Monthly run rate per category (over 3 months)
        cat_monthly_avg = {cid: total / 3.0 for cid, total in cat_spend_map.items()}
        total_monthly_historical = sum(cat_monthly_avg.values())

        # 3. Determine income baseline
        if payload.monthly_income and payload.monthly_income > 0:
            income_basis = float(payload.monthly_income)
        elif total_monthly_historical > 0:
            income_basis = max(25000.0, round((total_monthly_historical * 1.33) / 1000.0) * 1000.0)
        else:
            income_basis = 35000.0

        # 4. Lifestyle & Savings Ratios
        lifestyle = (payload.lifestyle_mode or "balanced").lower().strip()
        savings_pct = payload.savings_target_percentage or 20

        if lifestyle == "frugal":
            needs_pct = 0.60
            wants_pct = max(0.10, 1.0 - needs_pct - (savings_pct / 100.0))
        elif lifestyle == "growth":
            needs_pct = 0.40
            wants_pct = max(0.20, 1.0 - needs_pct - (savings_pct / 100.0))
        else:  # balanced
            needs_pct = 0.50
            wants_pct = max(0.20, (100 - 50 - savings_pct) / 100.0)

        needs_total = income_basis * needs_pct
        wants_total = income_basis * wants_pct
        savings_total = income_basis * (savings_pct / 100.0)
        overall_limit = needs_total + wants_total

        # 5. Bucket classification
        NEEDS_KEYWORDS = {
            "grocery", "groceries", "food", "rent", "utility", "utilities", "electricity",
            "water", "gas", "cylinder", "wifi", "internet", "phone", "mobile", "recharge",
            "fuel", "petrol", "diesel", "transport", "commute", "bus", "metro", "train",
            "medical", "medicine", "doctor", "health", "hospital", "pharmacy", "education",
            "school", "fees", "insurance", "emi", "loan", "maintenance", "maid"
        }

        recommendations: List[CategoryBudgetRecommendation] = []
        needs_cats: List[Tuple[Any, float]] = []
        wants_cats: List[Tuple[Any, float]] = []

        for cat in user_categories:
            cname = cat.name.lower()
            hist = cat_monthly_avg.get(cat.id, 0.0)
            is_need = any(kw in cname for kw in NEEDS_KEYWORDS)
            if is_need:
                needs_cats.append((cat, hist))
            else:
                wants_cats.append((cat, hist))

        # Distribute Needs allocation
        total_hist_needs = sum([h for _, h in needs_cats]) or 1.0
        for cat, hist in needs_cats:
            if total_hist_needs > 1.0:
                share = hist / total_hist_needs
                suggested = max(1000.0, round((needs_total * share) / 500.0) * 500.0)
            else:
                suggested = max(1000.0, round((needs_total / max(1, len(needs_cats))) / 500.0) * 500.0)
            recommendations.append(
                CategoryBudgetRecommendation(
                    category_id=cat.id,
                    category_name=cat.name,
                    bucket_type="needs",
                    recommended_limit=Decimal(f"{suggested:.2f}"),
                    historical_average=Decimal(f"{hist:.2f}"),
                    rationale=f"Essential need: Allocated {suggested/income_basis*100:.1f}% of income with buffer for inflation.",
                )
            )

        # Distribute Wants allocation
        total_hist_wants = sum([h for _, h in wants_cats]) or 1.0
        for cat, hist in wants_cats:
            if total_hist_wants > 1.0:
                share = hist / total_hist_wants
                suggested = max(500.0, round((wants_total * share) / 500.0) * 500.0)
            else:
                suggested = max(500.0, round((wants_total / max(1, len(wants_cats))) / 500.0) * 500.0)
            recommendations.append(
                CategoryBudgetRecommendation(
                    category_id=cat.id,
                    category_name=cat.name,
                    bucket_type="wants",
                    recommended_limit=Decimal(f"{suggested:.2f}"),
                    historical_average=Decimal(f"{hist:.2f}"),
                    rationale=f"Discretionary lifestyle: Capped to protect your ₹{savings_total:,.0f} savings goal.",
                )
            )

        # 6. LLM Philosophy & Actionable Milestones
        prompt = f"""
You are FinTrack's Chief Financial Planner.
Synthesize an inspiring, practical 50/30/20 financial philosophy and roadmap for this user:

FINANCIAL BASIS:
- Estimated Monthly Income: ₹{income_basis:,.2f}
- Needs Budget ({int(needs_pct*100)}%): ₹{needs_total:,.2f}
- Wants Budget ({int(wants_pct*100)}%): ₹{wants_total:,.2f}
- Savings & Investment Target ({savings_pct}%): ₹{savings_total:,.2f}
- Overall Spending Limit: ₹{overall_limit:,.2f}
- Lifestyle Strategy Mode: "{lifestyle}"

OUTPUT REQUIREMENTS:
Return a JSON object with:
1. "ai_financial_philosophy": 2-3 inspiring sentences explaining the strategy and long-term wealth impact.
2. "actionable_milestones": 3-4 concrete actionable steps (e.g. automating savings on 1st of month, setting category alerts).
"""

        class LLMBudgetOutput(BaseModel):
            ai_financial_philosophy: str
            actionable_milestones: List[str]

        try:
            provider = AIFactory.get_provider()
            llm_res = await provider.generate_structured(
                prompt=prompt,
                response_schema=LLMBudgetOutput,
                system_instruction="You are a certified financial planner providing 50/30/20 auto-budget recommendations.",
            )
            philosophy = llm_res.ai_financial_philosophy
            milestones = llm_res.actionable_milestones
        except Exception as exc:
            logger.warning(f"[Smart Budget LLM Fallback] {exc}")
            philosophy = (
                f"Following this {lifestyle} plan commits ₹{savings_total:,.0f} each month toward your emergency fund "
                f"and wealth creation while giving you complete freedom to spend ₹{wants_total:,.0f} on lifestyle without guilt."
            )
            milestones = [
                f"Automate a ₹{savings_total:,.0f} transfer into high-yield savings or SIP immediately on salary credit day.",
                "Review category limits weekly to prevent unexpected end-of-month budget crunches.",
                "Utilize the 48-hour rule for any discretionary wants over ₹2,000.",
            ]

        return SmartBudgetPlanResponse(
            monthly_income_basis=Decimal(f"{income_basis:.2f}"),
            needs_allocation=Decimal(f"{needs_total:.2f}"),
            wants_allocation=Decimal(f"{wants_total:.2f}"),
            savings_allocation=Decimal(f"{savings_total:.2f}"),
            overall_recommended_limit=Decimal(f"{overall_limit:.2f}"),
            categories=recommendations,
            ai_financial_philosophy=philosophy,
            actionable_milestones=milestones,
        )

    @classmethod
    async def apply_smart_budget(
        cls,
        session: AsyncSession,
        user_id: UUID,
        payload: ApplySmartBudgetRequest,
    ) -> Dict[str, Any]:
        """
        Persist and apply the recommended budget limits directly to user's database.
        """
        period_month = payload.period_month or date.today().replace(day=1)
        applied_count = 0

        # 1. Apply overall limit if present
        if payload.overall_limit and payload.overall_limit > 0:
            await BudgetService.upsert(
                session=session,
                data=BudgetCreate(
                    category_id=None,
                    limit_amount=payload.overall_limit,
                    period_month=period_month,
                ),
                user_id=user_id,
            )
            applied_count += 1

        # 2. Apply category limits
        for item in payload.category_budgets:
            if item.limit_amount and item.limit_amount > 0:
                await BudgetService.upsert(
                    session=session,
                    data=BudgetCreate(
                        category_id=item.category_id,
                        limit_amount=item.limit_amount,
                        period_month=period_month,
                    ),
                    user_id=user_id,
                )
                applied_count += 1

        return {
            "period_month": period_month.isoformat(),
            "applied_count": applied_count,
            "message": f"Successfully applied {applied_count} budget limits for {period_month.strftime('%B %Y')}.",
        }





