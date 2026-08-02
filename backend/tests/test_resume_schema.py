from __future__ import annotations

import importlib.util
import sys

import pytest
from pydantic import ValidationError

_spec = importlib.util.spec_from_file_location("resume_schema", "app/models/resume_schema.py")
_resume_schema = importlib.util.module_from_spec(_spec)
sys.modules["resume_schema"] = _resume_schema
_spec.loader.exec_module(_resume_schema)

Basics = _resume_schema.Basics
Bullet = _resume_schema.Bullet
Entry = _resume_schema.Entry
FormatKind = _resume_schema.FormatKind
Profile = _resume_schema.Profile
ResumeContent = _resume_schema.ResumeContent
Section = _resume_schema.Section
SkillRow = _resume_schema.SkillRow
Span = _resume_schema.Span


class TestSpan:
    def test_span_basic(self):
        span = Span(start=0, end=5, formats=[FormatKind.BOLD])
        assert span.start == 0
        assert span.end == 5
        assert span.formats == [FormatKind.BOLD]
        assert span.link_url is None

    def test_span_with_link(self):
        span = Span(start=3, end=10, link_url="https://example.com")
        assert span.link_url == "https://example.com"

    def test_span_optional_formats(self):
        span = Span(start=0, end=1)
        assert span.formats == []


class TestProfile:
    def test_profile_basic(self):
        p = Profile(network="GitHub", username="octocat", url="https://github.com/octocat")
        assert p.network == "GitHub"
        assert p.username == "octocat"
        assert p.url == "https://github.com/octocat"


class TestBasics:
    def test_basics_minimal(self):
        b = Basics(name="Jane Doe")
        assert b.name == "Jane Doe"
        assert b.email is None
        assert b.profiles == []

    def test_basics_full(self):
        b = Basics(
            name="Jane Doe",
            email="jane@example.com",
            phone="555-1234",
            location="NYC",
        )
        assert b.email == "jane@example.com"
        assert b.phone == "555-1234"
        assert b.location == "NYC"
        assert b.name == "Jane Doe"

    def test_basics_with_profiles(self):
        b = Basics(
            name="Jane Doe",
            profiles=[
                Profile(network="GitHub", username="janedoe", url="https://github.com/janedoe"),
                Profile(
                    network="LinkedIn", username="janedoe", url="https://linkedin.com/in/janedoe"
                ),
            ],
        )
        assert len(b.profiles) == 2
        assert b.profiles[1].network == "LinkedIn"

    def test_basics_missing_name(self):
        with pytest.raises(ValidationError):
            Basics()


class TestBullet:
    def test_bullet_basic(self):
        b = Bullet(text="A bullet point")
        assert b.text == "A bullet point"
        assert b.spans == []
        assert len(b.id) > 0

    def test_bullet_uuid_generated(self):
        b1 = Bullet(text="one")
        b2 = Bullet(text="two")
        assert b1.id != b2.id

    def test_bullet_valid_spans(self):
        b = Bullet(
            text="hello world",
            spans=[Span(start=0, end=5, formats=[FormatKind.BOLD])],
        )
        assert b.spans[0].start == 0
        assert b.spans[0].end == 5

    def test_bullet_span_start_negative(self):
        with pytest.raises(ValidationError, match="span\\[0\\].start must be >= 0"):
            Bullet(
                text="hello",
                spans=[Span(start=-1, end=3)],
            )

    def test_bullet_span_end_exceeds_text(self):
        with pytest.raises(ValidationError, match="exceeds text length"):
            Bullet(
                text="hello",
                spans=[Span(start=1, end=10)],
            )

    def test_bullet_span_start_not_less_than_end(self):
        with pytest.raises(ValidationError, match="must be < span.end"):
            Bullet(
                text="hello",
                spans=[Span(start=3, end=3)],
            )

    def test_bullet_span_start_greater_than_end(self):
        with pytest.raises(ValidationError, match="must be < span.end"):
            Bullet(
                text="hello",
                spans=[Span(start=4, end=2)],
            )

    def test_bullet_multiple_spans_all_valid(self):
        b = Bullet(
            text="hello world again",
            spans=[
                Span(start=0, end=5, formats=[FormatKind.BOLD]),
                Span(start=6, end=11, formats=[FormatKind.ITALIC]),
                Span(start=12, end=17, formats=[FormatKind.CODE]),
            ],
        )
        assert len(b.spans) == 3

    def test_bullet_multiple_spans_one_invalid(self):
        with pytest.raises(ValidationError, match="exceeds text length"):
            Bullet(
                text="short",
                spans=[
                    Span(start=0, end=2),
                    Span(start=1, end=20),
                ],
            )


class TestEntry:
    def test_entry_minimal(self):
        e = Entry(title="Software Engineer")
        assert e.title == "Software Engineer"
        assert e.bullets == []
        assert e.metadata == {}

    def test_entry_uuid_generated(self):
        e1 = Entry(title="A")
        e2 = Entry(title="B")
        assert e1.id != e2.id

    def test_entry_full(self):
        e = Entry(
            title="Senior Dev",
            role="Backend Lead",
            organization="Acme Corp",
            dates="2020–2024",
            location="Remote",
            urls={"https://acme.com": "Acme Corp"},
            bullets=[Bullet(text="Built things")],
            metadata={"pinned": True},
        )
        assert e.role == "Backend Lead"
        assert len(e.bullets) == 1
        assert e.metadata["pinned"] is True
        assert e.urls["https://acme.com"] == "Acme Corp"

    def test_entry_missing_title(self):
        with pytest.raises(ValidationError):
            Entry()


class TestSkillRow:
    def test_skill_row_basic(self):
        sr = SkillRow(category="Languages", items="Python, Rust, TypeScript")
        assert sr.category == "Languages"
        assert sr.items == "Python, Rust, TypeScript"

    def test_skill_row_uuid_generated(self):
        sr1 = SkillRow(category="A", items="a")
        sr2 = SkillRow(category="B", items="b")
        assert sr1.id != sr2.id

    def test_skill_row_missing_fields(self):
        with pytest.raises(ValidationError):
            SkillRow()
        with pytest.raises(ValidationError):
            SkillRow(category="C")


class TestSection:
    def test_section_minimal(self):
        s = Section(label="Experience")
        assert s.label == "Experience"
        assert s.entries == []
        assert s.skill_rows == []
        assert s.metadata == {}

    def test_section_uuid_generated(self):
        s1 = Section(label="A")
        s2 = Section(label="B")
        assert s1.id != s2.id

    def test_section_with_entries(self):
        s = Section(
            label="Experience",
            entries=[Entry(title="Eng"), Entry(title="PM")],
        )
        assert len(s.entries) == 2
        assert s.entries[0].title == "Eng"

    def test_section_with_skill_rows(self):
        s = Section(
            label="Skills",
            skill_rows=[SkillRow(category="Languages", items="Python")],
        )
        assert len(s.skill_rows) == 1

    def test_section_metadata(self):
        s = Section(label="Projects", metadata={"display": "grid"})
        assert s.metadata["display"] == "grid"

    def test_section_missing_label(self):
        with pytest.raises(ValidationError):
            Section()


class TestResumeContent:
    def test_resume_content_minimal(self):
        rc = ResumeContent(basics=Basics(name="Jane Doe"))
        assert rc.basics.name == "Jane Doe"
        assert rc.sections == []
        assert rc.metadata == {}

    def test_resume_content_full(self):
        rc = ResumeContent(
            basics=Basics(
                name="Jane Doe",
                email="jane@example.com",
            ),
            sections=[
                Section(label="Experience"),
                Section(label="Education"),
            ],
            metadata={"version": 2},
        )
        assert len(rc.sections) == 2
        assert rc.metadata["version"] == 2

    def test_resume_content_missing_basics(self):
        with pytest.raises(ValidationError):
            ResumeContent()

    def test_resume_content_nested_invalid_bullet(self):
        with pytest.raises(ValidationError, match="exceeds text length"):
            ResumeContent(
                basics=Basics(name="Jane Doe"),
                sections=[
                    Section(
                        label="Experience",
                        entries=[
                            Entry(
                                title="Engineer",
                                bullets=[
                                    Bullet(
                                        text="short",
                                        spans=[Span(start=0, end=999)],
                                    )
                                ],
                            )
                        ],
                    )
                ],
            )
