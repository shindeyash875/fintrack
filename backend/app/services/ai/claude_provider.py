import base64
import json
import logging
from typing import Any, Dict, List, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.services.ai.base import AIProviderError, BaseLLMProvider

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class ClaudeProvider(BaseLLMProvider):
    """
    Anthropic Claude Provider (Claude 3.5 Sonnet / Haiku) implementing text, structured output, and vision OCR.
    """

    BASE_URL = "https://api.anthropic.com/v1/messages"
    ANTHROPIC_VERSION = "2023-06-01"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": self.ANTHROPIC_VERSION,
            "content-type": "application/json",
        }
        body: Dict[str, Any] = {
            "model": self.model_name,
            "max_tokens": 2048,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            body["system"] = system_prompt

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.BASE_URL, headers=headers, json=body)
            if resp.status_code != 200:
                logger.error(f"[Claude Error] HTTP {resp.status_code}: {resp.text}")
                raise AIProviderError(f"Claude API returned status {resp.status_code}: {resp.text}")

            data = resp.json()
            try:
                for block in data.get("content", []):
                    if block.get("type") == "text":
                        return block.get("text", "").strip()
                raise AIProviderError("No text block in Claude response.")
            except (KeyError, IndexError) as exc:
                logger.error(f"[Claude Parse Error] {data}")
                raise AIProviderError(f"Failed to parse Claude response: {exc}")

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> T:
        schema_json = json.dumps(response_schema.model_json_schema())
        full_system = (
            f"{system_prompt or 'You are a financial analysis AI assistant.'}\n\n"
            f"You MUST reply with valid JSON conforming to this schema:\n{schema_json}\n"
            "Return ONLY the JSON. Do not wrap in conversational sentences."
        )

        raw_text = await self.generate_text(prompt=prompt, system_prompt=full_system, temperature=temperature)
        json_str = self.extract_json_block(raw_text)

        try:
            return response_schema.model_validate_json(json_str)
        except ValidationError as exc:
            logger.error(f"[Claude Structured Parse Error] {json_str} | Error: {exc}")
            raise AIProviderError(f"Claude response did not match schema: {exc}")

    async def analyze_image_structured(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> T:
        base64_img = base64.b64encode(image_bytes).decode("utf-8")
        schema_json = json.dumps(response_schema.model_json_schema())
        full_system = (
            f"{system_prompt or 'You are an intelligent receipt, invoice, and payment screenshot scanner.'}\n\n"
            f"You MUST respond ONLY with a valid JSON object matching this JSON Schema:\n{schema_json}\n"
            "Extract accurate numbers, merchant/title, dates, and payment modes from the image."
        )

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": self.ANTHROPIC_VERSION,
            "content-type": "application/json",
        }
        body: Dict[str, Any] = {
            "model": self.model_name,
            "max_tokens": 2048,
            "temperature": temperature,
            "system": full_system,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": base64_img,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(self.BASE_URL, headers=headers, json=body)
            if resp.status_code != 200:
                logger.error(f"[Claude Vision Error] HTTP {resp.status_code}: {resp.text}")
                raise AIProviderError(f"Claude Vision API returned status {resp.status_code}: {resp.text}")

            data = resp.json()
            try:
                raw_text = ""
                for block in data.get("content", []):
                    if block.get("type") == "text":
                        raw_text += block.get("text", "")
                json_str = self.extract_json_block(raw_text)
                return response_schema.model_validate_json(json_str)
            except (KeyError, IndexError, ValidationError) as exc:
                logger.error(f"[Claude Vision Parse Error] {data} | Error: {exc}")
                raise AIProviderError(f"Failed to parse Claude Vision response: {exc}")
