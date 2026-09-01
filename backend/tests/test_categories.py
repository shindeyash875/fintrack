from datetime import date
import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_categories(auth_client: AsyncClient):
    response = await auth_client.get("/api/v1/categories")
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
async def test_create_rename_and_delete_category(auth_client: AsyncClient):
    cat_name = f"Test Cat {uuid.uuid4().hex[:6].capitalize()}"

    # 1. Create
    create_res = await auth_client.post("/api/v1/categories", json={"name": cat_name})
    assert create_res.status_code == 201
    created_data = create_res.json()["data"]
    cat_id = created_data["id"]
    assert created_data["name"] == cat_name

    # 2. Rename
    renamed = f"{cat_name} Updated"
    update_res = await auth_client.put(f"/api/v1/categories/{cat_id}", json={"name": renamed})
    assert update_res.status_code == 200
    assert update_res.json()["data"]["name"] == renamed

    # 3. Delete (empty category)
    del_res = await auth_client.delete(f"/api/v1/categories/{cat_id}")
    assert del_res.status_code == 200
    assert del_res.json()["data"]["deleted"] is True


@pytest.mark.asyncio
async def test_category_in_use_reassignment(auth_client: AsyncClient):
    cat_source_name = f"Source Cat {uuid.uuid4().hex[:6].capitalize()}"
    cat_target_name = f"Target Cat {uuid.uuid4().hex[:6].capitalize()}"

    # Create source and target categories
    src_res = await auth_client.post("/api/v1/categories", json={"name": cat_source_name})
    assert src_res.status_code == 201
    src_id = src_res.json()["data"]["id"]

    tgt_res = await auth_client.post("/api/v1/categories", json={"name": cat_target_name})
    assert tgt_res.status_code == 201
    tgt_id = tgt_res.json()["data"]["id"]

    # Create an expense in the source category
    exp_res = await auth_client.post(
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
    conflict_res = await auth_client.delete(f"/api/v1/categories/{src_id}")
    assert conflict_res.status_code == 409

    # Delete with reassign_to target category must succeed
    reassign_res = await auth_client.delete(f"/api/v1/categories/{src_id}?reassign_to={tgt_id}")
    assert reassign_res.status_code == 200
    assert reassign_res.json()["data"]["deleted"] is True

    # Verify expense now points to tgt_id
    get_exp = await auth_client.get(f"/api/v1/expenses/{exp_id}")
    assert get_exp.status_code == 200
    assert get_exp.json()["data"]["category_id"] == tgt_id

    # Clean up expense and target category
    await auth_client.delete(f"/api/v1/expenses/{exp_id}")
    await auth_client.delete(f"/api/v1/categories/{tgt_id}")


@pytest.mark.asyncio
async def test_duplicate_category_prevention_and_normalization(auth_client: AsyncClient):
    """
    Test suite for Requirement 1 & 2:
    - Case-insensitive duplicate prevention
    - Trimming and Title Case normalization
    - Clean 409 Conflict with 'Category already exists.' and no raw DB errors
    """
    unique_suffix = uuid.uuid4().hex[:6].capitalize()
    base_name = f"Travel {unique_suffix}"
    normalized_expected = base_name  # Already Title Case

    cat_id = None
    try:
        # 1. Normal custom category creation with lowercase & extra spaces
        raw_input = f"  travel {unique_suffix}  "
        res1 = await auth_client.post("/api/v1/categories", json={"name": raw_input})
        assert res1.status_code == 201
        data1 = res1.json()["data"]
        cat_id = data1["id"]
        # Must be normalized to Title Case without spaces
        assert data1["name"] == normalized_expected

        # 2. Duplicate category with EXACT SAME CASE
        res_dup_same = await auth_client.post("/api/v1/categories", json={"name": normalized_expected})
        assert res_dup_same.status_code == 409
        err_same = res_dup_same.json()
        assert err_same["success"] is False
        assert err_same["error"]["code"] == "CONFLICT"
        assert err_same["error"]["message"] == "Category already exists."
        # Verify NO raw DB / SQLAlchemy details are present
        res_str = res_dup_same.text.lower()
        assert "sqlalchemy" not in res_str
        assert "integrityerror" not in res_str
        assert "psycopg2" not in res_str
        assert "unique" not in res_str

        # 3. Duplicate category with DIFFERENT CASE (UPPERCASE)
        res_dup_upper = await auth_client.post("/api/v1/categories", json={"name": normalized_expected.upper()})
        assert res_dup_upper.status_code == 409
        err_upper = res_dup_upper.json()
        assert err_upper["error"]["message"] == "Category already exists."

        # 4. Duplicate category with DIFFERENT CASE (lowercase)
        res_dup_lower = await auth_client.post("/api/v1/categories", json={"name": normalized_expected.lower()})
        assert res_dup_lower.status_code == 409
        err_lower = res_dup_lower.json()
        assert err_lower["error"]["message"] == "Category already exists."

        # 5. Duplicate category with EXTRA LEADING / TRAILING SPACES
        res_dup_spaces = await auth_client.post("/api/v1/categories", json={"name": f"   {normalized_expected}   "})
        assert res_dup_spaces.status_code == 409
        err_spaces = res_dup_spaces.json()
        assert err_spaces["error"]["message"] == "Category already exists."

        # 6. Test Multi-word Title Case Normalization
        multi_word = f"home  and   garden   {unique_suffix}"
        res_multi = await auth_client.post("/api/v1/categories", json={"name": multi_word})
        assert res_multi.status_code == 201
        data_multi = res_multi.json()["data"]
        expected_title = f"Home And Garden {unique_suffix.capitalize()}"
        assert data_multi["name"] == expected_title

        # Clean up multi-word category
        await auth_client.delete(f"/api/v1/categories/{data_multi['id']}")

        # 7. Test Duplicate on Rename (PUT)
        # Create a second category
        second_name = f"Fitness {unique_suffix}"
        res_second = await auth_client.post("/api/v1/categories", json={"name": second_name})
        assert res_second.status_code == 201
        second_id = res_second.json()["data"]["id"]

        try:
            # Try renaming second category to first category's name (different case)
            res_rename_conflict = await auth_client.put(
                f"/api/v1/categories/{second_id}",
                json={"name": normalized_expected.lower()}
            )
            assert res_rename_conflict.status_code == 409
            assert res_rename_conflict.json()["error"]["message"] == "Category already exists."
        finally:
            await auth_client.delete(f"/api/v1/categories/{second_id}")

    finally:
        if cat_id:
            await auth_client.delete(f"/api/v1/categories/{cat_id}")
