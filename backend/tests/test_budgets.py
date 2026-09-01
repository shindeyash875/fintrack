from datetime import date
from decimal import Decimal
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_overall_budget_crud_and_status(auth_client: AsyncClient):
    # Use an isolated test month to avoid interference from other tests
    test_month = date(2025, 6, 1)
    test_month_str = test_month.isoformat()
    budget_id = None
    exp1_id = None
    exp2_id = None

    try:
        # 1. Create Overall Monthly Budget
        budget_payload = {
            "category_id": None,
            "period_month": test_month_str,
            "limit_amount": 5000.00,
        }
        res = await auth_client.post("/api/v1/budgets", json=budget_payload)
        assert res.status_code == 201
        budget_data = res.json()["data"]
        budget_id = budget_data["id"]
        assert budget_data["category_id"] is None
        assert float(budget_data["limit_amount"]) == 5000.00

        # 2. List budgets for this month
        list_res = await auth_client.get(f"/api/v1/budgets?period_month={test_month_str}")
        assert list_res.status_code == 200
        items = list_res.json()["data"]
        assert any(b["id"] == budget_id for b in items)

        # 3. Check status before any expense (0% used, on_track)
        status_res = await auth_client.get(f"/api/v1/budgets/status?period_month={test_month_str}")
        assert status_res.status_code == 200
        status_data = status_res.json()["data"]
        assert status_data["overall"] is not None
        assert status_data["overall"]["status"] == "on_track"
        assert float(status_data["overall"]["spent_amount"]) == 0.00
        assert float(status_data["overall"]["remaining_amount"]) == 5000.00
        assert status_data["overall"]["percentage_used"] == 0.00

        # 4. Create an expense that pushes spend to near_limit (85%)
        cat_res = await auth_client.get("/api/v1/categories")
        category_id = cat_res.json()["data"][0]["id"]

        exp1_res = await auth_client.post(
            "/api/v1/expenses",
            json={
                "title": "Major Equipment",
                "category_id": category_id,
                "amount": 4250.00,
                "expense_date": date(2025, 6, 15).isoformat(),
            },
        )
        assert exp1_res.status_code == 201
        exp1_id = exp1_res.json()["data"]["id"]

        # Check status -> near_limit (85% used)
        status_res = await auth_client.get(f"/api/v1/budgets/status?period_month={test_month_str}")
        status_data = status_res.json()["data"]
        assert status_data["overall"]["status"] == "near_limit"
        assert status_data["overall"]["percentage_used"] == 85.0
        assert float(status_data["overall"]["remaining_amount"]) == 750.00

        # 5. Create another expense that exceeds the budget (> 100%)
        exp2_res = await auth_client.post(
            "/api/v1/expenses",
            json={
                "title": "Extra Cost",
                "category_id": category_id,
                "amount": 1000.00,
                "expense_date": date(2025, 6, 20).isoformat(),
            },
        )
        assert exp2_res.status_code == 201
        exp2_id = exp2_res.json()["data"]["id"]

        # Check status -> over_budget (> 100%, remaining < 0)
        status_res = await auth_client.get(f"/api/v1/budgets/status?period_month={test_month_str}")
        status_data = status_res.json()["data"]
        assert status_data["overall"]["status"] == "over_budget"
        assert float(status_data["overall"]["remaining_amount"]) == -250.00
        assert status_data["overall"]["percentage_used"] == 105.0

    finally:
        # Guaranteed cleanup
        if exp1_id:
            await auth_client.delete(f"/api/v1/expenses/{exp1_id}")
        if exp2_id:
            await auth_client.delete(f"/api/v1/expenses/{exp2_id}")
        if budget_id:
            del_res = await auth_client.delete(f"/api/v1/budgets/{budget_id}")
            assert del_res.status_code == 200
            assert del_res.json()["data"]["deleted"] is True


@pytest.mark.asyncio
async def test_category_budget_crud_and_status(auth_client: AsyncClient):
    test_month = date(2025, 7, 1)
    test_month_str = test_month.isoformat()
    budget_id = None
    exp_id = None

    try:
        # Get a category
        cat_res = await auth_client.get("/api/v1/categories")
        assert cat_res.status_code == 200
        category = cat_res.json()["data"][0]
        category_id = category["id"]

        # 1. Create category budget
        payload = {
            "category_id": category_id,
            "period_month": test_month_str,
            "limit_amount": 1500.00,
        }
        create_res = await auth_client.post("/api/v1/budgets", json=payload)
        assert create_res.status_code == 201
        budget_id = create_res.json()["data"]["id"]
        assert create_res.json()["data"]["category_id"] == category_id
        assert float(create_res.json()["data"]["limit_amount"]) == 1500.00

        # 2. Update category budget limit (upsert)
        payload["limit_amount"] = 2000.00
        update_res = await auth_client.post("/api/v1/budgets", json=payload)
        assert update_res.status_code == 201
        assert update_res.json()["data"]["id"] == budget_id
        assert float(update_res.json()["data"]["limit_amount"]) == 2000.00

        # 3. Check status includes this category (0% used)
        status_res = await auth_client.get(f"/api/v1/budgets/status?period_month={test_month_str}")
        assert status_res.status_code == 200
        cat_status = next(
            (c for c in status_res.json()["data"]["categories"] if c["category_id"] == category_id),
            None,
        )
        assert cat_status is not None
        assert cat_status["category_name"] == category["name"]
        assert float(cat_status["limit_amount"]) == 2000.00
        assert cat_status["status"] == "on_track"
        assert float(cat_status["spent_amount"]) == 0.00

        # 4. Add expense for this category
        exp_res = await auth_client.post(
            "/api/v1/expenses",
            json={
                "title": "Category specific expense",
                "category_id": category_id,
                "amount": 1800.00,
                "expense_date": date(2025, 7, 10).isoformat(),
            },
        )
        assert exp_res.status_code == 201
        exp_id = exp_res.json()["data"]["id"]

        # Check status -> near_limit (90% of 2000)
        status_res2 = await auth_client.get(f"/api/v1/budgets/status?period_month={test_month_str}")
        cat_status2 = next(
            (c for c in status_res2.json()["data"]["categories"] if c["category_id"] == category_id),
            None,
        )
        assert cat_status2 is not None
        assert cat_status2["status"] == "near_limit"
        assert cat_status2["percentage_used"] == 90.0
        assert float(cat_status2["remaining_amount"]) == 200.00

    finally:
        if exp_id:
            await auth_client.delete(f"/api/v1/expenses/{exp_id}")
        if budget_id:
            del_res = await auth_client.delete(f"/api/v1/budgets/{budget_id}")
            assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_budget_validation(auth_client: AsyncClient):
    current_month_str = date.today().replace(day=1).isoformat()

    # Non-positive amount should fail with 422
    invalid_payload = {
        "category_id": None,
        "period_month": current_month_str,
        "limit_amount": -100.00,
    }
    res = await auth_client.post("/api/v1/budgets", json=invalid_payload)
    assert res.status_code == 422

    # Zero amount should fail with 422
    invalid_payload["limit_amount"] = 0
    res = await auth_client.post("/api/v1/budgets", json=invalid_payload)
    assert res.status_code == 422
