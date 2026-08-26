import uuid
import pytest
from httpx import AsyncClient
from datetime import date


@pytest.mark.asyncio
async def test_full_lifecycle_e2e(client: AsyncClient):
    """
    End-to-End lifecycle test:
    1. Create unique category
    2. Set monthly budget for that category
    3. Create an expense under that category
    4. Check budget status updates to reflect spend
    5. Check dashboard summary reflects spend
    6. Export data to CSV and verify row content
    7. Clean up created test entities
    """
    unique_suffix = uuid.uuid4().hex[:6]
    cat_name = f"E2E Cat {unique_suffix}"

    # 1. Create Category
    res_cat = await client.post("/api/v1/categories", json={"name": cat_name})
    assert res_cat.status_code == 201
    cat_data = res_cat.json()["data"]
    category_id = cat_data["id"]
    assert cat_data["name"] == cat_name

    # 2. Set Monthly Budget
    res_budget = await client.post(
        "/api/v1/budgets",
        json={
            "category_id": category_id,
            "period_month": "2026-08-01",
            "limit_amount": 2000.00,
        },
    )
    assert res_budget.status_code == 201
    budget_data = res_budget.json()["data"]
    budget_id = budget_data["id"]
    assert float(budget_data["limit_amount"]) == 2000.00

    # 3. Create Expense
    exp_title = f"E2E Dinner {unique_suffix}"
    res_exp = await client.post(
        "/api/v1/expenses",
        json={
            "title": exp_title,
            "category_id": category_id,
            "amount": 1600.00,
            "expense_date": "2026-08-26",
            "notes": "End-to-end integration test dinner",
            "payment_mode": "upi",
        },
    )
    assert res_exp.status_code == 201
    exp_data = res_exp.json()["data"]
    expense_id = exp_data["id"]
    assert float(exp_data["amount"]) == 1600.00

    # 4. Check Budget Status: 1600 of 2000 is 80% (near limit!)
    res_status = await client.get("/api/v1/budgets/status?period_month=2026-08-01")
    assert res_status.status_code == 200
    statuses = res_status.json()["data"]["categories"]
    matched = [s for s in statuses if s["category_id"] == category_id]
    assert len(matched) == 1
    assert matched[0]["status"] == "near_limit"
    assert matched[0]["percentage_used"] == 80.0

    # 5. Check Dashboard Summary
    res_dash = await client.get("/api/v1/dashboard/summary")
    assert res_dash.status_code == 200
    dash_data = res_dash.json()["data"]
    assert float(dash_data["total_spent_overall"]) >= 1600.00

    # 6. Export Filtered CSV and verify row content
    res_export = await client.get(f"/api/v1/expenses/export/csv?category_id={category_id}")
    assert res_export.status_code == 200
    assert "text/csv" in res_export.headers.get("content-type", "")
    csv_text = res_export.text
    assert exp_title in csv_text
    assert "1600.00" in csv_text

    # 7. Clean up
    del_exp = await client.delete(f"/api/v1/expenses/{expense_id}")
    assert del_exp.status_code == 200
    del_budget = await client.delete(f"/api/v1/budgets/{budget_id}")
    assert del_budget.status_code == 200
    del_cat = await client.delete(f"/api/v1/categories/{category_id}")
    assert del_cat.status_code == 200
