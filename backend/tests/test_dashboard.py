from datetime import date
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_dashboard_summary(client: AsyncClient):
    res = await client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "total_spent_overall" in data
    assert "total_spent_current_month" in data
    assert "recent_expenses" in data
    assert "top_categories" in data
    assert "average_daily_spend" in data
    assert "average_weekly_spend" in data


@pytest.mark.asyncio
async def test_get_charts_by_category(client: AsyncClient):
    res = await client.get("/api/v1/dashboard/charts/by-category")
    assert res.status_code == 200
    items = res.json()["data"]
    assert isinstance(items, list)
    for item in items:
        assert "category_id" in item
        assert "category_name" in item
        assert "amount" in item
        assert "percentage" in item


@pytest.mark.asyncio
async def test_get_charts_over_time_granularities(client: AsyncClient):
    for gran in ["daily", "weekly", "monthly"]:
        res = await client.get(f"/api/v1/dashboard/charts/over-time?granularity={gran}")
        assert res.status_code == 200
        items = res.json()["data"]
        assert isinstance(items, list)
        for item in items:
            assert "label" in item
            assert "date_start" in item
            assert "amount" in item


@pytest.mark.asyncio
async def test_get_month_comparison(client: AsyncClient):
    res = await client.get("/api/v1/dashboard/compare")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "current_month" in data
    assert "current_month_total" in data
    assert "previous_month" in data
    assert "previous_month_total" in data
    assert "percentage_change" in data
    assert "is_increase" in data
