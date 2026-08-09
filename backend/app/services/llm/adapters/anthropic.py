from collections.abc import AsyncIterator

import httpx

from app.services.llm.adapters.base import LLMAdapter, LLMChunk, LLMResponse, ModelInfo


class AnthropicAdapter(LLMAdapter):
    def __init__(self, api_key: str, model: str = "", **params):
        self.api_key = api_key
        self.model = model
        self.params = params

    async def list_models(self) -> list[ModelInfo]:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                },
            )
            if response.status_code >= 400:
                raise RuntimeError(
                    f"Failed to list models ({response.status_code}): {response.text}"
                )
            data = response.json()
            models = []
            for m in data.get("data", []):
                model_id = m.get("id", "")
                display_name = m.get("display_name", model_id)
                models.append(ModelInfo(id=model_id, display_name=display_name))
            return models

    async def chat(
        self, messages: list[dict], stream: bool = False, **kwargs
    ) -> AsyncIterator[LLMChunk] | LLMResponse:
        system = next((m["content"] for m in messages if m.get("role") == "system"), None)
        chat_messages = [m for m in messages if m.get("role") != "system"]

        payload = {
            "model": self.model,
            "messages": chat_messages,
            "max_tokens": self.params.get("max_tokens", 4096),
        }
        if system:
            payload["system"] = system

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            data = response.json()
            content = data.get("content", [{}])[0].get("text", "")
            return LLMResponse(content=content)
