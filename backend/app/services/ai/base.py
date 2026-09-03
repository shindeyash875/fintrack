import abc
import json
import logging
import re
from typing import Any, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class AIProviderError(Exception):
    """Base exception for AI provider errors."""
    pass


class AIConfigurationError(AIProviderError):
    """Raised when API key or configuration is missing/invalid."""
    pass


class BaseLLMProvider(abc.ABC):
    """
    Abstract Base Class defining the universal interface for all AI model providers
    (Google Gemini, OpenAI, Anthropic Claude, etc.).
    """

    def __init__(self, api_key: str, model_name: str):
        if not api_key or not api_key.strip():
            raise AIConfigurationError(f"API key is required for AI provider {self.__class__.__name__}")
        self.api_key = api_key.strip()
        self.model_name = model_name.strip()

    @abc.abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        """Generate a free-form text response from the model."""
        pass

    @abc.abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> T:
        """Generate a structured response strictly matching the given Pydantic model."""
        pass

    @abc.abstractmethod
    async def analyze_image_structured(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> T:
        """Analyze an image (e.g. receipt/screenshot) and extract structured data into Pydantic schema."""
        pass

    @staticmethod
    def extract_json_block(raw_text: str) -> str:
        """
        Safely extracts JSON substring from Markdown code blocks (```json ... ```) or raw text.
        """
        text = raw_text.strip()
        json_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
        matches = re.findall(json_pattern, text)
        if matches:
            return matches[0].strip()
        return text
