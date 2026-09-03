import base64
import json
import logging
from typing import Any, Dict, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.services.ai.base import AIProviderError, BaseLLMProvider

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini AI Provider implementing text, structured output, and multimodal image analysis.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        url = f"{self.BASE_URL}/{self.model_name}:generateContent?key={self.api_key}"
        
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        body: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
            },
        }

        if system_prompt:
            body["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=body)
            if resp.status_code != 200:
                logger.error(f"[Gemini Error] HTTP {resp.status_code}: {resp.text}")
                raise AIProviderError(f"Gemini API returned status {resp.status_code}: {resp.text}")

            data = resp.json()
            try:
                candidates = data.get("candidates", [])
                if not candidates:
                    raise AIProviderError("Gemini returned no candidates.")
                text = candidates[0]["content"]["parts"][0]["text"]
                return text.strip()
            except (KeyError, IndexError) as exc:
                logger.error(f"[Gemini Parse Error] Could not parse text: {data}")
                raise AIProviderError(f"Failed to parse Gemini response: {exc}")

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
            "Do not include any conversational filler or explanation outside the JSON."
        )

        raw_text = await self.generate_text(prompt=prompt, system_prompt=instruction, temperature=temperature)
        json_str = self.extract_json_block(raw_text)

        try:
            return response_schema.model_validate_json(json_str)
        except ValidationError as exc:
            logger.error(f"[Gemini Structured Parse Error] Invalid JSON schema: {json_str} | Error: {exc}")
            raise AIProviderError(f"Model response did not match schema: {exc}")

    async def analyze_image_structured(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> T:
        url = f"{self.BASE_URL}/{self.model_name}:generateContent?key={self.api_key}"
        base64_img = base64.b64encode(image_bytes).decode("utf-8")

        schema_json = json.dumps(response_schema.model_json_schema())
        full_system = (
            f"{system_prompt or 'You are an intelligent receipt, invoice, and payment screenshot scanner.'}\n\n"
            f"You MUST respond ONLY with a valid JSON object matching this JSON Schema:\n{schema_json}\n"
            "Extract accurate numbers, merchant/title, dates, and payment modes from the image."
        )

        body: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": base64_img,
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json",
            },
            "systemInstruction": {
                "parts": [{"text": full_system}]
            },
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=body)
            if resp.status_code != 200:
                logger.error(f"[Gemini Vision Error] HTTP {resp.status_code}: {resp.text}")
                raise AIProviderError(f"Gemini Vision API returned status {resp.status_code}: {resp.text}")

            data = resp.json()
            try:
                candidates = data.get("candidates", [])
                if not candidates:
                    raise AIProviderError("Gemini Vision returned no response.")
                raw_text = candidates[0]["content"]["parts"][0]["text"]
                json_str = self.extract_json_block(raw_text)
                return response_schema.model_validate_json(json_str)
            except (KeyError, IndexError, ValidationError) as exc:
                logger.error(f"[Gemini Vision Parse Error] {data} | Error: {exc}")
                raise AIProviderError(f"Failed to parse Gemini Vision response: {exc}")
