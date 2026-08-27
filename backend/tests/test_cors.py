import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cors_allowed_for_localhost(client: AsyncClient):
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
    }
    response = await client.options("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


@pytest.mark.asyncio
async def test_cors_allowed_for_exact_vercel_domain(client: AsyncClient):
    headers = {
        "Origin": "https://fintrack.vercel.app",
        "Access-Control-Request-Method": "GET",
    }
    response = await client.options("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://fintrack.vercel.app"


@pytest.mark.asyncio
async def test_cors_allowed_for_dynamic_vercel_subdomains(client: AsyncClient):
    # Tests preview deployments, branch deployments, and project-specific subdomains
    test_origins = [
        "https://fintrack-git-main-shindeyash875.vercel.app",
        "https://fintrack-yash.vercel.app",
        "https://fintrack-preview-123.vercel.app",
    ]
    for origin in test_origins:
        headers = {
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        }
        response = await client.options("/api/v1/health", headers=headers)
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin, f"Origin {origin} should be allowed"


@pytest.mark.asyncio
async def test_cors_disallows_unauthorized_external_domain(client: AsyncClient):
    headers = {
        "Origin": "https://unauthorized-domain.com",
        "Access-Control-Request-Method": "GET",
    }
    response = await client.options("/api/v1/health", headers=headers)
    assert response.headers.get("access-control-allow-origin") != "https://unauthorized-domain.com"
