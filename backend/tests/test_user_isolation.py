from datetime import date
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_strict_user_data_isolation(
    user_a_client: AsyncClient,
    user_b_client: AsyncClient,
):
    today_str = date.today().isoformat()

    # 1. User A lists their categories and creates an expense
    cat_a_res = await user_a_client.get("/api/v1/categories")
    assert cat_a_res.status_code == 200
    cat_a = cat_a_res.json()["data"][0]
    cat_a_id = cat_a["id"]

    exp_a_payload = {
        "title": "User A Private Transaction",
        "category_id": cat_a_id,
        "amount": 5000.00,
        "expense_date": today_str,
        "notes": "Top secret user A purchase",
        "payment_mode": "upi",
    }
    create_a_res = await user_a_client.post("/api/v1/expenses", json=exp_a_payload)
    assert create_a_res.status_code == 201
    exp_a_id = create_a_res.json()["data"]["id"]

    # 2. User A sets an overall budget
    budget_a_res = await user_a_client.post(
        "/api/v1/budgets",
        json={"period_month": today_str, "limit_amount": 10000.00},
    )
    assert budget_a_res.status_code == 201
    budget_a_id = budget_a_res.json()["data"]["id"]

    # 3. User B lists expenses: MUST NOT contain User A's expense
    list_b_res = await user_b_client.get("/api/v1/expenses")
    assert list_b_res.status_code == 200
    user_b_expenses = list_b_res.json()["data"]
    assert len(user_b_expenses) == 0
    assert not any(exp["id"] == exp_a_id for exp in user_b_expenses)

    # 4. User B attempts unauthorized access to User A's expense by ID -> 404
    get_unauth = await user_b_client.get(f"/api/v1/expenses/{exp_a_id}")
    assert get_unauth.status_code == 404

    # 5. User B attempts unauthorized modification of User A's expense -> 404
    put_unauth = await user_b_client.put(
        f"/api/v1/expenses/{exp_a_id}",
        json={"title": "Hacked Title", "amount": 10.00},
    )
    assert put_unauth.status_code == 404

    # 6. User B attempts unauthorized deletion of User A's expense -> 404
    del_unauth = await user_b_client.delete(f"/api/v1/expenses/{exp_a_id}")
    assert del_unauth.status_code == 404

    # 7. User B attempts unauthorized deletion of User A's category -> 404
    del_cat_unauth = await user_b_client.delete(f"/api/v1/categories/{cat_a_id}")
    assert del_cat_unauth.status_code == 404

    # 8. User B attempts unauthorized deletion of User A's budget -> 404
    del_bud_unauth = await user_b_client.delete(f"/api/v1/budgets/{budget_a_id}")
    assert del_bud_unauth.status_code == 404

    # 9. User B dashboard metrics: MUST be isolated (zero spend)
    dash_b_res = await user_b_client.get("/api/v1/dashboard/summary")
    assert dash_b_res.status_code == 200
    dash_b = dash_b_res.json()["data"]
    assert float(dash_b["total_spent_overall"]) == 0.00
    assert len(dash_b["recent_expenses"]) == 0
    assert dash_b["overall_budget_status"] is None

    # 10. User B CSV export: MUST NOT contain User A's data
    export_b_res = await user_b_client.get("/api/v1/expenses/export/csv")
    assert export_b_res.status_code == 200
    csv_text = export_b_res.text
    assert "User A Private Transaction" not in csv_text
    assert "5000.00" not in csv_text

    # 11. User A verifies their data remains intact
    get_auth = await user_a_client.get(f"/api/v1/expenses/{exp_a_id}")
    assert get_auth.status_code == 200
    assert get_auth.json()["data"]["title"] == "User A Private Transaction"
