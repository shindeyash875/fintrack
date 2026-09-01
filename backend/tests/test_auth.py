import uuid
import pytest
from httpx import AsyncClient
from app.core.security import decode_access_token


@pytest.mark.asyncio
async def test_registration_and_category_seed(client: AsyncClient):
    unique_email = f"newuser_{uuid.uuid4().hex[:8]}@fintrack.app"
    payload = {
        "email": unique_email,
        "password": "StrongPassword123!",
        "full_name": "New FinTrack User",
    }
    res = await client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()["data"]
    assert "access_token" in data
    assert data["user"]["email"] == unique_email.lower()
    assert data["user"]["full_name"] == "New FinTrack User"
    assert "fintrack_refresh_token" in res.cookies

    # Verify access token is valid
    token_payload = decode_access_token(data["access_token"])
    assert token_payload is not None
    assert token_payload["email"] == unique_email.lower()

    # Verify that standard categories were seeded for this new user
    auth_headers = {"Authorization": f"Bearer {data['access_token']}"}
    cat_res = await client.get("/api/v1/categories", headers=auth_headers)
    assert cat_res.status_code == 200
    categories = cat_res.json()["data"]
    assert len(categories) == 8
    cat_names = [c["name"] for c in categories]
    assert "Food" in cat_names
    assert "Rent" in cat_names


@pytest.mark.asyncio
async def test_duplicate_registration_fails(client: AsyncClient):
    unique_email = f"dupuser_{uuid.uuid4().hex[:8]}@fintrack.app"
    payload = {
        "email": unique_email,
        "password": "StrongPassword123!",
        "full_name": "Duplicate User",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["error"]["message"]


@pytest.mark.asyncio
async def test_login_flow(client: AsyncClient):
    unique_email = f"loginuser_{uuid.uuid4().hex[:8]}@fintrack.app"
    pw = "SecretLogin123!"
    await client.post("/api/v1/auth/register", json={"email": unique_email, "password": pw})

    # Successful login
    login_res = await client.post("/api/v1/auth/login", json={"email": unique_email, "password": pw})
    assert login_res.status_code == 200
    login_data = login_res.json()["data"]
    assert "access_token" in login_data
    assert "fintrack_refresh_token" in login_res.cookies

    # Invalid password
    bad_pw_res = await client.post("/api/v1/auth/login", json={"email": unique_email, "password": "WrongPassword123!"})
    assert bad_pw_res.status_code == 401

    # Nonexistent user
    bad_user_res = await client.post("/api/v1/auth/login", json={"email": "nonexistent@fintrack.app", "password": pw})
    assert bad_user_res.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_revocation(client: AsyncClient):
    email = f"refresh_{uuid.uuid4().hex[:8]}@fintrack.app"
    pw = "Password123!"
    reg_res = await client.post("/api/v1/auth/register", json={"email": email, "password": pw})
    assert reg_res.status_code == 201
    initial_cookie = reg_res.cookies.get("fintrack_refresh_token")
    assert initial_cookie is not None

    # Rotate token
    client.cookies.set("fintrack_refresh_token", initial_cookie)
    ref_res = await client.post("/api/v1/auth/refresh")
    assert ref_res.status_code == 200
    new_access_token = ref_res.json()["data"]["access_token"]
    assert new_access_token is not None
    rotated_cookie = ref_res.cookies.get("fintrack_refresh_token")
    assert rotated_cookie is not None
    assert rotated_cookie != initial_cookie

    # Replay attack: trying to use the old initial_cookie must fail with 401
    client.cookies.set("fintrack_refresh_token", initial_cookie)
    replay_res = await client.post("/api/v1/auth/refresh")
    assert replay_res.status_code == 401


@pytest.mark.asyncio
async def test_logout_and_logout_all(client: AsyncClient):
    email = f"logout_{uuid.uuid4().hex[:8]}@fintrack.app"
    pw = "Password123!"
    reg_res = await client.post("/api/v1/auth/register", json={"email": email, "password": pw})
    access_token = reg_res.json()["data"]["access_token"]
    refresh_cookie = reg_res.cookies.get("fintrack_refresh_token")

    # Logout single device
    client.cookies.set("fintrack_refresh_token", refresh_cookie)
    logout_res = await client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Refresh must fail now
    client.cookies.set("fintrack_refresh_token", refresh_cookie)
    ref_fail = await client.post("/api/v1/auth/refresh")
    assert ref_fail.status_code == 401

    # Login again to test logout-all
    login_res = await client.post("/api/v1/auth/login", json={"email": email, "password": pw})
    new_token = login_res.json()["data"]["access_token"]
    new_cookie = login_res.cookies.get("fintrack_refresh_token")

    logout_all_res = await client.post(
        "/api/v1/auth/logout-all",
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert logout_all_res.status_code == 200

    # Refresh must fail after logout-all
    client.cookies.set("fintrack_refresh_token", new_cookie)
    ref_all_fail = await client.post("/api/v1/auth/refresh")
    assert ref_all_fail.status_code == 401


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow(client: AsyncClient):
    email = f"reset_{uuid.uuid4().hex[:8]}@fintrack.app"
    old_pw = "OldPassword123!"
    new_pw = "NewAwesomePassword123!"
    await client.post("/api/v1/auth/register", json={"email": email, "password": old_pw})

    # Forgot password request
    forgot_res = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json()["data"].get("debug_reset_token")
    assert reset_token is not None

    # Reset password with token
    reset_res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": new_pw},
    )
    assert reset_res.status_code == 200

    # Old password fails
    old_login_res = await client.post("/api/v1/auth/login", json={"email": email, "password": old_pw})
    assert old_login_res.status_code == 401

    # New password succeeds
    new_login_res = await client.post("/api/v1/auth/login", json={"email": email, "password": new_pw})
    assert new_login_res.status_code == 200


@pytest.mark.asyncio
async def test_protected_routes_reject_unauthenticated(client: AsyncClient):
    # Missing Authorization header
    res1 = await client.get("/api/v1/expenses")
    assert res1.status_code == 401

    # Invalid token
    res2 = await client.get("/api/v1/expenses", headers={"Authorization": "Bearer invalid_token_123"})
    assert res2.status_code == 401

    res3 = await client.get("/api/v1/dashboard/summary")
    assert res3.status_code == 401

    res4 = await client.get("/api/v1/categories")
    assert res4.status_code == 401

    res5 = await client.get("/api/v1/budgets/status")
    assert res5.status_code == 401
