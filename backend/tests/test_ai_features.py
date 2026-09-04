import io
import json
from decimal import Decimal
from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import select

from app.core.config import settings
from app.models.category import Category
from app.models.user import User
from app.schemas.ai import (
    AffordabilityImpact,
    AffordabilityRequest,
    AffordabilityResponse,
    AIChatResponse,
    ApplySmartBudgetRequest,
    AutoBudgetGenerateRequest,
    CategoryBudgetRecommendation,
    MonthlyDigestResponse,
    ParsedExpenseData,
    ScannedReceiptData,
    SmartBudgetPlanResponse,
    SpendingForecastResponse,
)
from app.services.ai.base import AIConfigurationError, AIProviderError
from app.services.ai.claude_provider import ClaudeProvider
from app.services.ai.factory import AIFactory
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai_service import AIService


class SampleSchema(BaseModel):
    name: str
    count: int


# =========================================================================
# 1. AIFactory & Provider Resolution Tests
# =========================================================================

def test_ai_factory_provider_resolution():
    gemini = AIFactory.get_provider(provider_name="gemini", api_key="test-gemini-key")
    assert isinstance(gemini, GeminiProvider)
    assert gemini.api_key == "test-gemini-key"
    assert gemini.model_name == "gemini-3.6-flash"

    openai = AIFactory.get_provider(provider_name="openai", api_key="test-openai-key", model_name="gpt-4o-mini")
    assert isinstance(openai, OpenAIProvider)
    assert openai.api_key == "test-openai-key"
    assert openai.model_name == "gpt-4o-mini"

    claude = AIFactory.get_provider(provider_name="claude", api_key="test-claude-key")
    assert isinstance(claude, ClaudeProvider)
    assert claude.api_key == "test-claude-key"


def test_ai_factory_missing_api_key():
    with patch("app.core.config.settings.AI_API_KEY", None), patch("app.core.config.settings.GEMINI_API_KEY", None):
        with pytest.raises(AIConfigurationError):
            AIFactory.get_provider(provider_name="gemini", api_key="")


def test_ai_factory_unsupported_provider():
    with pytest.raises(AIConfigurationError):
        AIFactory.get_provider(provider_name="unknown-ai", api_key="some-key")


# =========================================================================
# 2. Mocked Provider Execution Tests (Gemini, OpenAI, Claude)
# =========================================================================

@pytest.mark.asyncio
async def test_gemini_provider_mock_image_analysis():
    provider = GeminiProvider(api_key="test-key", model_name="gemini-2.0-flash")

    mock_response_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps({
                                "title": "Starbucks Coffee",
                                "amount": 340.50,
                                "expense_date": "2026-09-01",
                                "payment_mode": "upi",
                                "suggested_category_name": "Food",
                                "notes": "Cold brew + Croissant",
                                "confidence": 0.98,
                            })
                        }
                    ]
                }
            }
        ]
    }

    mock_resp = Response(200, json=mock_response_payload)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.analyze_image_structured(
            image_bytes=b"fake-image-bytes",
            mime_type="image/jpeg",
            prompt="Extract receipt",
            response_schema=ScannedReceiptData,
        )

        assert result.title == "Starbucks Coffee"
        assert float(result.amount) == 340.50
        assert result.payment_mode == "upi"
        assert result.suggested_category_name == "Food"


@pytest.mark.asyncio
async def test_openai_provider_mock_image_analysis():
    provider = OpenAIProvider(api_key="sk-test", model_name="gpt-4o-mini")

    mock_response_payload = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "title": "D-Mart Supermarket",
                        "amount": 1250.00,
                        "expense_date": "2026-09-02",
                        "payment_mode": "card",
                        "suggested_category_name": "Groceries",
                        "notes": "Monthly groceries",
                        "confidence": 0.95,
                    })
                }
            }
        ]
    }

    mock_resp = Response(200, json=mock_response_payload)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.analyze_image_structured(
            image_bytes=b"fake-image-bytes",
            mime_type="image/jpeg",
            prompt="Extract receipt",
            response_schema=ScannedReceiptData,
        )

        assert result.title == "D-Mart Supermarket"
        assert float(result.amount) == 1250.00
        assert result.payment_mode == "card"


@pytest.mark.asyncio
async def test_claude_provider_mock_image_analysis():
    provider = ClaudeProvider(api_key="sk-ant-test", model_name="claude-3-5-haiku-20241022")

    mock_response_payload = {
        "content": [
            {
                "type": "text",
                "text": json.dumps({
                    "title": "Uber Trip",
                    "amount": 275.00,
                    "expense_date": "2026-09-03",
                    "payment_mode": "upi",
                    "suggested_category_name": "Transport",
                    "notes": "Ride to Office",
                    "confidence": 0.99,
                })
            }
        ]
    }

    mock_resp = Response(200, json=mock_response_payload)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.analyze_image_structured(
            image_bytes=b"fake-image-bytes",
            mime_type="image/jpeg",
            prompt="Extract receipt",
            response_schema=ScannedReceiptData,
        )

        assert result.title == "Uber Trip"
        assert float(result.amount) == 275.00
        assert result.payment_mode == "upi"


# =========================================================================
# 3. AIService Integration & Category Matching Test
# =========================================================================

@pytest.mark.asyncio
async def test_ai_service_scan_receipt_matching(test_user: User):
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Find user's existing Food category (from seeded categories)
        res = await session.execute(select(Category).where(Category.user_id == test_user.id, Category.name == "Food"))
        food_cat = res.scalar_one_or_none()
        assert food_cat is not None

        mock_extracted = ScannedReceiptData(
            title="Domino's Pizza",
            amount=599.00,
            expense_date="2026-09-02",
            payment_mode="upi",
            suggested_category_name="Food",
            confidence=0.95,
        )

        with patch.object(GeminiProvider, "analyze_image_structured", new_callable=AsyncMock) as mock_analyze:
            mock_analyze.return_value = mock_extracted
            with patch("app.core.config.settings.AI_API_KEY", "test-api-key"):
                res_data = await AIService.scan_receipt(
                    session=session,
                    user_id=test_user.id,
                    image_bytes=b"fake-pizza-receipt",
                    mime_type="image/jpeg",
                )

                assert res_data.title == "Domino's Pizza"
                assert float(res_data.amount) == 599.00
                # Verifies it mapped to user's "Food" category ID!
                assert res_data.suggested_category_id == food_cat.id
                assert res_data.suggested_category_name == "Food"

    await test_engine.dispose()


# =========================================================================
# 4. HTTP Endpoint Test: POST /api/v1/ai/scan-receipt
# =========================================================================

@pytest.mark.asyncio
async def test_scan_receipt_endpoint(auth_client: AsyncClient, test_user: User):
    mock_extracted = ScannedReceiptData(
        title="Zara Fashion",
        amount=2490.00,
        expense_date="2026-09-03",
        payment_mode="card",
        suggested_category_name="Shopping",
        confidence=0.97,
    )

    with patch.object(AIService, "scan_receipt", new_callable=AsyncMock) as mock_scan:
        mock_scan.return_value = mock_extracted

        files = {"file": ("receipt.jpg", io.BytesIO(b"dummy image data"), "image/jpeg")}
        response = await auth_client.post("/api/v1/ai/scan-receipt", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == "Zara Fashion"
        assert float(data["data"]["amount"]) == 2490.00
        assert data["data"]["suggested_category_name"] == "Shopping"


# =========================================================================
# 5. Natural Language Parsing Tests (Feature 2)
# =========================================================================

@pytest.mark.asyncio
async def test_ai_service_parse_natural_language_expense(test_user: User):
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session_maker() as session:
        # Find user's existing Transport category
        res = await session.execute(select(Category).where(Category.user_id == test_user.id, Category.name == "Transport"))
        transport_cat = res.scalar_one_or_none()
        assert transport_cat is not None

        mock_parsed = ParsedExpenseData(
            title="Uber to office",
            amount=350.00,
            expense_date="2026-09-03",
            payment_mode="upi",
            suggested_category_name="Transport",
            notes="Morning commute",
            confidence=0.96,
            raw_summary="₹350 spent on Uber via UPI",
        )

        with patch.object(GeminiProvider, "generate_structured", new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_parsed
            with patch("app.core.config.settings.AI_API_KEY", "test-api-key"):
                res_data = await AIService.parse_natural_language_expense(
                    session=session,
                    user_id=test_user.id,
                    text="Spent 350 on Uber to office via UPI today",
                )

                assert res_data.title == "Uber to office"
                assert float(res_data.amount) == 350.00
                assert res_data.payment_mode == "upi"
                assert res_data.suggested_category_id == transport_cat.id
                assert res_data.suggested_category_name == "Transport"

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_parse_expense_endpoint(auth_client: AsyncClient, test_user: User):
    mock_parsed = ParsedExpenseData(
        title="Dinner at Barbeque Nation",
        amount=2450.00,
        expense_date="2026-09-02",
        payment_mode="card",
        suggested_category_name="Food",
        notes="Dinner with team",
        confidence=0.98,
        raw_summary="₹2450 for dinner at Barbeque Nation via Card",
    )

    with patch.object(AIService, "parse_natural_language_expense", new_callable=AsyncMock) as mock_parse:
        mock_parse.return_value = mock_parsed

        response = await auth_client.post(
            "/api/v1/ai/parse-expense",
            json={"text": "Dinner at Barbeque Nation 2450 credit card yesterday"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == "Dinner at Barbeque Nation"
        assert float(data["data"]["amount"]) == 2450.00
        assert data["data"]["payment_mode"] == "card"
        assert data["data"]["suggested_category_name"] == "Food"


@pytest.mark.asyncio
async def test_parse_expense_endpoint_empty_text(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/v1/ai/parse-expense",
        json={"text": "   "},
    )
    # Validation error or bad request
    assert response.status_code in [400, 422]


# =========================================================================
# 6. AI Financial Advisor Chat Tests (Feature 3)
# =========================================================================

@pytest.mark.asyncio
async def test_ai_service_chat_with_advisor(test_user: User):
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session_maker() as session:
        mock_reply = "You have spent **₹350.00** this month, primarily on **Transport** (100.0%). You are well within your budget limits!"

        with patch.object(GeminiProvider, "generate_text", new_callable=AsyncMock) as mock_text:
            mock_text.return_value = mock_reply
            with patch("app.core.config.settings.AI_API_KEY", "test-api-key"):
                chat_res = await AIService.chat_with_advisor(
                    session=session,
                    user_id=test_user.id,
                    message="How much did I spend this month?",
                    history=[],
                )

                assert isinstance(chat_res, AIChatResponse)
                assert "₹350.00" in chat_res.reply
                assert len(chat_res.suggested_actions) > 0
                assert chat_res.referenced_metrics is not None

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_chat_endpoint(auth_client: AsyncClient, test_user: User):
    mock_chat_res = AIChatResponse(
        reply="Based on your records, your highest spending category is **Food**.",
        suggested_actions=["How can I save ₹2,000?", "Show my top 3 expenses"],
        referenced_metrics={"total_spent_current_month": 1250.0, "top_category": "Food"},
    )

    with patch.object(AIService, "chat_with_advisor", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_chat_res

        response = await auth_client.post(
            "/api/v1/ai/chat",
            json={
                "message": "Where is most of my money going?",
                "history": [
                    {"role": "user", "content": "Hello advisor!"},
                    {"role": "assistant", "content": "Hello! How can I help with your finances today?"},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Food" in data["data"]["reply"]
        assert len(data["data"]["suggested_actions"]) == 2
        assert data["data"]["referenced_metrics"]["top_category"] == "Food"


@pytest.mark.asyncio
async def test_chat_endpoint_empty_message(auth_client: AsyncClient):
    response = await auth_client.post(
        "/api/v1/ai/chat",
        json={"message": "   "},
    )
    assert response.status_code in [400, 422]


# =========================================================================
# 7. Predictive Spending Forecast & Anomaly Tests (Feature 4)
# =========================================================================

@pytest.mark.asyncio
async def test_ai_service_get_spending_forecast(test_user: User):
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session_maker() as session:
        with patch("app.core.config.settings.AI_API_KEY", "test-api-key"):
            forecast = await AIService.get_spending_forecast(
                session=session,
                user_id=test_user.id,
            )

            assert isinstance(forecast, SpendingForecastResponse)
            assert forecast.days_remaining >= 0
            assert forecast.predicted_total_month_end >= 0
            assert forecast.confidence_score > 0.0
            assert len(forecast.proactive_tips) >= 1
            assert forecast.summary is not None

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_forecast_endpoint(auth_client: AsyncClient, test_user: User):
    mock_forecast = SpendingForecastResponse(
        current_month_to_date=1500.00,
        predicted_total_month_end=4500.00,
        days_remaining=20,
        daily_recommended_spend=150.00,
        historical_average_monthly=4000.00,
        confidence_score=0.94,
        summary="You are on track to spend ₹4,500 by month end.",
        anomalies=[],
        category_forecasts=[],
        proactive_tips=["Limit dining out this weekend", "Review grocery list"],
    )

    with patch.object(AIService, "get_spending_forecast", new_callable=AsyncMock) as mock_f:
        mock_f.return_value = mock_forecast

        response = await auth_client.get("/api/v1/ai/forecast")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert float(data["data"]["current_month_to_date"]) == 1500.00
        assert float(data["data"]["predicted_total_month_end"]) == 4500.00
        assert data["data"]["days_remaining"] == 20
        assert len(data["data"]["proactive_tips"]) == 2


# =========================================================================
# 8. Monthly Financial Health Digest Tests (Feature 5.1)
# =========================================================================

@pytest.mark.asyncio
async def test_ai_service_get_monthly_digest(test_user: User):
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session_maker() as session:
        with patch("app.core.config.settings.AI_API_KEY", "test-api-key"):
            digest = await AIService.get_monthly_digest(
                session=session,
                user_id=test_user.id,
                month_str="2026-09",
            )

            assert isinstance(digest, MonthlyDigestResponse)
            assert 0 <= digest.health_score <= 100
            assert digest.grade in ["A+", "A", "B", "C", "D"]
            assert digest.headline is not None
            assert digest.executive_summary is not None
            assert isinstance(digest.action_plan_next_month, list)
            assert isinstance(digest.biggest_wins, list)

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_monthly_digest_endpoint(auth_client: AsyncClient, test_user: User):
    mock_digest = MonthlyDigestResponse(
        month="2026-09",
        month_name="September 2026",
        health_score=88,
        grade="A",
        headline="Strong savings discipline with ₹5,000 budget surplus",
        executive_summary="You spent ₹15,000 against your ₹20,000 budget, maintaining great discipline.",
        total_spent=15000.00,
        budget_limit=20000.00,
        savings_or_deficit=5000.00,
        total_transactions=12,
        daily_average=500.00,
        top_spending_leaks=[],
        biggest_wins=["Stayed ₹5,000 under budget", "Maintained healthy daily pace"],
        action_plan_next_month=["Reduce dining by 10%", "Save ₹6,000 next month"],
        category_insights=[],
    )

    with patch.object(AIService, "get_monthly_digest", new_callable=AsyncMock) as mock_d:
        mock_d.return_value = mock_digest

        response = await auth_client.get("/api/v1/ai/monthly-digest?month=2026-09")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["month"] == "2026-09"
        assert data["data"]["health_score"] == 88
        assert data["data"]["grade"] == "A"
        assert float(data["data"]["total_spent"]) == 15000.00
        assert len(data["data"]["biggest_wins"]) == 2


# =========================================================================
# 9. AI "Can I Afford This?" Affordability Simulator Tests (Feature 5.2)
# =========================================================================

@pytest.mark.asyncio
async def test_ai_service_simulate_affordability(test_user: User):
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session_maker() as session:
        with patch("app.core.config.settings.AI_API_KEY", "test-api-key"):
            req = AffordabilityRequest(
                item_name="Noise Cancelling Headphones",
                amount=Decimal("4500.00"),
                payment_method="one_time",
            )
            res = await AIService.simulate_affordability(
                session=session,
                user_id=test_user.id,
                payload=req,
            )

            assert isinstance(res, AffordabilityResponse)
            assert res.verdict in ["SAFE_TO_BUY", "CAUTION", "NOT_RECOMMENDED"]
            assert res.item_name == "Noise Cancelling Headphones"
            assert float(res.amount) == 4500.00
            assert res.affordability_score >= 0 and res.affordability_score <= 100
            assert res.impact.days_remaining_in_month >= 1
            assert len(res.recommendations) >= 1

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_affordability_endpoint(auth_client: AsyncClient, test_user: User):
    mock_affordability = AffordabilityResponse(
        verdict="SAFE_TO_BUY",
        verdict_title="Safe to Buy: ₹4,500 fits comfortably in your budget",
        verdict_description="You have ample monthly headroom to make this purchase without straining cash flow.",
        item_name="Sony Headphones",
        amount=Decimal("4500.00"),
        monthly_commitment=Decimal("4500.00"),
        affordability_score=85,
        impact=AffordabilityImpact(
            current_category_spent=Decimal("1200.00"),
            category_budget_limit=Decimal("8000.00"),
            category_remaining_after=Decimal("2300.00"),
            overall_spent=Decimal("10000.00"),
            overall_budget_limit=Decimal("30000.00"),
            overall_remaining_after=Decimal("15500.00"),
            daily_budget_before=Decimal("800.00"),
            daily_budget_after=Decimal("620.00"),
            days_remaining_in_month=25,
        ),
        recommendations=["Log purchase immediately", "Keep daily spend under ₹620/day"],
        alternative_strategies=["Check for card cashbacks"],
    )

    with patch.object(AIService, "simulate_affordability", new_callable=AsyncMock) as mock_sim:
        mock_sim.return_value = mock_affordability

        response = await auth_client.post(
            "/api/v1/ai/simulate-affordability",
            json={
                "item_name": "Sony Headphones",
                "amount": 4500.00,
                "payment_method": "one_time",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["verdict"] == "SAFE_TO_BUY"
        assert data["data"]["affordability_score"] == 85
        assert float(data["data"]["amount"]) == 4500.00
        assert data["data"]["impact"]["days_remaining_in_month"] == 25


@pytest.mark.asyncio
async def test_ai_service_generate_smart_budget(test_user: User):
    """Test AIService.generate_smart_budget computation with 50/30/20 rule."""
    test_engine = create_async_engine(settings.test_database_url, poolclass=NullPool)
    test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    payload = AutoBudgetGenerateRequest(
        monthly_income=Decimal("50000.00"),
        savings_target_percentage=20,
        lifestyle_mode="balanced",
    )

    async with test_session_maker() as session:
        with patch.object(AIFactory, "get_provider", side_effect=Exception("Provider offline")):
            plan = await AIService.generate_smart_budget(
                session=session,
                user_id=test_user.id,
                payload=payload,
            )

            assert float(plan.monthly_income_basis) == 50000.00
            assert float(plan.needs_allocation) == 25000.00  # 50%
            assert float(plan.wants_allocation) == 15000.00  # 30%
            assert float(plan.savings_allocation) == 10000.00  # 20%
            assert float(plan.overall_recommended_limit) == 40000.00
            assert len(plan.actionable_milestones) >= 1
            assert "50000" in plan.ai_financial_philosophy or "balanced" in plan.ai_financial_philosophy.lower()

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_generate_smart_budget_endpoint(auth_client: AsyncClient, test_user: User):
    """Test POST /api/v1/ai/generate-smart-budget endpoint."""
    mock_plan = SmartBudgetPlanResponse(
        monthly_income_basis=Decimal("60000.00"),
        needs_allocation=Decimal("30000.00"),
        wants_allocation=Decimal("18000.00"),
        savings_allocation=Decimal("12000.00"),
        overall_recommended_limit=Decimal("48000.00"),
        categories=[
            CategoryBudgetRecommendation(
                category_name="Groceries",
                bucket_type="needs",
                recommended_limit=Decimal("12000.00"),
                historical_average=Decimal("10000.00"),
                rationale="Essential food & grocery requirements",
            ),
        ],
        ai_financial_philosophy="Maintain strict discipline on wants to ensure 20% compounding savings.",
        actionable_milestones=["Automate 12k SIP on salary day", "Check grocery spend weekly"],
    )

    with patch.object(AIService, "generate_smart_budget", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = mock_plan

        response = await auth_client.post(
            "/api/v1/ai/generate-smart-budget",
            json={
                "monthly_income": 60000.00,
                "savings_target_percentage": 20,
                "lifestyle_mode": "balanced",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert float(data["data"]["monthly_income_basis"]) == 60000.00
        assert float(data["data"]["needs_allocation"]) == 30000.00
        assert len(data["data"]["categories"]) == 1
        assert data["data"]["categories"][0]["category_name"] == "Groceries"


@pytest.mark.asyncio
async def test_apply_smart_budget_endpoint(auth_client: AsyncClient, test_user: User):
    """Test POST /api/v1/ai/apply-smart-budget endpoint."""
    with patch.object(AIService, "apply_smart_budget", new_callable=AsyncMock) as mock_apply:
        mock_apply.return_value = {
            "period_month": "2026-09-01",
            "applied_count": 3,
            "message": "Successfully applied 3 budget limits for September 2026.",
        }

        response = await auth_client.post(
            "/api/v1/ai/apply-smart-budget",
            json={
                "overall_limit": 48000.00,
                "category_budgets": [
                    {"category_id": None, "limit_amount": 12000.00},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["applied_count"] == 3






