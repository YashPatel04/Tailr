"""Tests for the v3 LLM prompt builder."""

from __future__ import annotations

import json
import pytest
from unittest.mock import MagicMock

from app.models.resume_schema import (
    Basics,
    Bullet,
    Entry,
    ResumeContent,
    Section,
    SkillRow,
)
from app.services.llm.prompts import (
    MODE_INSTRUCTIONS,
    V3_SYSTEM_PROMPT,
    build_tailor_prompt_v3,
)


def _make_typical_content() -> ResumeContent:
    return ResumeContent(
        basics=Basics(
            name="Jane Smith",
            email="jane@example.com",
            phone="555-0100",
            location="San Francisco, CA",
            summary="Senior software engineer with 10 years of experience.",
        ),
        sections=[
            Section(
                label="Experience",
                entries=[
                    Entry(
                        title="Senior Software Engineer",
                        role="Backend Lead",
                        organization="Acme Corp",
                        dates="2020–Present",
                        location="Remote",
                        bullets=[
                            Bullet(text="Designed and built microservices architecture serving 1M+ users"),
                            Bullet(text="Led team of 5 engineers through 3 major releases"),
                            Bullet(text="Reduced API latency by 40% through query optimization"),
                        ],
                    ),
                    Entry(
                        title="Software Engineer",
                        organization="StartupCo",
                        dates="2017–2020",
                        location="New York, NY",
                        bullets=[
                            Bullet(text="Built real-time analytics dashboard using React and D3.js"),
                            Bullet(text="Implemented CI/CD pipeline reducing deploy time by 60%"),
                        ],
                    ),
                ],
            ),
            Section(
                label="Education",
                entries=[
                    Entry(
                        title="B.S. Computer Science",
                        organization="University of California",
                        dates="2013–2017",
                    ),
                ],
            ),
            Section(
                label="Skills",
                skill_rows=[
                    SkillRow(category="Languages", items="Python, JavaScript, TypeScript, Go"),
                    SkillRow(category="Frameworks", items="FastAPI, Django, React, Node.js"),
                    SkillRow(category="Infrastructure", items="AWS, Docker, Kubernetes, Terraform"),
                ],
            ),
        ],
    )


def _make_session_mock(mode="polish", job_description="", notes=""):
    session = MagicMock()
    session.tailoring_mode = mode
    session.job_description = job_description
    session.notes = notes
    return session


class TestBuildTailorPromptV3:
    def test_prompt_json_under_8kb(self):
        """Prompt should be under 8000 chars for typical resumes."""
        content = _make_typical_content()
        session = _make_session_mock(
            job_description="Looking for a senior backend engineer with Python and AWS experience."
        )
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system_content = messages[0]["content"]
        assert len(system_content) < 8000, f"System prompt is {len(system_content)} chars, should be < 8000"

    def test_prompt_contains_section_labels(self):
        content = _make_typical_content()
        session = _make_session_mock()
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system = messages[0]["content"]
        assert "Experience" in system
        assert "Education" in system
        assert "Skills" in system

    def test_prompt_contains_job_description(self):
        content = _make_typical_content()
        session = _make_session_mock(
            job_description="Looking for a Python developer with FastAPI experience."
        )
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system = messages[0]["content"]
        assert "Python developer" in system

    def test_prompt_excludes_byte_slices_and_opaque_nodes(self):
        content = _make_typical_content()
        session = _make_session_mock()
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system = messages[0]["content"]
        assert "byte_slice" not in system
        assert "opaque" not in system.lower()
        assert "tex_source" not in system

    def test_prompt_contains_path_based_ops_catalog(self):
        content = _make_typical_content()
        session = _make_session_mock()
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system = messages[0]["content"]
        assert "section_label" in system
        assert "entry_index" in system
        assert "bullet_index" in system
        assert "update_bullet" in system
        assert "add_entry" in system
        assert "delete_entry" in system
        assert "move_entry" in system
        assert "update_field" in system
        assert "add_section" in system
        assert "delete_section" in system
        assert "move_section" in system
        assert "add_bullet" in system
        assert "delete_bullet" in system
        assert "update_skill_row" in system
        assert "update_basics_field" in system
        assert "ask" in system

    def test_prompt_has_no_region_node_ids(self):
        """V3 should NOT reference Region tree node IDs since ops use path-based addressing."""
        content = _make_typical_content()
        session = _make_session_mock()
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system = messages[0]["content"]
        assert "node_id" not in system
        assert "Region" not in system
        assert "parent_entry" not in system
        assert "sibling_bullet_id" not in system
        assert "target" not in system.split("Available operations:")[1].split("IMPORTANT:")[0]

    def test_prompt_respects_tailoring_mode(self):
        content = _make_typical_content()
        session = _make_session_mock(mode="rewrite")
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system = messages[0]["content"]
        assert "Restructure aggressively" in system

    def test_prompt_includes_career_context(self):
        content = _make_typical_content()
        session = _make_session_mock()
        messages = build_tailor_prompt_v3(
            session,
            content,
            research_summary=None,
            career_context="Targeting FAANG companies.",
        )

        system = messages[0]["content"]
        assert "CAREER CONTEXT:" in system
        assert "Targeting FAANG companies" in system

    def test_prompt_includes_research_summary(self):
        content = _make_typical_content()
        session = _make_session_mock()
        research = {
            "company_info": "Leading cloud provider",
            "tech_stack": ["Python", "Kubernetes", "AWS"],
        }
        messages = build_tailor_prompt_v3(session, content, research_summary=research)

        system = messages[0]["content"]
        assert "Leading cloud provider" in system

    def test_prompt_returns_message_list(self):
        content = _make_typical_content()
        session = _make_session_mock()
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        assert isinstance(messages, list)
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert isinstance(messages[0]["content"], str)

    def test_content_json_is_valid_serialized(self):
        content = _make_typical_content()
        session = _make_session_mock()
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system = messages[0]["content"]
        json_start = system.find("```json\n") + len("```json\n")
        json_end = system.find("\n```", json_start)
        content_json_str = system[json_start:json_end]
        parsed = json.loads(content_json_str)
        assert parsed["basics"]["name"] == "Jane Smith"
        assert len(parsed["sections"]) == 3

    def test_default_mode_is_polish(self):
        content = _make_typical_content()
        session = MagicMock()
        session.tailoring_mode = None
        session.job_description = ""
        session.notes = ""
        messages = build_tailor_prompt_v3(session, content, research_summary=None)

        system = messages[0]["content"]
        assert "micro-edits" in system

    def test_empty_research_summary_does_not_crash(self):
        content = _make_typical_content()
        session = _make_session_mock()
        messages = build_tailor_prompt_v3(session, content, research_summary={})
        assert messages[0]["content"]


class TestV3SystemPrompt:
    def test_all_mode_instructions_present(self):
        assert "polish" in MODE_INSTRUCTIONS
        assert "refine" in MODE_INSTRUCTIONS
        assert "rewrite" in MODE_INSTRUCTIONS

    @pytest.mark.skip(reason="V2_SYSTEM_PROMPT removed — test not applicable")
    def test_v3_prompt_is_different_from_v2(self):
        pass

    def test_v3_prompt_includes_indexing_rules(self):
        assert "after_index: -1" in V3_SYSTEM_PROMPT
        assert "0-based array positions" in V3_SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# Task 5.3: Prompt tests with dict-based content
# ---------------------------------------------------------------------------

def _make_minimal_session_mock():
    session = MagicMock()
    session.tailoring_mode = "polish"
    session.job_description = ""
    session.notes = ""
    return session


def test_build_tailor_prompt_under_8kb():
    """Prompt JSON under 8KB for typical resume"""
    from app.services.llm.prompts import build_tailor_prompt_v3

    content = ResumeContent(
        basics={"name": "Test", "email": "t@t.com"},
        sections=[
            {"id": "s1", "label": "EXPERIENCE", "entries": [
                {"id": "e1", "title": "Company", "role": "Engineer", "dates": "2024", "bullets": [
                    {"id": "b1", "text": "Built things with python and react", "spans": []}
                ]}
            ]}
        ]
    )
    content = ResumeContent.model_validate(content.model_dump())

    session = _make_minimal_session_mock()
    messages = build_tailor_prompt_v3(session, content, {}, "")
    system_content = messages[0]["content"]
    assert len(system_content) < 8000


def test_prompt_contains_section_labels():
    """Prompt contains labeled sections with typed fields"""
    from app.services.llm.prompts import build_tailor_prompt_v3

    content = ResumeContent(
        basics={"name": "Test"},
        sections=[{"id": "s1", "label": "EXPERIENCE", "entries": [
            {"id": "e1", "title": "Acme Corp", "role": "Dev", "dates": "2024"}
        ]}]
    )
    content = ResumeContent.model_validate(content.model_dump())

    session = _make_minimal_session_mock()
    messages = build_tailor_prompt_v3(session, content, {}, "")
    system_content = messages[0]["content"]
    assert "EXPERIENCE" in system_content
    assert "Acme Corp" in system_content


def test_prompt_excludes_metadata_noise():
    """Prompt should not have byte slices or opaque nodes"""
    from app.services.llm.prompts import build_tailor_prompt_v3

    content = ResumeContent(basics={"name": "Test"})
    content = ResumeContent.model_validate(content.model_dump())

    session = _make_minimal_session_mock()
    messages = build_tailor_prompt_v3(session, content, {}, "")
    system_content = messages[0]["content"]
    assert "slice" not in system_content.lower() or "byte" not in system_content.lower()
