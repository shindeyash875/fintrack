from datetime import date
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_expense_crud_and_filters(client: AsyncClient):
    # 1. Fetch categories to get an active category_id
    cat_res = await client.get("/api/v1/categories")
    assert cat_res.status_code == 200
    categories = cat_res.json()["data"]
    assert len(categories) > 0
    test_category = categories[0]
    category_id = test_category["id"]

    today_str = date.today().isoformat()

    # 2. Create expense
    expense_payload = {
        "title": "Weekly Organic Produce",
        "category_id": category_id,
        "amount": 750.50,
        "expense_date": today_str,
        "notes": "Farm market vegetables",
        "payment_mode": "upi",
    }
    create_res = await client.post("/api/v1/expenses", json=expense_payload)
    assert create_res.status_code == 201
    created = create_res.json()["data"]
    expense_id = created["id"]
    assert created["title"] == expense_payload["title"]
    assert float(created["amount"]) == 750.50
    assert created["payment_mode"] == "upi"
    assert created["category_name"] == test_category["name"]

    # 3. Test Filters & Search
    # Search by title
    search_res = await client.get("/api/v1/expenses?search=Organic")
    assert search_res.status_code == 200
    search_data = search_res.json()["data"]
    assert any(item["id"] == expense_id for item in search_data)

    # Filter by category
    cat_filter_res = await client.get(f"/api/v1/expenses?category_id={category_id}")
    assert cat_filter_res.status_code == 200
    assert any(item["id"] == expense_id for item in cat_filter_res.json()["data"])

    # Filter by payment mode
    mode_res = await client.get("/api/v1/expenses?payment_mode=upi")
    assert mode_res.status_code == 200
    assert any(item["id"] == expense_id for item in mode_res.json()["data"])

    # Filter by amount range
    range_res = await client.get("/api/v1/expenses?amount_min=700&amount_max=800")
    assert range_res.status_code == 200
    assert any(item["id"] == expense_id for item in range_res.json()["data"])

    # 4. Update expense
    update_payload = {
        "title": "Weekly Organic Produce (Organic)",
        "amount": 820.00,
        "payment_mode": "card",
    }
    update_res = await client.put(f"/api/v1/expenses/{expense_id}", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()["data"]
    assert updated["title"] == update_payload["title"]
    assert float(updated["amount"]) == 820.00
    assert updated["payment_mode"] == "card"

    # 5. Delete expense
    delete_res = await client.delete(f"/api/v1/expenses/{expense_id}")
    assert delete_res.status_code == 200
    assert delete_res.json()["data"]["deleted"] is True

    # 6. Verify 404 after deletion
    get_res = await client.get(f"/api/v1/expenses/{expense_id}")
    assert get_res.status_code == 404
