import base64
import json
import logging
from typing import Any, Dict, List, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.services.ai.base import AIProviderError, BaseLLMProvider

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI Provider (ChatGPT / GPT-4o / GPT-4o-mini) implementing text, structured output, and vision OCR.
    """

    BASE_URL = "https://api.openai.com/v1/chat/completions"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        messages: List[Dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body: Dict[str, Any] = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.BASE_URL, headers=headers, json=body)
            if resp.status_code != 200:
                logger.error(f"[OpenAI Error] HTTP {resp.status_code}: {resp.text}")
                raise AIProviderError(f"OpenAI API returned status {resp.status_code}: {resp.text}")

            data = resp.json()
            try:
                return data["choices"][0]["message"]["content"].strip()
            except (KeyError, IndexError) as exc:
                logger.error(f"[OpenAI Parse Error] {data}")
                raise AIProviderError(f"Failed to parse OpenAI response: {exc}")

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> T:
        schema_json = json.dumps(response_schema.model_json_schema())
        instruction = (
            f"{system_prompt or 'You are a financial analysis AI assistant.'}\n\n"
            f"You MUST respond ONLY with a valid JSON object matching this JSON Schema:\n{schema_json}\n"
            "Do not include any conversational text outside the JSON object."
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        messages = [
            {"role": "system", "content": instruction},
            {"role": "user", "content": prompt},
        ]
        body = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(self.BASE_URL, headers=headers, json=body)
            if resp.status_code != 200:
                logger.error(f"[OpenAI Error] HTTP {resp.status_code}: {resp.text}")
                raise AIProviderError(f"OpenAI API error: {resp.text}")

            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            json_str = self.extract_json_block(raw_text)

            try:
                return response_schema.model_validate_json(json_str)
            except ValidationError as exc:
                logger.error(f"[OpenAI Schema Validation Error] {json_str} | Error: {exc}")
                raise AIProviderError(f"OpenAI response did not match schema: {exc}")

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
        data_uri = f"data:{mime_type};base64,{base64_img}"

        schema_json = json.dumps(response_schema.model_json_schema())
        instruction = (
            f"{system_prompt or 'You are an intelligent receipt, invoice, and payment screenshot scanner.'}\n\n"
            f"You MUST respond ONLY with a valid JSON object matching this JSON Schema:\n{schema_json}\n"
            "Extract accurate numbers, merchant/title, dates, and payment modes."
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        messages = [
            {"role": "system", "content": instruction},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": data_uri},
                    },
                ],
            },
        ]
        body = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(self.BASE_URL, headers=headers, json=body)
            if resp.status_code != 200:
                logger.error(f"[OpenAI Vision Error] HTTP {resp.status_code}: {resp.text}")
                raise AIProviderError(f"OpenAI Vision error: {resp.text}")

            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            json_str = self.extract_json_block(raw_text)

            try:
                return response_schema.model_validate_json(json_str)
            except ValidationError as exc:
                logger.error(f"[OpenAI Vision Validation Error] {json_str} | Error: {exc}")
                raise AIProviderError(f"OpenAI Vision response did not match schema: {exc}")
