import asyncio
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import date
from sqlalchemy import select, delete, or_
from app.db.session import async_session_factory
from app.models.category import Category
from app.models.expense import Expense
from app.models.budget import Budget
from app.db.seed import STARTER_CATEGORIES


async def clean_development_database():
    """
    Safely purges ONLY confirmed test-generated records from the fintrack development database.
    Strictly preserves all 8 starter categories and any legitimate user-created data.
    """
    print("=" * 60)
    print("FINTRACK DEVELOPMENT DATABASE CLEANUP")
    print("=" * 60)

    async with async_session_factory() as session:
        # 1. Identify test categories
        cat_stmt = select(Category).where(
            or_(
                Category.name.like("SourceCat_%"),
                Category.name.like("TargetCat_%"),
                Category.name.like("E2E Cat %"),
                Category.name == "Travel",  # Created during CSV import tests
            )
        )
        cat_res = await session.execute(cat_stmt)
        test_categories = cat_res.scalars().all()
        test_cat_ids = [c.id for c in test_categories]
        test_cat_names = [c.name for c in test_categories]

        print(f"Found {len(test_categories)} test-generated categories:")
        for name in test_cat_names:
            print(f"  - {name}")

        # 2. Identify test expenses
        exp_filter = or_(
            Expense.title.like("E2E Dinner%"),
            Expense.title.like("JSON Test Expense%"),
            Expense.title.like("Test Import%"),
            Expense.title.like("Test Grocery%"),
            Expense.title.like("Test Fuel%"),
            Expense.title.like("Major Equipment%"),
            Expense.category_id.in_(test_cat_ids) if test_cat_ids else False,
        )
        exp_stmt = select(Expense).where(exp_filter)
        exp_res = await session.execute(exp_stmt)
        test_expenses = exp_res.scalars().all()
        print(f"\nFound {len(test_expenses)} test-generated expenses to delete.")

        # 3. Identify test budgets
        budget_filter = or_(
            Budget.category_id.in_(test_cat_ids) if test_cat_ids else False,
            Budget.period_month == date(2025, 6, 1),  # Test month used in test_budgets.py
        )
        b_stmt = select(Budget).where(budget_filter)
        b_res = await session.execute(b_stmt)
        test_budgets = b_res.scalars().all()
        print(f"Found {len(test_budgets)} test-generated budgets to delete.")

        # Delete test expenses
        if test_expenses:
            for exp in test_expenses:
                await session.delete(exp)
            print(f"-> Deleted {len(test_expenses)} test expenses.")

        # Delete test budgets
        if test_budgets:
            for b in test_budgets:
                await session.delete(b)
            print(f"-> Deleted {len(test_budgets)} test budgets.")

        # Delete test categories
        if test_categories:
            for cat in test_categories:
                await session.delete(cat)
            print(f"-> Deleted {len(test_categories)} test categories.")

        await session.commit()
        print("\n[SUCCESS] Cleanup transaction successfully committed.")

        # 4. Final verification of remaining categories
        remaining_cats_res = await session.execute(select(Category.name).order_by(Category.name))
        remaining_cats = remaining_cats_res.scalars().all()
        print("\nRemaining Categories in Development Database:")
        for r_name in remaining_cats:
            is_starter = "[Starter]" if r_name in STARTER_CATEGORIES else "[User]"
            print(f"  {is_starter} {r_name}")

        remaining_exp_res = await session.execute(select(Expense.id))
        print(f"\nRemaining Expenses in Development Database: {len(remaining_exp_res.all())}")

        remaining_b_res = await session.execute(select(Budget.id))
        print(f"Remaining Budgets in Development Database: {len(remaining_b_res.all())}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(clean_development_database())
