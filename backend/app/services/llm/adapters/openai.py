import json
from collections.abc import AsyncIterator

import httpx

from app.services.llm.adapters.base import LLMAdapter, LLMChunk, LLMResponse, ModelInfo

# Prefixes for non-chat models to exclude
_NON_CHAT_PREFIXES = (
    "dall-e",
    "whisper",
    "tts",
    "text-embedding",
    "text-moderation",
    "text-search",
    "text-similarity",
    "babbage",
    "davinci",
    "ft:",
)


class OpenAIAdapter(LLMAdapter):
    def __init__(self, api_key: str, model: str = "", base_url: str | None = None, **params):
        self.api_key = api_key
        self.model = model
        self.base_url = (base_url or "https://api.openai.com").rstrip("/")
        self.params = params

    def _max_token_param(self) -> str:
        m = self.model.lower()
        if m.startswith("o"):
            return "max_completion_tokens"
        for suffix in ("gpt-4.1", "gpt-4.5", "gpt-5"):
            if suffix in m:
                return "max_completion_tokens"
        return "max_tokens"

    async def list_models(self) -> list[ModelInfo]:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}/v1/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            if response.status_code >= 400:
                raise RuntimeError(
                    f"Failed to list models ({response.status_code}): {response.text}"
                )
            data = response.json()
            models = []
            for m in data.get("data", []):
                model_id = m.get("id", "")
                if any(model_id.startswith(prefix) for prefix in _NON_CHAT_PREFIXES):
                    continue
                models.append(ModelInfo(id=model_id, display_name=model_id))
            models.sort(key=lambda x: x.id)
            return models

    async def chat(
        self, messages: list[dict], stream: bool = False, **kwargs
    ) -> AsyncIterator[LLMChunk] | LLMResponse:
        max_token_key = self._max_token_param()
        payload = {
            "model": self.model,
            "messages": messages,
            max_token_key: self.params.get("max_tokens", 4096),
            "stream": stream,
        }
        if max_token_key == "max_tokens":
            payload["temperature"] = self.params.get("temperature", 0.7)
            payload["top_p"] = self.params.get("top_p", 1.0)
        payload.update(kwargs)

        async with httpx.AsyncClient(timeout=120) as client:
            if stream:

                async def gen():
                    async with client.stream(
                        "POST",
                        f"{self.base_url}/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json=payload,
                    ) as response:
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data = line[6:]
                                if data == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data)
                                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield LLMChunk(content=content)
                                except json.JSONDecodeError:
                                    pass

                return gen()
            else:
                response = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                if response.status_code >= 400:
                    try:
                        err = response.json()
                        msg = err.get("error", {}).get("message", response.text)
                    except Exception:
                        msg = response.text or f"HTTP {response.status_code}"
                    raise RuntimeError(f"LLM API error ({response.status_code}): {msg}")
                data = response.json()
                if "error" in data:
                    raise RuntimeError(
                        f"LLM API error: {data['error'].get('message', data['error'])}"
                    )
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if not content:
                    raise RuntimeError(
                        f"LLM returned empty response. Full response: {json.dumps(data)[:500]}"
                    )
                return LLMResponse(content=content)
