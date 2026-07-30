from collections.abc import AsyncIterator

import httpx

from app.services.llm.adapters.base import LLMAdapter, LLMChunk, LLMResponse


class OllamaAdapter(LLMAdapter):
    def __init__(self, base_url: str, model: str, **params):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.params = params

    async def chat(
        self, messages: list[dict], stream: bool = False, **kwargs
    ) -> AsyncIterator[LLMChunk] | LLMResponse:
        payload = {"model": self.model, "messages": messages, "stream": stream}

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            data = response.json()
            content = data.get("message", {}).get("content", "")
            return LLMResponse(content=content)
