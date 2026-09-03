import logging
from datetime import date
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.ai import (
    AIChatMessage,
    AIChatResponse,
    ParsedExpenseData,
    ScannedReceiptData,
)
from app.services.ai.factory import AIFactory
from app.services.budget_service import BudgetService
from app.services.dashboard_service import DashboardService

logger = logging.getLogger(__name__)


class AIService:
    """
    High-level AI service orchestrating business domain logic and LLM adapters.
    """

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
        categories_context = ", ".join(category_names) if category_names else "General, Food, Groceries, Transport, Bills, Shopping, Other"

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

        # 2. Match extracted category against user's actual categories
        if extracted.suggested_category_name and categories:
            s_name_lower = extracted.suggested_category_name.strip().lower()
            matched_cat: Optional[Category] = None

            # Exact or substring match
            for cat in categories:
                c_name_lower = cat.name.lower()
                if c_name_lower == s_name_lower or s_name_lower in c_name_lower or c_name_lower in s_name_lower:
                    matched_cat = cat
                    break

            if matched_cat:
                extracted.suggested_category_id = matched_cat.id
                extracted.suggested_category_name = matched_cat.name
            elif categories:
                # Fallback to first category if no match
                extracted.suggested_category_id = categories[0].id
                extracted.suggested_category_name = categories[0].name

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
        categories_context = ", ".join(category_names) if category_names else "General, Food, Groceries, Transport, Bills, Shopping, Other"

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
            "5. 'suggested_category_name': Choose the MOST appropriate category from the user's category list above.\n"
            "6. 'notes': Any additional context or location mentioned in the text.\n"
            "7. 'raw_summary': A clean one-line human summary of what was understood (e.g., '₹350 spent on Uber via UPI on 2026-09-03')."
        )

        prompt = f"Parse this expense phrase: \"{text.strip()}\""

        provider = AIFactory.get_provider()
        extracted: ParsedExpenseData = await provider.generate_structured(
            prompt=prompt,
            response_schema=ParsedExpenseData,
            system_prompt=system_instruction,
            temperature=0.1,
        )

        # 2. Match extracted category against user's actual categories
        if extracted.suggested_category_name and categories:
            s_name_lower = extracted.suggested_category_name.strip().lower()
            matched_cat: Optional[Category] = None

            for cat in categories:
                c_name_lower = cat.name.lower()
                if c_name_lower == s_name_lower or s_name_lower in c_name_lower or c_name_lower in s_name_lower:
                    matched_cat = cat
                    break

            if matched_cat:
                extracted.suggested_category_id = matched_cat.id
                extracted.suggested_category_name = matched_cat.name
            elif categories:
                extracted.suggested_category_id = categories[0].id
                extracted.suggested_category_name = categories[0].name

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
        # 1. Fetch real-time user financial context
        today = date.today()
        summary = await DashboardService.get_summary(session, user_id, today=today)
        comparison = await DashboardService.get_compare(session, user_id, today=today)
        budget_status = await BudgetService.get_status(session, period_month=today, user_id=user_id)

        # 2. Format grounding snapshot
        top_cats = (
            ", ".join(
                [
                    f"{c.category_name}: ₹{float(c.total_amount):.2f} ({c.percentage:.1f}%)"
                    for c in summary.top_categories
                ]
            )
            if summary.top_categories
            else "No spending recorded this month"
        )
        recent_txs = (
            "; ".join([f"{e.title} (₹{float(e.amount):.2f} on {e.expense_date})" for e in summary.recent_expenses[:5]])
            if summary.recent_expenses
            else "No recent transactions"
        )

        overall_budget_str = "Not set"
        if budget_status.overall:
            overall_budget_str = (
                f"Limit ₹{float(budget_status.overall.limit_amount):.2f}, "
                f"Spent ₹{float(budget_status.overall.spent_amount):.2f} "
                f"({budget_status.overall.percentage_used:.1f}%, Status: {budget_status.overall.status})"
            )

        overspent_list = [b for b in budget_status.categories if b.status == "over_budget"]
        overspent_str = (
            ", ".join([f"{b.category_name} (Spent ₹{float(b.spent_amount):.2f} of ₹{float(b.limit_amount):.2f})" for b in overspent_list])
            if overspent_list
            else "None (All category budgets on track)"
        )

        mom_str = (
            f"Change from last month: {comparison.percentage_change:+.1f}%"
            if comparison.previous_month_total > 0
            else "No previous month baseline available"
        )

        grounded_context = (
            f"--- USER'S LIVE FINANCIAL PROFILE (REAL GROUND TRUTH) ---\n"
            f"Today's Date: {today.isoformat()} ({today.strftime('%B %Y')})\n"
            f"Total Spent This Month ({today.strftime('%B')}): ₹{float(summary.total_spent_current_month):.2f}\n"
            f"Overall Monthly Budget: {overall_budget_str}\n"
            f"Month-over-Month Trend: {mom_str}\n"
            f"Top Spending Categories This Month: {top_cats}\n"
            f"Overspending Categories: {overspent_str}\n"
            f"Recent Transactions: {recent_txs}\n"
            f"Total Lifetime Spent in FinTrack: ₹{float(summary.total_spent_overall):.2f}\n"
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

        # Build prompt with history
        history_text = ""
        if history:
            history_lines = []
            for h in history[-6:]:  # Keep last 6 turns for context
                role_label = "User" if h.role == "user" else "Advisor"
                history_lines.append(f"{role_label}: {h.content}")
            history_text = "Conversation History:\n" + "\n".join(history_lines) + "\n\n"

        prompt = f"{history_text}User: {message}\nAdvisor:"

        provider = AIFactory.get_provider()
        reply_text = await provider.generate_text(
            prompt=prompt,
            system_prompt=system_instruction,
            temperature=0.4,
            max_tokens=800,
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
                "total_spent_current_month": float(summary.total_spent_current_month),
                "top_category": (
                    summary.top_categories[0].category_name
                    if summary.top_categories
                    else None
                ),
                "overspending_count": len(overspent_list),
            },
        )


