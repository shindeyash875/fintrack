from datetime import date
import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_categories(client: AsyncClient):
    response = await client.get("/api/v1/categories")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert isinstance(payload["data"], list)
    assert len(payload["data"]) >= 8
    first = payload["data"][0]
    assert "id" in first
    assert "name" in first
    assert "expense_count" in first


@pytest.mark.asyncio
async def test_create_rename_and_delete_category(client: AsyncClient):
    cat_name = f"TestCat_{uuid.uuid4().hex[:6]}"

    # 1. Create
    create_res = await client.post("/api/v1/categories", json={"name": cat_name})
    assert create_res.status_code == 201
    created_data = create_res.json()["data"]
    cat_id = created_data["id"]
    assert created_data["name"] == cat_name

    # 2. Rename
    renamed = f"{cat_name}_Updated"
    update_res = await client.put(f"/api/v1/categories/{cat_id}", json={"name": renamed})
    assert update_res.status_code == 200
    assert update_res.json()["data"]["name"] == renamed

    # 3. Delete (empty category)
    del_res = await client.delete(f"/api/v1/categories/{cat_id}")
    assert del_res.status_code == 200
    assert del_res.json()["data"]["deleted"] is True


@pytest.mark.asyncio
async def test_category_in_use_reassignment(client: AsyncClient):
    cat_source_name = f"SourceCat_{uuid.uuid4().hex[:6]}"
    cat_target_name = f"TargetCat_{uuid.uuid4().hex[:6]}"

    # Create source and target categories
    src_res = await client.post("/api/v1/categories", json={"name": cat_source_name})
    assert src_res.status_code == 201
    src_id = src_res.json()["data"]["id"]

    tgt_res = await client.post("/api/v1/categories", json={"name": cat_target_name})
    assert tgt_res.status_code == 201
    tgt_id = tgt_res.json()["data"]["id"]

    # Create an expense in the source category
    exp_res = await client.post(
        "/api/v1/expenses",
        json={
            "title": "Expense under source",
            "category_id": src_id,
            "amount": 250.00,
            "expense_date": date.today().isoformat(),
        },
    )
    assert exp_res.status_code == 201
    exp_id = exp_res.json()["data"]["id"]

    # Attempting delete without reassign or cascade must fail with 409 Conflict
    conflict_res = await client.delete(f"/api/v1/categories/{src_id}")
    assert conflict_res.status_code == 409

    # Delete with reassign_to target category must succeed
    reassign_res = await client.delete(f"/api/v1/categories/{src_id}?reassign_to={tgt_id}")
    assert reassign_res.status_code == 200
    assert reassign_res.json()["data"]["deleted"] is True

    # Verify expense now points to tgt_id
    get_exp = await client.get(f"/api/v1/expenses/{exp_id}")
    assert get_exp.status_code == 200
    assert get_exp.json()["data"]["category_id"] == tgt_id

    # Clean up expense and target category
    await client.delete(f"/api/v1/expenses/{exp_id}")
    await client.delete(f"/api/v1/categories/{tgt_id}")
