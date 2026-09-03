import io
import json
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
from app.schemas.ai import AIChatResponse, ParsedExpenseData, ScannedReceiptData
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


