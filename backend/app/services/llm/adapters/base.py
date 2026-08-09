from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from pydantic import BaseModel


class LLMChunk(BaseModel):
    content: str
    finish_reason: str | None = None


class LLMResponse(BaseModel):
    content: str
    finish_reason: str | None = None


class ModelInfo(BaseModel):
    id: str
    display_name: str


class LLMAdapter(ABC):
    @abstractmethod
    async def chat(
        self, messages: list[dict], stream: bool = False, **kwargs
    ) -> AsyncIterator[LLMChunk] | LLMResponse: ...

    @abstractmethod
    async def list_models(self) -> list[ModelInfo]: ...
