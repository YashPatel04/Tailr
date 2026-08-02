"""Path-based content operations for the data-first resume engine.

Operations use section_label + indices instead of Region tree node IDs.
"""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Literal

from pydantic import BaseModel, Field

from app.models.resume_schema import (
    Bullet,
    CoverLetterContent,
    CoverLetterParagraph,
    Entry,
    FormatKind,
    Profile,
    ResumeContent,
    Section,
    SkillRow,
    Span,
)


class UpdateBulletOp(BaseModel):
    op: Literal["update_bullet"] = "update_bullet"
    section_label: str
    entry_index: int
    bullet_index: int
    text: str
    spans: list = Field(default_factory=list)
    bold_added: list[str] = Field(default_factory=list)
    bold_removed: list[str] = Field(default_factory=list)
    reasoning: str = ""


class AddEntryOp(BaseModel):
    op: Literal["add_entry"] = "add_entry"
    section_label: str
    after_index: int
    title: str
    role: str | None = None
    organization: str | None = None
    dates: str | None = None
    location: str | None = None
    urls: dict[str, str] = Field(default_factory=dict)
    bullets: list = Field(default_factory=list)
    reasoning: str = ""


class DeleteEntryOp(BaseModel):
    op: Literal["delete_entry"] = "delete_entry"
    section_label: str
    entry_index: int
    reasoning: str = ""


class MoveEntryOp(BaseModel):
    op: Literal["move_entry"] = "move_entry"
    section_label: str
    from_index: int
    to_index: int
    reasoning: str = ""


class UpdateFieldOp(BaseModel):
    op: Literal["update_field"] = "update_field"
    section_label: str
    entry_index: int
    field: Literal["title", "role", "organization", "dates", "location"]
    value: str | None
    reasoning: str = ""


class UpdateEntryUrlsOp(BaseModel):
    op: Literal["update_entry_urls"] = "update_entry_urls"
    section_label: str
    entry_index: int
    urls: dict[str, str] = Field(default_factory=dict)
    reasoning: str = ""


class AddSectionOp(BaseModel):
    op: Literal["add_section"] = "add_section"
    after_index: int
    label: str
    reasoning: str = ""


class DeleteSectionOp(BaseModel):
    op: Literal["delete_section"] = "delete_section"
    section_label: str
    reasoning: str = ""


class MoveSectionOp(BaseModel):
    op: Literal["move_section"] = "move_section"
    from_index: int
    to_index: int
    reasoning: str = ""


class AddBulletOp(BaseModel):
    op: Literal["add_bullet"] = "add_bullet"
    section_label: str
    entry_index: int
    after_index: int
    text: str
    spans: list = Field(default_factory=list)
    bold_added: list[str] = Field(default_factory=list)
    bold_removed: list[str] = Field(default_factory=list)
    reasoning: str = ""


class DeleteBulletOp(BaseModel):
    op: Literal["delete_bullet"] = "delete_bullet"
    section_label: str
    entry_index: int
    bullet_index: int
    reasoning: str = ""


class ReorderBulletsOp(BaseModel):
    op: Literal["reorder_bullets"] = "reorder_bullets"
    section_label: str
    entry_index: int
    order: list[int]
    reasoning: str = ""


class UpdateSkillRowOp(BaseModel):
    op: Literal["update_skill_row"] = "update_skill_row"
    section_label: str
    skill_row_index: int
    category: str | None = None
    items: str | None = None
    reasoning: str = ""


class DeleteSkillRowOp(BaseModel):
    op: Literal["delete_skill_row"] = "delete_skill_row"
    section_label: str
    skill_row_index: int
    reasoning: str = ""


class MoveSkillRowOp(BaseModel):
    op: Literal["move_skill_row"] = "move_skill_row"
    section_label: str
    from_index: int
    to_index: int
    reasoning: str = ""


class AddSkillRowOp(BaseModel):
    op: Literal["add_skill_row"] = "add_skill_row"
    section_label: str
    after_index: int = -1
    category: str = ""
    items: str = ""
    reasoning: str = ""


class UpdateBasicsFieldOp(BaseModel):
    op: Literal["update_basics_field"] = "update_basics_field"
    field: Literal["name", "email", "phone", "location", "profiles"]
    value: str
    reasoning: str = ""


class AskOp(BaseModel):
    op: Literal["ask"] = "ask"
    question: str
    context: str = ""


class UpdateSalutationOp(BaseModel):
    op: Literal["update_salutation"] = "update_salutation"
    text: str
    reasoning: str = ""


class UpdateParagraphOp(BaseModel):
    op: Literal["update_paragraph"] = "update_paragraph"
    id: str
    text: str
    reasoning: str = ""


class AddParagraphOp(BaseModel):
    op: Literal["add_paragraph"] = "add_paragraph"
    text: str
    after_id: str | None = None
    reasoning: str = ""


class DeleteParagraphOp(BaseModel):
    op: Literal["delete_paragraph"] = "delete_paragraph"
    id: str
    reasoning: str = ""


class ReorderParagraphsOp(BaseModel):
    op: Literal["reorder_paragraphs"] = "reorder_paragraphs"
    ids: list[str]
    reasoning: str = ""


class UpdateClosingOp(BaseModel):
    op: Literal["update_closing"] = "update_closing"
    text: str
    reasoning: str = ""


ContentOp = (
    UpdateBulletOp
    | AddEntryOp
    | DeleteEntryOp
    | MoveEntryOp
    | UpdateFieldOp
    | UpdateEntryUrlsOp
    | AddSectionOp
    | DeleteSectionOp
    | MoveSectionOp
    | AddBulletOp
    | DeleteBulletOp
    | ReorderBulletsOp
    | UpdateSkillRowOp
    | DeleteSkillRowOp
    | MoveSkillRowOp
    | AddSkillRowOp
    | UpdateBasicsFieldOp
    | AskOp
    | UpdateSalutationOp
    | UpdateParagraphOp
    | AddParagraphOp
    | DeleteParagraphOp
    | ReorderParagraphsOp
    | UpdateClosingOp
)

CoverLetterOp = (
    UpdateSalutationOp
    | UpdateParagraphOp
    | AddParagraphOp
    | DeleteParagraphOp
    | ReorderParagraphsOp
    | UpdateClosingOp
)

OP_CLASSES = [
    UpdateBulletOp,
    AddEntryOp,
    DeleteEntryOp,
    MoveEntryOp,
    UpdateFieldOp,
    UpdateEntryUrlsOp,
    AddSectionOp,
    DeleteSectionOp,
    MoveSectionOp,
    AddBulletOp,
    DeleteBulletOp,
    ReorderBulletsOp,
    UpdateSkillRowOp,
    DeleteSkillRowOp,
    MoveSkillRowOp,
    AddSkillRowOp,
    UpdateBasicsFieldOp,
    AskOp,
    UpdateSalutationOp,
    UpdateParagraphOp,
    AddParagraphOp,
    DeleteParagraphOp,
    ReorderParagraphsOp,
    UpdateClosingOp,
]


_OP_MAP: dict[str, type] = {cls.model_fields["op"].default: cls for cls in OP_CLASSES}


def op_from_dict(data: dict) -> ContentOp:
    op_type = data.get("op")
    if op_type not in _OP_MAP:
        raise ValueError(f"Unknown operation type: {op_type}")
    cls = _OP_MAP[op_type]
    kwargs = {k: v for k, v in data.items() if k != "op"}
    return cls(**kwargs)


def ops_from_list(data: list[dict]) -> list[ContentOp]:
    return [op_from_dict(item) for item in data]


def _span_from_dict(s: dict | Span) -> Span:
    if isinstance(s, Span):
        return s
    return Span(**s)


def _clamp_spans(bullet: Bullet) -> None:
    text_len = len(bullet.text)
    bullet.spans = [s for s in bullet.spans if s.start < text_len and s.end > s.start]
    for span in bullet.spans:
        span.end = min(span.end, text_len)


def _remap_spans(
    old_text: str,
    new_text: str,
    old_spans: list[Span],
    bold_added: list[str] | None = None,
    bold_removed: list[str] | None = None,
) -> list[Span]:
    bold_added = bold_added or []
    bold_removed = bold_removed or []

    working = list(old_spans)

    removed_words_lower = [w.lower() for w in bold_removed]
    working = [s for s in working if old_text[s.start : s.end].lower() not in removed_words_lower]

    new_spans: list[Span] = []
    for word in bold_added:
        idx = new_text.lower().find(word.lower())
        if idx >= 0:
            new_spans.append(
                Span(
                    start=idx,
                    end=idx + len(word),
                    formats=[FormatKind.BOLD],
                )
            )

    remaining: list[Span] = []
    for span in working:
        old_sub = old_text[span.start : span.end]
        if (
            0 <= span.start < span.end <= len(new_text)
            and new_text[span.start : span.end] == old_sub
        ):
            remaining.append(span)
        else:
            idx = new_text.lower().find(old_sub.lower())
            if idx >= 0:
                remaining.append(
                    Span(
                        start=idx,
                        end=idx + len(old_sub),
                        formats=span.formats,
                        link_url=span.link_url,
                    )
                )

    return new_spans + remaining


class ContentApplier:
    """Applies path-based ContentOps to a ResumeContent document."""

    def _get_section(self, content: ResumeContent, label: str) -> Section:
        label_lower = label.lower()
        for section in content.sections:
            if section.label.lower() == label_lower:
                return section
        raise ValueError(f"Section '{label}' not found")

    def _get_entry(self, section: Section, index: int) -> Entry:
        if index < 0 or index >= len(section.entries):
            raise IndexError(
                f"entry_index {index} out of range for section '{section.label}' "
                f"(has {len(section.entries)} entries)"
            )
        return section.entries[index]

    def _get_bullet(self, entry: Entry, index: int, section_label: str) -> Bullet:
        if index < 0 or index >= len(entry.bullets):
            raise IndexError(
                f"bullet_index {index} out of range for entry '{entry.title}' "
                f"in section '{section_label}' (has {len(entry.bullets)} bullets)"
            )
        return entry.bullets[index]

    def _get_skill_row(self, section: Section, index: int) -> SkillRow:
        if index < 0 or index >= len(section.skill_rows):
            raise IndexError(
                f"skill_row_index {index} out of range for section '{section.label}' "
                f"(has {len(section.skill_rows)} skill rows)"
            )
        return section.skill_rows[index]

    def apply(self, content: ResumeContent, ops: list[ContentOp]) -> ResumeContent:
        new_content = deepcopy(content)
        for op in ops:
            self._apply_one(new_content, op)
        for section in new_content.sections:
            for entry in section.entries:
                for bullet in entry.bullets:
                    _clamp_spans(bullet)
        ResumeContent.model_validate(new_content.model_dump())
        return new_content

    def apply_cover_letter(
        self, content: CoverLetterContent, ops: list[CoverLetterOp]
    ) -> CoverLetterContent:
        new_content = deepcopy(content)
        for op in ops:
            self._apply_cover_letter_one(new_content, op)
        return new_content

    def _apply_cover_letter_one(self, content: CoverLetterContent, op: CoverLetterOp) -> None:
        op_type = op.op

        if op_type == "update_salutation":
            content.salutation = op.text

        elif op_type == "update_paragraph":
            para = next((p for p in content.paragraphs if p.id == op.id), None)
            if not para:
                raise ValueError(f"Paragraph '{op.id}' not found")
            para.text = op.text

        elif op_type == "add_paragraph":
            new_para = CoverLetterParagraph(text=op.text)
            if op.after_id is None:
                content.paragraphs.insert(0, new_para)
            else:
                idx = next(
                    (i for i, p in enumerate(content.paragraphs) if p.id == op.after_id), None
                )
                if idx is None:
                    raise ValueError(f"Paragraph '{op.after_id}' not found")
                content.paragraphs.insert(idx + 1, new_para)

        elif op_type == "delete_paragraph":
            before = len(content.paragraphs)
            content.paragraphs = [p for p in content.paragraphs if p.id != op.id]
            if len(content.paragraphs) == before:
                raise ValueError(f"Paragraph '{op.id}' not found")

        elif op_type == "reorder_paragraphs":
            by_id = {p.id: p for p in content.paragraphs}
            reordered = []
            for pid in op.ids:
                if pid not in by_id:
                    raise ValueError(f"Paragraph '{pid}' not found in reorder")
                reordered.append(by_id[pid])
            content.paragraphs = reordered

        elif op_type == "update_closing":
            content.closing = op.text

    def _apply_one(self, content: ResumeContent, op: ContentOp) -> None:
        op_type = op.op

        if op_type == "ask":
            return

        elif op_type == "update_bullet":
            section = self._get_section(content, op.section_label)
            entry = self._get_entry(section, op.entry_index)
            bullet = self._get_bullet(entry, op.bullet_index, op.section_label)
            old_text = bullet.text
            old_spans = list(bullet.spans)
            bullet.text = op.text
            bullet.spans = _remap_spans(
                old_text,
                op.text,
                old_spans,
                bold_added=op.bold_added,
                bold_removed=op.bold_removed,
            )

        elif op_type == "add_entry":
            section = self._get_section(content, op.section_label)
            entry = Entry(
                title=op.title,
                role=op.role,
                organization=op.organization,
                dates=op.dates,
                location=op.location,
                urls=op.urls,
            )
            for b_data in op.bullets or []:
                if isinstance(b_data, dict):
                    bullet = Bullet(text=b_data["text"])
                    if "spans" in b_data:
                        bullet.spans = [_span_from_dict(s) for s in b_data["spans"]]
                else:
                    bullet = Bullet(text=b_data.text)
                _clamp_spans(bullet)
                entry.bullets.append(bullet)
            if op.after_index == -1:
                section.entries.insert(0, entry)
            else:
                insert_at = min(op.after_index + 1, len(section.entries))
                section.entries.insert(insert_at, entry)

        elif op_type == "delete_entry":
            section = self._get_section(content, op.section_label)
            self._get_entry(section, op.entry_index)
            section.entries.pop(op.entry_index)

        elif op_type == "move_entry":
            section = self._get_section(content, op.section_label)
            self._get_entry(section, op.from_index)
            entry = section.entries.pop(op.from_index)
            to_idx = op.to_index
            if to_idx > op.from_index:
                to_idx -= 1
            to_idx = max(0, min(to_idx, len(section.entries)))
            section.entries.insert(to_idx, entry)

        elif op_type == "update_field":
            section = self._get_section(content, op.section_label)
            entry = self._get_entry(section, op.entry_index)
            setattr(entry, op.field, op.value)

        elif op_type == "update_entry_urls":
            section = self._get_section(content, op.section_label)
            entry = self._get_entry(section, op.entry_index)
            entry.urls = dict(op.urls)

        elif op_type == "add_section":
            section = Section(label=op.label)
            if op.after_index == -1:
                content.sections.insert(0, section)
            else:
                insert_at = min(op.after_index + 1, len(content.sections))
                content.sections.insert(insert_at, section)

        elif op_type == "delete_section":
            content.sections = [s for s in content.sections if s.label != op.section_label]

        elif op_type == "move_section":
            if op.from_index < 0 or op.from_index >= len(content.sections):
                raise IndexError(f"move_section from_index {op.from_index} out of range")
            section = content.sections.pop(op.from_index)
            to_idx = max(0, min(op.to_index, len(content.sections)))
            content.sections.insert(to_idx, section)

        elif op_type == "add_bullet":
            section = self._get_section(content, op.section_label)
            entry = self._get_entry(section, op.entry_index)
            bullet = Bullet(text=op.text, spans=[_span_from_dict(s) for s in op.spans])
            _clamp_spans(bullet)
            if op.after_index == -1:
                entry.bullets.insert(0, bullet)
            else:
                insert_at = min(op.after_index + 1, len(entry.bullets))
                entry.bullets.insert(insert_at, bullet)

        elif op_type == "delete_bullet":
            section = self._get_section(content, op.section_label)
            entry = self._get_entry(section, op.entry_index)
            self._get_bullet(entry, op.bullet_index, op.section_label)
            entry.bullets.pop(op.bullet_index)

        elif op_type == "reorder_bullets":
            section = self._get_section(content, op.section_label)
            entry = self._get_entry(section, op.entry_index)
            max_idx = len(entry.bullets)
            valid_order = [i for i in op.order if 0 <= i < max_idx]
            if valid_order:
                reordered = [entry.bullets[i] for i in valid_order]
                entry.bullets = reordered

        elif op_type == "update_skill_row":
            section = self._get_section(content, op.section_label)
            row = self._get_skill_row(section, op.skill_row_index)
            if op.category is not None:
                row.category = op.category
            if op.items is not None:
                row.items = op.items

        elif op_type == "delete_skill_row":
            section = self._get_section(content, op.section_label)
            self._get_skill_row(section, op.skill_row_index)
            section.skill_rows.pop(op.skill_row_index)

        elif op_type == "move_skill_row":
            section = self._get_section(content, op.section_label)
            self._get_skill_row(section, op.from_index)
            row = section.skill_rows.pop(op.from_index)
            to_idx = op.to_index
            if to_idx > op.from_index:
                to_idx -= 1
            to_idx = max(0, min(to_idx, len(section.skill_rows)))
            section.skill_rows.insert(to_idx, row)

        elif op_type == "add_skill_row":
            section = self._get_section(content, op.section_label)
            row = SkillRow(category=op.category, items=op.items)
            if op.after_index == -1:
                section.skill_rows.insert(0, row)
            else:
                insert_at = min(op.after_index + 1, len(section.skill_rows))
                section.skill_rows.insert(insert_at, row)

        elif op_type == "update_basics_field":
            if op.field == "profiles":
                profiles_data = json.loads(op.value)
                content.basics.profiles = [
                    Profile(**p) if isinstance(p, dict) else p for p in profiles_data
                ]
            else:
                setattr(content.basics, op.field, op.value)

    def _find_section(self, content: ResumeContent, label: str) -> Section:
        label_lower = label.lower()
        for section in content.sections:
            if section.label.lower() == label_lower:
                return section
        raise ValueError(f"Section '{label}' not found")
