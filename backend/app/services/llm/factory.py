from app.models.models import LLMProvider
from app.services.llm.adapters.anthropic import AnthropicAdapter
from app.services.llm.adapters.base import LLMAdapter
from app.services.llm.adapters.ollama import OllamaAdapter
from app.services.llm.adapters.openai import OpenAIAdapter
from app.utils.crypto import decrypt


def get_adapter(provider: LLMProvider) -> LLMAdapter:
    api_key = decrypt(provider.api_key_encrypted) if provider.api_key_encrypted else ""

    if provider.provider_type == "openai":
        return OpenAIAdapter(
            api_key=api_key,
            model=provider.model,
            base_url=provider.base_url,
            temperature=provider.temperature,
            max_tokens=provider.max_tokens,
            top_p=provider.top_p,
        )
    elif provider.provider_type == "anthropic":
        return AnthropicAdapter(
            api_key=api_key,
            model=provider.model,
            temperature=provider.temperature,
            max_tokens=provider.max_tokens,
            top_p=provider.top_p,
        )
    elif provider.provider_type == "ollama":
        return OllamaAdapter(
            base_url=provider.base_url or "http://localhost:11434",
            model=provider.model,
            temperature=provider.temperature,
        )
    elif provider.provider_type == "custom":
        return OpenAIAdapter(
            api_key=api_key,
            model=provider.model,
            base_url=provider.base_url,
            temperature=provider.temperature,
            max_tokens=provider.max_tokens,
            top_p=provider.top_p,
        )
    else:
        raise ValueError(f"Unknown provider type: {provider.provider_type}")
