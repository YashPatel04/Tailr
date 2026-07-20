from abc import ABC, abstractmethod
from typing import AsyncIterator

from pydantic import BaseModel


class LLMChunk(BaseModel):
    content: str
    finish_reason: str | None = None


class LLMResponse(BaseModel):
    content: str
    finish_reason: str | None = None


class LLMAdapter(ABC):
    @abstractmethod
    async def chat(self, messages: list[dict], stream: bool = False, **kwargs) -> AsyncIterator[LLMChunk] | LLMResponse:
        ...
