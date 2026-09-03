import logging
from typing import Optional

from app.core.config import settings
from app.services.ai.base import AIConfigurationError, BaseLLMProvider
from app.services.ai.claude_provider import ClaudeProvider
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)


class AIFactory:
    """
    Factory for instantiating the configured AI Provider based on environment variables.
    """

    @classmethod
    def get_provider(
        cls,
        provider_name: Optional[str] = None,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> BaseLLMProvider:
        provider = (provider_name or settings.AI_PROVIDER).lower().strip()
        key = (api_key or settings.effective_ai_api_key)
        model = (model_name or settings.effective_ai_model)

        if not key or not key.strip():
            raise AIConfigurationError(
                f"No API key configured for AI provider '{provider}'. "
                f"Please set AI_API_KEY (or {provider.upper()}_API_KEY) in your environment."
            )

        if provider == "gemini":
            return GeminiProvider(api_key=key, model_name=model)
        elif provider == "openai":
            return OpenAIProvider(api_key=key, model_name=model)
        elif provider == "claude":
            return ClaudeProvider(api_key=key, model_name=model)
        else:
            raise AIConfigurationError(
                f"Unsupported AI provider '{provider}'. Supported providers: 'gemini', 'openai', 'claude'."
            )
