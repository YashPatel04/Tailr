"""Tests for the ContentOp types, ContentApplier, and ContentDiffer."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.resume_schema import (
    Basics,
    Bullet,
    Entry,
    FormatKind,
    ResumeContent,
    Section,
    SkillRow,
    Span,
)
from app.services.editing.content_ops import (
    AddBulletOp,
    AddEntryOp,
    AddSectionOp,
    AskOp,
    ContentApplier,
    ContentDiffer,
    DeleteBulletOp,
    DeleteEntryOp,
    DeleteSectionOp,
    MoveEntryOp,
    MoveSectionOp,
    ReorderBulletsOp,
    UpdateBasicsFieldOp,
    UpdateBulletOp,
    UpdateEntryUrlsOp,
    UpdateFieldOp,
    UpdateSkillRowOp,
)


def _make_sample_content() -> ResumeContent:
    return ResumeContent(
        basics=Basics(
            name="Jane Doe",
            email="jane@example.com",
            phone="555-1234",
            location="NYC",
            summary="A great engineer.",
        ),
        sections=[
            Section(
                label="Experience",
                entries=[
                    Entry(
                        title="Software Engineer",
                        role="Backend Lead",
                        organization="Acme Corp",
                        dates="2020–2024",
                        location="Remote",
                        bullets=[
                            Bullet(
                                text="Built APIs with FastAPI",
                                spans=[Span(start=0, end=5, formats=[FormatKind.BOLD])],
                            ),
                            Bullet(text="Led team of 5"),
                        ],
                    ),
                    Entry(
                        title="Junior Dev",
                        organization="Startup Inc",
                        dates="2018–2020",
                    ),
                ],
            ),
            Section(
                label="Education",
                entries=[
                    Entry(
                        title="B.S. Computer Science",
                        organization="State University",
                        dates="2014–2018",
                    ),
                ],
            ),
            Section(
                label="Skills",
                skill_rows=[
                    SkillRow(category="Languages", items="Python, Rust, TypeScript"),
                    SkillRow(category="Tools", items="Docker, Kubernetes"),
                ],
            ),
        ],
    )


class TestContentOpModels:
    def test_update_bullet_op(self):
        op = UpdateBulletOp(
            section_label="Experience",
            entry_index=0,
            bullet_index=1,
            text="New text",
        )
        assert op.op == "update_bullet"
        assert op.bullet_index == 1

    def test_add_entry_op(self):
        op = AddEntryOp(
            section_label="Experience",
            after_index=0,
            title="New Role",
            organization="NewCorp",
            bullets=[{"text": "Did stuff"}],
        )
        assert op.op == "add_entry"
        assert len(op.bullets) == 1

    def test_ask_op(self):
        from app.services.editing.content_ops import AskOp

        op = AskOp(question="What dates?", context="Experience section")
        assert op.op == "ask"

    def test_update_basics_field_op(self):
        op = UpdateBasicsFieldOp(field="summary", value="Updated summary")
        assert op.op == "update_basics_field"
        assert op.field == "summary"


class TestContentApplier:
    def setup_method(self):
        self.applier = ContentApplier()

    def test_update_bullet(self):
        content = _make_sample_content()
        ops = [
            UpdateBulletOp(
                section_label="Experience",
                entry_index=0,
                bullet_index=0,
                text="Built microservices with FastAPI",
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[0].entries[0].bullets[0].text == "Built microservices with FastAPI"
        assert result.sections[0].entries[0].bullets[0].spans  # preserved original spans

    def test_update_bullet_with_spans(self):
        content = _make_sample_content()
        ops = [
            UpdateBulletOp(
                section_label="Experience",
                entry_index=0,
                bullet_index=0,
                text="New text with spans",
                spans=[Span(start=0, end=3, formats=[FormatKind.BOLD])],
            )
        ]
        result = self.applier.apply(content, ops)
        assert len(result.sections[0].entries[0].bullets[0].spans) == 1
        assert result.sections[0].entries[0].bullets[0].spans[0].start == 0

    def test_update_bullet_with_dict_spans(self):
        content = _make_sample_content()
        ops = [
            UpdateBulletOp(
                section_label="Experience",
                entry_index=0,
                bullet_index=0,
                text="New text",
                spans=[{"start": 0, "end": 3, "formats": ["bold"]}],
            )
        ]
        result = self.applier.apply(content, ops)
        assert len(result.sections[0].entries[0].bullets[0].spans) == 1

    def test_add_entry_at_end(self):
        content = _make_sample_content()
        ops = [
            AddEntryOp(
                section_label="Experience",
                after_index=1,
                title="Senior Dev",
                organization="BigCo",
                bullets=[{"text": "Architected systems"}],
            )
        ]
        result = self.applier.apply(content, ops)
        assert len(result.sections[0].entries) == 3
        assert result.sections[0].entries[2].title == "Senior Dev"
        assert len(result.sections[0].entries[2].bullets) == 1

    def test_add_entry_at_beginning(self):
        content = _make_sample_content()
        ops = [
            AddEntryOp(
                section_label="Experience",
                after_index=-1,
                title="First Role",
                organization="Startup",
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[0].entries[0].title == "First Role"
        assert result.sections[0].entries[1].title == "Software Engineer"

    def test_delete_entry(self):
        content = _make_sample_content()
        ops = [DeleteEntryOp(section_label="Experience", entry_index=1)]
        result = self.applier.apply(content, ops)
        assert len(result.sections[0].entries) == 1
        assert result.sections[0].entries[0].title == "Software Engineer"

    def test_move_entry(self):
        content = _make_sample_content()
        ops = [MoveEntryOp(section_label="Experience", from_index=1, to_index=0)]
        result = self.applier.apply(content, ops)
        assert result.sections[0].entries[0].title == "Junior Dev"
        assert result.sections[0].entries[1].title == "Software Engineer"

    def test_update_field(self):
        content = _make_sample_content()
        ops = [
            UpdateFieldOp(
                section_label="Experience",
                entry_index=0,
                field="dates",
                value="2020–Present",
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[0].entries[0].dates == "2020–Present"

    def test_update_entry_urls(self):
        content = _make_sample_content()
        ops = [
            UpdateEntryUrlsOp(
                section_label="Experience",
                entry_index=0,
                urls={"https://new-url.com": "New Site"},
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[0].entries[0].urls == {"https://new-url.com": "New Site"}

    def test_update_entry_urls_to_empty(self):
        content = _make_sample_content()
        ops = [
            UpdateEntryUrlsOp(
                section_label="Experience",
                entry_index=0,
                urls={},
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[0].entries[0].urls == {}

    def test_add_section(self):
        content = _make_sample_content()
        ops = [AddSectionOp(after_index=2, label="Projects")]
        result = self.applier.apply(content, ops)
        assert len(result.sections) == 4
        assert result.sections[3].label == "Projects"

    def test_add_section_at_beginning(self):
        content = _make_sample_content()
        ops = [AddSectionOp(after_index=-1, label="Summary")]
        result = self.applier.apply(content, ops)
        assert result.sections[0].label == "Summary"

    def test_delete_section(self):
        content = _make_sample_content()
        ops = [DeleteSectionOp(section_label="Education")]
        result = self.applier.apply(content, ops)
        labels = [s.label for s in result.sections]
        assert "Education" not in labels
        assert len(result.sections) == 2

    def test_move_section(self):
        content = _make_sample_content()
        ops = [MoveSectionOp(from_index=2, to_index=0)]
        result = self.applier.apply(content, ops)
        assert result.sections[0].label == "Skills"

    def test_add_bullet(self):
        content = _make_sample_content()
        ops = [
            AddBulletOp(
                section_label="Experience",
                entry_index=0,
                after_index=1,
                text="New bullet point",
            )
        ]
        result = self.applier.apply(content, ops)
        assert len(result.sections[0].entries[0].bullets) == 3
        assert result.sections[0].entries[0].bullets[2].text == "New bullet point"

    def test_add_bullet_at_beginning(self):
        content = _make_sample_content()
        ops = [
            AddBulletOp(
                section_label="Experience",
                entry_index=0,
                after_index=-1,
                text="First bullet",
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[0].entries[0].bullets[0].text == "First bullet"

    def test_delete_bullet(self):
        content = _make_sample_content()
        ops = [
            DeleteBulletOp(
                section_label="Experience",
                entry_index=0,
                bullet_index=0,
            )
        ]
        result = self.applier.apply(content, ops)
        assert len(result.sections[0].entries[0].bullets) == 1
        assert result.sections[0].entries[0].bullets[0].text == "Led team of 5"

    def test_reorder_bullets(self):
        content = _make_sample_content()
        ops = [
            ReorderBulletsOp(
                section_label="Experience",
                entry_index=0,
                order=[1, 0],
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[0].entries[0].bullets[0].text == "Led team of 5"
        assert result.sections[0].entries[0].bullets[1].text == "Built APIs with FastAPI"

    def test_update_skill_row(self):
        content = _make_sample_content()
        ops = [
            UpdateSkillRowOp(
                section_label="Skills",
                skill_row_index=0,
                category="Programming Languages",
                items="Python, Rust, TypeScript, Go",
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[2].skill_rows[0].category == "Programming Languages"
        assert result.sections[2].skill_rows[0].items == "Python, Rust, TypeScript, Go"

    def test_update_skill_row_partial(self):
        content = _make_sample_content()
        ops = [
            UpdateSkillRowOp(
                section_label="Skills",
                skill_row_index=0,
                items="Python, Rust",
            )
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[2].skill_rows[0].category == "Languages"  # unchanged
        assert result.sections[2].skill_rows[0].items == "Python, Rust"

    def test_update_basics_field(self):
        content = _make_sample_content()
        ops = [UpdateBasicsFieldOp(field="summary", value="Updated summary text")]
        result = self.applier.apply(content, ops)
        assert result.basics.summary == "Updated summary text"

    def test_batch_ops(self):
        content = _make_sample_content()
        ops = [
            UpdateBulletOp(
                section_label="Experience",
                entry_index=0,
                bullet_index=0,
                text="Rewritten bullet",
            ),
            DeleteEntryOp(section_label="Experience", entry_index=1),
            AddSectionOp(after_index=-1, label="Summary"),
        ]
        result = self.applier.apply(content, ops)
        assert result.sections[0].label == "Summary"
        assert result.sections[1].entries[0].bullets[0].text == "Rewritten bullet"
        assert len(result.sections[1].entries) == 1

    def test_missing_section_raises(self):
        content = _make_sample_content()
        ops = [
            UpdateBulletOp(
                section_label="Nonexistent",
                entry_index=0,
                bullet_index=0,
                text="nope",
            )
        ]
        with pytest.raises(ValueError, match="Section 'Nonexistent' not found"):
            self.applier.apply(content, ops)

    def test_index_out_of_range_raises(self):
        content = _make_sample_content()
        ops = [
            UpdateBulletOp(
                section_label="Experience",
                entry_index=99,
                bullet_index=0,
                text="nope",
            )
        ]
        with pytest.raises(IndexError):
            self.applier.apply(content, ops)

    def test_validation_fails_on_invalid_spans(self):
        content = _make_sample_content()
        ops = [
            UpdateBulletOp(
                section_label="Experience",
                entry_index=0,
                bullet_index=0,
                text="short",
                spans=[Span(start=0, end=999)],
            )
        ]
        with pytest.raises(ValidationError, match="exceeds text length"):
            self.applier.apply(content, ops)

    def test_deep_copy_isolates_original(self):
        content = _make_sample_content()
        original_text = content.sections[0].entries[0].bullets[0].text
        ops = [
            UpdateBulletOp(
                section_label="Experience",
                entry_index=0,
                bullet_index=0,
                text="Modified",
            )
        ]
        result = self.applier.apply(content, ops)
        assert content.sections[0].entries[0].bullets[0].text == original_text
        assert result.sections[0].entries[0].bullets[0].text == "Modified"

    def test_update_basics_field_name(self):
        content = _make_sample_content()
        ops = [UpdateBasicsFieldOp(field="name", value="Jane Smith")]
        result = self.applier.apply(content, ops)
        assert result.basics.name == "Jane Smith"

    def test_update_basics_field_email(self):
        content = _make_sample_content()
        ops = [UpdateBasicsFieldOp(field="email", value="jane@new.com")]
        result = self.applier.apply(content, ops)
        assert result.basics.email == "jane@new.com"

    def test_update_basics_field_phone(self):
        content = _make_sample_content()
        ops = [UpdateBasicsFieldOp(field="phone", value="555-9999")]
        result = self.applier.apply(content, ops)
        assert result.basics.phone == "555-9999"

    def test_update_basics_field_location(self):
        content = _make_sample_content()
        ops = [UpdateBasicsFieldOp(field="location", value="San Francisco")]
        result = self.applier.apply(content, ops)
        assert result.basics.location == "San Francisco"


class TestContentDiffer:
    def setup_method(self):
        self.differ = ContentDiffer()

    def test_diff_modified_bullet(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(
            old,
            [
                UpdateBulletOp(
                    section_label="Experience",
                    entry_index=0,
                    bullet_index=0,
                    text="Modified bullet",
                )
            ],
        )
        result = self.differ.diff(old, new)
        changes = result["changes"]
        text_changes = [c for c in changes if c["path"].endswith(".text")]
        assert len(text_changes) == 1
        assert text_changes[0]["kind"] == "modified"
        assert text_changes[0]["new"] == "Modified bullet"

    def test_diff_new_section(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(old, [AddSectionOp(after_index=2, label="Projects")])
        result = self.differ.diff(old, new)
        added = [c for c in result["changes"] if c["kind"] == "added"]
        assert len(added) == 1
        assert "Projects" in added[0]["path"]

    def test_diff_deleted_entry(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(old, [DeleteEntryOp(section_label="Experience", entry_index=1)])
        result = self.differ.diff(old, new)
        removed = [c for c in result["changes"] if c["kind"] == "removed"]
        assert len(removed) == 1
        assert "entries[1]" in removed[0]["path"]

    def test_diff_modified_field(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(
            old,
            [
                UpdateFieldOp(
                    section_label="Experience",
                    entry_index=0,
                    field="dates",
                    value="2020–Present",
                )
            ],
        )
        result = self.differ.diff(old, new)
        field_changes = [c for c in result["changes"] if c.get("path", "").endswith(".dates")]
        assert len(field_changes) == 1
        assert field_changes[0]["kind"] == "modified"

    def test_diff_modified_basics_field(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(old, [UpdateBasicsFieldOp(field="summary", value="New summary")])
        result = self.differ.diff(old, new)
        basics_changes = [c for c in result["changes"] if c["path"].startswith("basics.")]
        assert len(basics_changes) == 1
        assert basics_changes[0]["new"] == "New summary"

    def test_diff_no_changes(self):
        old = _make_sample_content()
        new = _make_sample_content()
        result = self.differ.diff(old, new)
        assert result["changes"] == []

    def test_diff_new_bullet(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(
            old,
            [
                AddBulletOp(
                    section_label="Experience",
                    entry_index=0,
                    after_index=1,
                    text="New bullet",
                )
            ],
        )
        result = self.differ.diff(old, new)
        added = [c for c in result["changes"] if c["kind"] == "added"]
        assert len(added) == 1

    def test_diff_deleted_bullet(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(
            old,
            [
                DeleteBulletOp(
                    section_label="Experience",
                    entry_index=0,
                    bullet_index=0,
                )
            ],
        )
        result = self.differ.diff(old, new)
        removed = [c for c in result["changes"] if c["kind"] == "removed"]
        assert len(removed) == 1

    def test_diff_skill_row_modified(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(
            old,
            [
                UpdateSkillRowOp(
                    section_label="Skills",
                    skill_row_index=0,
                    items="Python, Rust, Go",
                )
            ],
        )
        result = self.differ.diff(old, new)
        assert len(result["changes"]) == 1

    def test_diff_removed_section(self):
        old = _make_sample_content()
        applier = ContentApplier()
        new = applier.apply(old, [DeleteSectionOp(section_label="Education")])
        result = self.differ.diff(old, new)
        removed = [c for c in result["changes"] if c["kind"] == "removed"]
        assert len(removed) >= 1
        assert any("Education" in c["path"] for c in removed)


# ---------------------------------------------------------------------------
# Task 4.5: Standalone content editing tests
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_content():
    c = ResumeContent(
        basics={"name": "Test", "email": "t@t.com"},
        sections=[
            {
                "id": "s1",
                "label": "EXPERIENCE",
                "entries": [
                    {
                        "id": "e1",
                        "title": "Company A",
                        "role": "Engineer",
                        "dates": "2024",
                        "bullets": [
                            {"id": "b1", "text": "Built stuff"},
                            {"id": "b2", "text": "Led team"},
                        ],
                    }
                ],
            },
            {
                "id": "s2",
                "label": "EDUCATION",
                "entries": [{"id": "e2", "title": "University", "dates": "2020-2024"}],
            },
        ],
    )
    return ResumeContent.model_validate(c.model_dump())


def test_update_bullet(sample_content):
    """Apply single op: update a bullet"""
    applier = ContentApplier()
    op = UpdateBulletOp(
        section_label="EXPERIENCE", entry_index=0, bullet_index=0, text="Built AMAZING stuff"
    )
    result = applier.apply(sample_content, [op])
    assert result.sections[0].entries[0].bullets[0].text == "Built AMAZING stuff"


def test_add_entry(sample_content):
    """Add a new entry"""
    applier = ContentApplier()
    op = AddEntryOp(
        section_label="EXPERIENCE", after_index=0, title="Company B", role="Dev", dates="2023"
    )
    result = applier.apply(sample_content, [op])
    assert len(result.sections[0].entries) == 2
    assert result.sections[0].entries[1].title == "Company B"


def test_delete_entry(sample_content):
    """Delete an entry"""
    applier = ContentApplier()
    op = DeleteEntryOp(section_label="EXPERIENCE", entry_index=0)
    result = applier.apply(sample_content, [op])
    assert len(result.sections[0].entries) == 0


def test_move_entry(sample_content):
    """Move entry from index 1 to index 0 (swap order)"""
    applier = ContentApplier()
    c = applier.apply(
        sample_content,
        [AddEntryOp(section_label="EXPERIENCE", after_index=0, title="B", role="R", dates="2023")],
    )
    assert len(c.sections[0].entries) == 2
    op = MoveEntryOp(section_label="EXPERIENCE", from_index=1, to_index=0)
    result = applier.apply(c, [op])
    assert result.sections[0].entries[0].title == "B"
    assert result.sections[0].entries[1].title == "Company A"


def test_update_field(sample_content):
    """Update a field on an entry"""
    applier = ContentApplier()
    op = UpdateFieldOp(section_label="EXPERIENCE", entry_index=0, field="dates", value="2025")
    result = applier.apply(sample_content, [op])
    assert result.sections[0].entries[0].dates == "2025"


def test_add_section(sample_content):
    """Add a new section"""
    applier = ContentApplier()
    op = AddSectionOp(after_index=1, label="PROJECTS")
    result = applier.apply(sample_content, [op])
    assert len(result.sections) == 3
    assert result.sections[2].label == "PROJECTS"


def test_delete_section(sample_content):
    """Delete a section by label"""
    applier = ContentApplier()
    op = DeleteSectionOp(section_label="EDUCATION")
    result = applier.apply(sample_content, [op])
    assert len(result.sections) == 1
    assert result.sections[0].label == "EXPERIENCE"


def test_move_section(sample_content):
    """Move a section"""
    applier = ContentApplier()
    op = MoveSectionOp(from_index=0, to_index=1)
    result = applier.apply(sample_content, [op])
    assert result.sections[0].label == "EDUCATION"
    assert result.sections[1].label == "EXPERIENCE"


def test_add_bullet(sample_content):
    """Add a bullet to an entry"""
    applier = ContentApplier()
    op = AddBulletOp(section_label="EXPERIENCE", entry_index=0, after_index=1, text="New bullet")
    result = applier.apply(sample_content, [op])
    assert len(result.sections[0].entries[0].bullets) == 3
    assert result.sections[0].entries[0].bullets[2].text == "New bullet"


def test_delete_bullet(sample_content):
    """Delete a bullet"""
    applier = ContentApplier()
    op = DeleteBulletOp(section_label="EXPERIENCE", entry_index=0, bullet_index=0)
    result = applier.apply(sample_content, [op])
    assert len(result.sections[0].entries[0].bullets) == 1
    assert result.sections[0].entries[0].bullets[0].text == "Led team"


def test_reorder_bullets(sample_content):
    """Reorder bullets"""
    applier = ContentApplier()
    op = ReorderBulletsOp(section_label="EXPERIENCE", entry_index=0, order=[1, 0])
    result = applier.apply(sample_content, [op])
    assert result.sections[0].entries[0].bullets[0].text == "Led team"
    assert result.sections[0].entries[0].bullets[1].text == "Built stuff"


def test_update_skill_row(sample_content):
    """Update a skill row -- add skill rows section first"""
    c = ResumeContent(
        basics={"name": "Test"},
        sections=[
            {
                "id": "s1",
                "label": "SKILLS",
                "skill_rows": [{"id": "sk1", "category": "Languages", "items": "Python, Java"}],
            }
        ],
    )
    c = ResumeContent.model_validate(c.model_dump())
    applier = ContentApplier()
    op = UpdateSkillRowOp(section_label="SKILLS", skill_row_index=0, items="Python, Java, Rust")
    result = applier.apply(c, [op])
    assert result.sections[0].skill_rows[0].items == "Python, Java, Rust"


def test_update_basics_field(sample_content):
    """Update a basics field"""
    applier = ContentApplier()
    op = UpdateBasicsFieldOp(field="name", value="New Name")
    result = applier.apply(sample_content, [op])
    assert result.basics.name == "New Name"


def test_missing_section_raises_error(sample_content):
    """Apply op to missing section raises error"""
    applier = ContentApplier()
    op = UpdateBulletOp(section_label="NONEXISTENT", entry_index=0, bullet_index=0, text="x")
    with pytest.raises(ValueError, match="not found"):
        applier.apply(sample_content, [op])


def test_batch_ops(sample_content):
    """Apply multiple ops in sequence"""
    applier = ContentApplier()
    ops = [
        UpdateBulletOp(section_label="EXPERIENCE", entry_index=0, bullet_index=0, text="Modified"),
        AddSectionOp(after_index=1, label="CERTIFICATIONS"),
        AddBulletOp(section_label="EXPERIENCE", entry_index=0, after_index=1, text="Extra bullet"),
    ]
    result = applier.apply(sample_content, ops)
    assert result.sections[0].entries[0].bullets[0].text == "Modified"
    assert result.sections[2].label == "CERTIFICATIONS"
    assert len(result.sections[0].entries[0].bullets) == 3


def test_diff_modified_bullet(sample_content):
    """Diff detects a modified bullet"""
    applier = ContentApplier()
    differ = ContentDiffer()
    op = UpdateBulletOp(
        section_label="EXPERIENCE", entry_index=0, bullet_index=0, text="Changed text"
    )
    new_content = applier.apply(sample_content, [op])
    diff = differ.diff(sample_content, new_content)
    changes = diff.get("changes", [])
    assert len(changes) > 0


def test_diff_added_section(sample_content):
    """Diff detects a new section"""
    applier = ContentApplier()
    differ = ContentDiffer()
    op = AddSectionOp(after_index=1, label="CERTIFICATIONS")
    new_content = applier.apply(sample_content, [op])
    diff = differ.diff(sample_content, new_content)
    changes = diff.get("changes", [])
    assert len(changes) > 0


def test_diff_deleted_entry(sample_content):
    """Diff detects a deleted entry"""
    applier = ContentApplier()
    differ = ContentDiffer()
    op = DeleteEntryOp(section_label="EDUCATION", entry_index=0)
    new_content = applier.apply(sample_content, [op])
    diff = differ.diff(sample_content, new_content)
    changes = diff.get("changes", [])
    assert len(changes) > 0


def test_ask_op():
    """AskOp validation"""
    op = AskOp(question="What is your GPA?", context="education section")
    assert op.op == "ask"
    assert op.question == "What is your GPA?"
