"""Path-based content operations for the data-first resume engine.

Operations use section_label + indices instead of Region tree node IDs.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Literal, Union

from pydantic import BaseModel, Field

from app.models.resume_schema import (
    Bullet,
    Entry,
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
    url: str | None = None
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
    field: Literal["title", "role", "organization", "dates", "location", "url"]
    value: str | None
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


class UpdateBasicsFieldOp(BaseModel):
    op: Literal["update_basics_field"] = "update_basics_field"
    field: Literal["name", "email", "phone", "location", "summary"]
    value: str
    reasoning: str = ""


class AskOp(BaseModel):
    op: Literal["ask"] = "ask"
    question: str
    context: str = ""


ContentOp = Union[
    UpdateBulletOp,
    AddEntryOp,
    DeleteEntryOp,
    MoveEntryOp,
    UpdateFieldOp,
    AddSectionOp,
    DeleteSectionOp,
    MoveSectionOp,
    AddBulletOp,
    DeleteBulletOp,
    ReorderBulletsOp,
    UpdateSkillRowOp,
    UpdateBasicsFieldOp,
    AskOp,
]

OP_CLASSES = [
    UpdateBulletOp,
    AddEntryOp,
    DeleteEntryOp,
    MoveEntryOp,
    UpdateFieldOp,
    AddSectionOp,
    DeleteSectionOp,
    MoveSectionOp,
    AddBulletOp,
    DeleteBulletOp,
    ReorderBulletsOp,
    UpdateSkillRowOp,
    UpdateBasicsFieldOp,
    AskOp,
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


class ContentApplier:
    """Applies path-based ContentOps to a ResumeContent document."""

    def apply(self, content: ResumeContent, ops: list[ContentOp]) -> ResumeContent:
        new_content = deepcopy(content)
        for op in ops:
            self._apply_one(new_content, op)
        ResumeContent.model_validate(new_content.model_dump())
        return new_content

    def _apply_one(self, content: ResumeContent, op: ContentOp) -> None:
        op_type = op.op

        if op_type == "ask":
            return

        elif op_type == "update_bullet":
            section = self._find_section(content, op.section_label)
            entry = section.entries[op.entry_index]
            bullet = entry.bullets[op.bullet_index]
            bullet.text = op.text
            if op.spans:
                bullet.spans = [_span_from_dict(s) for s in op.spans]

        elif op_type == "add_entry":
            section = self._find_section(content, op.section_label)
            entry = Entry(
                title=op.title,
                role=op.role,
                organization=op.organization,
                dates=op.dates,
                location=op.location,
                url=op.url,
            )
            for b_data in op.bullets or []:
                if isinstance(b_data, dict):
                    bullet = Bullet(text=b_data["text"])
                    if "spans" in b_data:
                        bullet.spans = [_span_from_dict(s) for s in b_data["spans"]]
                else:
                    bullet = Bullet(text=b_data.text)
                entry.bullets.append(bullet)
            if op.after_index == -1:
                section.entries.insert(0, entry)
            else:
                section.entries.insert(op.after_index + 1, entry)

        elif op_type == "delete_entry":
            section = self._find_section(content, op.section_label)
            section.entries.pop(op.entry_index)

        elif op_type == "move_entry":
            section = self._find_section(content, op.section_label)
            entry = section.entries.pop(op.from_index)
            if op.to_index > op.from_index:
                op.to_index -= 1
            section.entries.insert(op.to_index, entry)

        elif op_type == "update_field":
            section = self._find_section(content, op.section_label)
            entry = section.entries[op.entry_index]
            setattr(entry, op.field, op.value)

        elif op_type == "add_section":
            section = Section(label=op.label)
            if op.after_index == -1:
                content.sections.insert(0, section)
            else:
                content.sections.insert(op.after_index + 1, section)

        elif op_type == "delete_section":
            content.sections = [s for s in content.sections if s.label != op.section_label]

        elif op_type == "move_section":
            section = content.sections.pop(op.from_index)
            content.sections.insert(op.to_index, section)

        elif op_type == "add_bullet":
            section = self._find_section(content, op.section_label)
            entry = section.entries[op.entry_index]
            bullet = Bullet(text=op.text, spans=[_span_from_dict(s) for s in op.spans])
            if op.after_index == -1:
                entry.bullets.insert(0, bullet)
            else:
                entry.bullets.insert(op.after_index + 1, bullet)

        elif op_type == "delete_bullet":
            section = self._find_section(content, op.section_label)
            entry = section.entries[op.entry_index]
            entry.bullets.pop(op.bullet_index)

        elif op_type == "reorder_bullets":
            section = self._find_section(content, op.section_label)
            entry = section.entries[op.entry_index]
            reordered = [entry.bullets[i] for i in op.order]
            entry.bullets = reordered

        elif op_type == "update_skill_row":
            section = self._find_section(content, op.section_label)
            row = section.skill_rows[op.skill_row_index]
            if op.category is not None:
                row.category = op.category
            if op.items is not None:
                row.items = op.items

        elif op_type == "update_basics_field":
            setattr(content.basics, op.field, op.value)

    def _find_section(self, content: ResumeContent, label: str) -> Section:
        for section in content.sections:
            if section.label == label:
                return section
        raise ValueError(f"Section '{label}' not found")


class ContentDiffer:
    """Compares old vs new ResumeContent and produces a human-readable DiffChangeSet."""

    def diff(self, old: ResumeContent, new: ResumeContent) -> dict:
        changes: list[dict] = []

        old_d = old.model_dump(mode="json")
        new_d = new.model_dump(mode="json")

        self._compare_basics(old_d.get("basics", {}), new_d.get("basics", {}), changes)
        self._compare_sections(
            old_d.get("sections", []),
            new_d.get("sections", []),
            changes,
        )

        return {"changes": changes}

    def _compare_basics(self, old: dict, new: dict, changes: list[dict]) -> None:
        for field in ("name", "email", "phone", "location", "summary"):
            ov = old.get(field)
            nv = new.get(field)
            if ov != nv:
                changes.append({
                    "path": f"basics.{field}",
                    "kind": "modified",
                    "old": ov,
                    "new": nv,
                })

    def _compare_sections(
        self, old_sections: list[dict], new_sections: list[dict], changes: list[dict]
    ) -> None:
        old_by_label = {s["label"]: s for s in old_sections}
        new_by_label = {s["label"]: s for s in new_sections}

        old_labels = set(old_by_label.keys())
        new_labels = set(new_by_label.keys())

        for label in old_labels - new_labels:
            old_idx = next(i for i, s in enumerate(old_sections) if s["label"] == label)
            changes.append({
                "path": f"sections[{old_idx}].{label}",
                "kind": "removed",
            })

        for label in new_labels - old_labels:
            new_idx = next(i for i, s in enumerate(new_sections) if s["label"] == label)
            changes.append({
                "path": f"sections[{new_idx}].{label}",
                "kind": "added",
                "new": new_by_label[label],
            })

        for label in old_labels & new_labels:
            old_s = old_by_label[label]
            new_s = new_by_label[label]
            old_idx = next(i for i, s in enumerate(old_sections) if s["label"] == label)
            new_idx = next(i for i, s in enumerate(new_sections) if s["label"] == label)

            self._compare_entries(
                old_s.get("entries", []),
                new_s.get("entries", []),
                label,
                old_idx,
                new_idx,
                changes,
            )

            self._compare_skill_rows(
                old_s.get("skill_rows", []),
                new_s.get("skill_rows", []),
                label,
                new_idx,
                changes,
            )

            if old_s.get("metadata") != new_s.get("metadata"):
                changes.append({
                    "path": f"sections.{label}.metadata",
                    "kind": "modified",
                    "old": old_s.get("metadata"),
                    "new": new_s.get("metadata"),
                })

    def _compare_entries(
        self,
        old_entries: list[dict],
        new_entries: list[dict],
        section_label: str,
        _old_section_idx: int,
        _new_section_idx: int,
        changes: list[dict],
    ) -> None:
        min_len = min(len(old_entries), len(new_entries))
        for i in range(min_len):
            self._compare_entry_fields(
                old_entries[i],
                new_entries[i],
                i,
                section_label,
                changes,
            )
            self._compare_bullets(
                old_entries[i].get("bullets", []),
                new_entries[i].get("bullets", []),
                i,
                section_label,
                changes,
            )

        if len(new_entries) > len(old_entries):
            for i in range(len(old_entries), len(new_entries)):
                changes.append({
                    "path": f"sections.{section_label}.entries[{i}]",
                    "kind": "added",
                    "new": new_entries[i],
                })
        elif len(old_entries) > len(new_entries):
            for i in range(len(new_entries), len(old_entries)):
                changes.append({
                    "path": f"sections.{section_label}.entries[{i}]",
                    "kind": "removed",
                })

    def _compare_entry_fields(
        self,
        old_entry: dict,
        new_entry: dict,
        entry_idx: int,
        section_label: str,
        changes: list[dict],
    ) -> None:
        prefix = f"sections.{section_label}.entries[{entry_idx}]"
        for field in ("title", "role", "organization", "dates", "location", "url"):
            ov = old_entry.get(field)
            nv = new_entry.get(field)
            if ov != nv:
                changes.append({
                    "path": f"{prefix}.{field}",
                    "kind": "modified",
                    "old": ov,
                    "new": nv,
                })

    def _compare_bullets(
        self,
        old_bullets: list[dict],
        new_bullets: list[dict],
        entry_idx: int,
        section_label: str,
        changes: list[dict],
    ) -> None:
        min_len = min(len(old_bullets), len(new_bullets))
        prefix = f"sections.{section_label}.entries[{entry_idx}]"
        for i in range(min_len):
            ot = old_bullets[i].get("text")
            nt = new_bullets[i].get("text")
            if ot != nt:
                changes.append({
                    "path": f"{prefix}.bullets[{i}].text",
                    "kind": "modified",
                    "old": ot,
                    "new": nt,
                })
            os_spans = old_bullets[i].get("spans")
            ns_spans = new_bullets[i].get("spans")
            if os_spans != ns_spans:
                changes.append({
                    "path": f"{prefix}.bullets[{i}].spans",
                    "kind": "modified",
                    "old": os_spans,
                    "new": ns_spans,
                })

        if len(new_bullets) > len(old_bullets):
            for i in range(len(old_bullets), len(new_bullets)):
                changes.append({
                    "path": f"{prefix}.bullets[{i}]",
                    "kind": "added",
                    "new": new_bullets[i],
                })
        elif len(old_bullets) > len(new_bullets):
            for i in range(len(new_bullets), len(old_bullets)):
                changes.append({
                    "path": f"{prefix}.bullets[{i}]",
                    "kind": "removed",
                })

    def _compare_skill_rows(
        self,
        old_rows: list[dict],
        new_rows: list[dict],
        section_label: str,
        _new_section_idx: int,
        changes: list[dict],
    ) -> None:
        min_len = min(len(old_rows), len(new_rows))
        prefix = f"sections.{section_label}"
        for i in range(min_len):
            oc = old_rows[i].get("category")
            nc = new_rows[i].get("category")
            if oc != nc:
                changes.append({
                    "path": f"{prefix}.skill_rows[{i}].category",
                    "kind": "modified",
                    "old": oc,
                    "new": nc,
                })
            oi = old_rows[i].get("items")
            ni = new_rows[i].get("items")
            if oi != ni:
                changes.append({
                    "path": f"{prefix}.skill_rows[{i}].items",
                    "kind": "modified",
                    "old": oi,
                    "new": ni,
                })

        if len(new_rows) > len(old_rows):
            for i in range(len(old_rows), len(new_rows)):
                changes.append({
                    "path": f"{prefix}.skill_rows[{i}]",
                    "kind": "added",
                    "new": new_rows[i],
                })
        elif len(old_rows) > len(new_rows):
            for i in range(len(new_rows), len(old_rows)):
                changes.append({
                    "path": f"{prefix}.skill_rows[{i}]",
                    "kind": "removed",
                })
