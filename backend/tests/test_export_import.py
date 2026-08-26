import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_export_csv_and_json(client: AsyncClient):
    # 1. Export CSV
    res_csv = await client.get("/api/v1/expenses/export/csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "attachment;" in res_csv.headers["content-disposition"]
    csv_text = res_csv.text
    assert "Date,Title,Category,Amount (INR),Payment Mode,Notes" in csv_text

    # 2. Export JSON
    res_json = await client.get("/api/v1/expenses/export/json")
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers["content-type"]
    assert "attachment;" in res_json.headers["content-disposition"]
    items = res_json.json()
    assert isinstance(items, list)


@pytest.mark.asyncio
async def test_import_csv_and_duplicate_detection(client: AsyncClient):
    uid = uuid.uuid4().hex[:8]
    test_date = (date.today() - timedelta(days=2)).isoformat()
    csv_content = f"""Date,Title,Category,Amount,Payment Mode,Notes
{test_date},Test Grocery {uid},Food,450.50,upi,Imported from CSV
{test_date},Test Fuel {uid},Travel,250.00,card,Petrol expense
"""

    # First import: should import 2 rows
    res1 = await client.post("/api/v1/expenses/import/csv", json={"csv_content": csv_content})
    assert res1.status_code == 200
    data1 = res1.json()["data"]
    assert data1["imported_count"] == 2
    assert data1["skipped_duplicates_count"] == 0

    # Second import: exact same rows -> duplicate detection should skip them
    res2 = await client.post("/api/v1/expenses/import/csv", json={"csv_content": csv_content})
    assert res2.status_code == 200
    data2 = res2.json()["data"]
    assert data2["imported_count"] == 0
    assert data2["skipped_duplicates_count"] == 2


@pytest.mark.asyncio
async def test_import_csv_validation_errors(client: AsyncClient):
    future_date = (date.today() + timedelta(days=5)).isoformat()
    invalid_csv = f"""Date,Title,Category,Amount,Payment Mode,Notes
{future_date},Future Flight,Travel,5000.00,card,Should fail future date
2026-08-01,,Food,100.00,cash,Should fail empty title
2026-08-01,Negative Milk,Food,-50.00,cash,Should fail negative amount
invalid-date,Coffee,Food,150.00,cash,Should fail bad date
"""

    res = await client.post("/api/v1/expenses/import/csv", json={"csv_content": invalid_csv})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["imported_count"] == 0
    assert len(data["errors"]) == 4


@pytest.mark.asyncio
async def test_import_json(client: AsyncClient):
    uid = uuid.uuid4().hex[:8]
    test_date = (date.today() - timedelta(days=1)).isoformat()
    payload = {
        "items": [
            {
                "title": f"JSON Test Expense {uid}",
                "amount": "890.00",
                "expense_date": test_date,
                "category_name": "Entertainment",
                "payment_mode": "card",
                "notes": "Testing JSON import",
            }
        ]
    }

    # First import
    res1 = await client.post("/api/v1/expenses/import/json", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()["data"]
    assert data1["imported_count"] == 1
    assert data1["skipped_duplicates_count"] == 0

    # Second import -> duplicate detection
    res2 = await client.post("/api/v1/expenses/import/json", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()["data"]
    assert data2["imported_count"] == 0
    assert data2["skipped_duplicates_count"] == 1
