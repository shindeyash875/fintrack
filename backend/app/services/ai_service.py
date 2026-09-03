import logging
from datetime import date
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.ai import ParsedExpenseData, ScannedReceiptData
from app.services.ai.factory import AIFactory

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

