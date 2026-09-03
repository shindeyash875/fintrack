import calendar
import logging
import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.expense import Expense
from app.schemas.ai import (
    AIChatMessage,
    AIChatResponse,
    ForecastCategoryItem,
    ParsedExpenseData,
    ScannedReceiptData,
    SpendingAnomalyItem,
    SpendingForecastResponse,
)
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



