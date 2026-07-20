from __future__ import annotations

from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator


class FormatKind(str, Enum):
    BOLD = "bold"
    ITALIC = "italic"
    UNDERLINE = "underline"
    CODE = "code"


class Span(BaseModel):
    start: int
    end: int
    formats: list[FormatKind] = Field(default_factory=list)
    link_url: str | None = None


class Profile(BaseModel):
    network: str
    username: str
    url: str


class Basics(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    profiles: list[Profile] = Field(default_factory=list)
    summary: str | None = None


class Bullet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    text: str
    spans: list[Span] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_spans(self):
        text_len = len(self.text)
        for i, span in enumerate(self.spans):
            if span.start < 0:
                raise ValueError(f"span[{i}].start must be >= 0, got {span.start}")
            if span.end > text_len:
                raise ValueError(
                    f"span[{i}].end ({span.end}) exceeds text length ({text_len})"
                )
            if span.start >= span.end:
                raise ValueError(
                    f"span[{i}].start ({span.start}) must be < span.end ({span.end})"
                )
        return self


class Entry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    role: str | None = None
    organization: str | None = None
    dates: str | None = None
    location: str | None = None
    url: str | None = None
    bullets: list[Bullet] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SkillRow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    category: str
    items: str


class Section(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    label: str
    entries: list[Entry] = Field(default_factory=list)
    skill_rows: list[SkillRow] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ResumeContent(BaseModel):
    basics: Basics
    sections: list[Section] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
