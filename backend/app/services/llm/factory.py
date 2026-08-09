from app.models.models import LLMProvider
from app.services.llm.adapters.anthropic import AnthropicAdapter
from app.services.llm.adapters.base import LLMAdapter
from app.services.llm.adapters.ollama import OllamaAdapter
from app.services.llm.adapters.openai import OpenAIAdapter
from app.utils.crypto import decrypt


def get_adapter(
    provider: LLMProvider,
    model: str = "",
    temperature: float = 0.7,
    max_tokens: int = 4096,
    top_p: float = 1.0,
) -> LLMAdapter:
    api_key = decrypt(provider.api_key_encrypted) if provider.api_key_encrypted else ""

    if provider.provider_type == "openai":
        return OpenAIAdapter(
            api_key=api_key,
            model=model,
            base_url=provider.base_url,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
        )
    elif provider.provider_type == "anthropic":
        return AnthropicAdapter(
            api_key=api_key,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
        )
    elif provider.provider_type == "ollama":
        return OllamaAdapter(
            base_url=provider.base_url or "http://localhost:11434",
            model=model,
            temperature=temperature,
        )
    elif provider.provider_type == "custom":
        return OpenAIAdapter(
            api_key=api_key,
            model=model,
            base_url=provider.base_url,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
        )
    else:
        raise ValueError(f"Unknown provider type: {provider.provider_type}")
