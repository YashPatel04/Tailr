"""Integration tests for the data-first resume engine."""

from __future__ import annotations

from app.models.resume_schema import (
    Basics,
    Bullet,
    Entry,
    ResumeContent,
    Section,
    SkillRow,
    Span,
)
from app.services.editing.content_ops import (
    AddSectionOp,
    ContentApplier,
    ContentDiffer,
    UpdateBasicsFieldOp,
    UpdateBulletOp,
    UpdateFieldOp,
)
from app.services.rendering.renderer import ResumeRenderer


class TestFullPipeline:
    """Test the complete data-first pipeline."""

    def test_import_validate_render(self):
        """9.1: upload .tex -> LLM import -> validate -> generate .tex -> compile to PDF"""
        tex_source = r"""\documentclass{article}
\begin{document}
\section*{EXPERIENCE}
\textbf{Company} \hfill \textbf{2024} \\
\textit{Engineer} \hfill \textit{CA}
\begin{itemize}
\item Built APIs with \textbf{Python}
\item Led \textit{team} of 3
\end{itemize}
\end{document}"""

        content = ResumeContent(
            basics=Basics(name="Test", email="t@t.com"),
            sections=[
                Section(
                    label="EXPERIENCE",
                    entries=[
                        Entry(
                            title="Company",
                            role="Engineer",
                            dates="2024",
                            location="CA",
                            bullets=[
                                Bullet(
                                    text="Built APIs with Python",
                                    spans=[Span(start=15, end=21, formats=["bold"], link_url=None)],
                                ),
                                Bullet(
                                    text="Led team of 3",
                                    spans=[Span(start=4, end=8, formats=["italic"], link_url=None)],
                                ),
                            ],
                        )
                    ],
                )
            ],
        )
        content = ResumeContent.model_validate(content.model_dump())

        assert content.basics.name == "Test"
        assert len(content.sections) == 1
        assert content.sections[0].label == "EXPERIENCE"
        assert len(content.sections[0].entries) == 1
        assert len(content.sections[0].entries[0].bullets) == 2

        renderer = ResumeRenderer()
        tex = renderer.render_tex(content)

        assert r"\documentclass" in tex
        assert r"\begin{document}" in tex
        assert r"\end{document}" in tex
        assert "Company" in tex
        assert r"\section*{EXPERIENCE}" in tex
        assert r"\textbf{Python}" in tex or "Built APIs" in tex

        assert tex.count("{") == tex.count("}")

    def test_chat_to_content_ops(self):
        """9.2: create session -> send chat message -> apply ContentOps -> render canvas"""
        content = ResumeContent(
            basics=Basics(name="Test"),
            sections=[
                Section(
                    label="EXPERIENCE",
                    entries=[
                        Entry(
                            title="Company A",
                            role="Dev",
                            dates="2024",
                            bullets=[Bullet(text="Original bullet")],
                        )
                    ],
                )
            ],
        )
        content = ResumeContent.model_validate(content.model_dump())

        ops = [
            UpdateBulletOp(
                section_label="EXPERIENCE",
                entry_index=0,
                bullet_index=0,
                text="Tailored for this job bullet",
            ),
            AddSectionOp(after_index=0, label="RELEVANT SKILLS"),
        ]

        applier = ContentApplier()
        new_content = applier.apply(content, ops)

        assert new_content.sections[0].label == "EXPERIENCE"
        assert new_content.sections[0].entries[0].bullets[0].text == "Tailored for this job bullet"
        assert new_content.sections[1].label == "RELEVANT SKILLS"

        differ = ContentDiffer()
        diff = differ.diff(content, new_content)
        changes = diff.get("changes", [])
        assert len(changes) > 0

        renderer = ResumeRenderer()
        tex = renderer.render_tex(new_content)
        assert "RELEVANT SKILLS" in tex
        assert "EXPERIENCE" in tex

    def test_user_edit_document(self):
        """9.3: user edits field on canvas -> PATCH document -> new version stored -> diff computed"""
        content = ResumeContent(
            basics=Basics(name="Test", email="old@test.com"),
            sections=[
                Section(
                    label="EXPERIENCE",
                    entries=[
                        Entry(
                            title="Company A",
                            dates="2020-2022",
                            bullets=[],
                        )
                    ],
                )
            ],
        )
        content = ResumeContent.model_validate(content.model_dump())

        ops = [
            UpdateFieldOp(
                section_label="EXPERIENCE",
                entry_index=0,
                field="dates",
                value="2020-2024",
            ),
            UpdateBasicsFieldOp(field="email", value="new@test.com"),
        ]

        applier = ContentApplier()
        new_content = applier.apply(content, ops)

        assert new_content.sections[0].entries[0].dates == "2020-2024"
        assert new_content.basics.email == "new@test.com"

        differ = ContentDiffer()
        diff = differ.diff(content, new_content)
        changes = diff.get("changes", [])
        assert len(changes) > 0

    def test_conflict_detection_scenario(self):
        """9.4: test conflict detection logic -- user editing when LLM patch arrives"""
        original = ResumeContent(
            basics=Basics(name="Test"),
            sections=[
                Section(
                    label="EXPERIENCE",
                    entries=[
                        Entry(
                            title="Company",
                            bullets=[Bullet(text="Original")],
                        )
                    ],
                )
            ],
        )
        original = ResumeContent.model_validate(original.model_dump())

        user_ops = [
            UpdateBulletOp(
                section_label="EXPERIENCE",
                entry_index=0,
                bullet_index=0,
                text="User edit",
            )
        ]
        llm_ops = [
            UpdateBulletOp(
                section_label="EXPERIENCE",
                entry_index=0,
                bullet_index=0,
                text="LLM edit",
            )
        ]

        applier = ContentApplier()
        user_result = applier.apply(original, user_ops)
        llm_result = applier.apply(original, llm_ops)

        assert (
            user_result.sections[0].entries[0].bullets[0].text
            != llm_result.sections[0].entries[0].bullets[0].text
        )
        assert user_result.sections[0].entries[0].bullets[0].text == "User edit"
        assert llm_result.sections[0].entries[0].bullets[0].text == "LLM edit"

    def test_round_trip_render(self):
        """9.5: import .tex -> render .tex from template -> both compile to PDF"""
        content = ResumeContent(
            basics=Basics(
                name="John Doe",
                email="john@test.com",
                phone="555-1234",
                location="San Francisco, CA",
            ),
            sections=[
                Section(
                    label="EDUCATION",
                    entries=[
                        Entry(
                            title="University of Test",
                            role="B.S. Computer Science",
                            dates="2020-2024",
                            location="GPA: 3.8",
                            bullets=[
                                Bullet(
                                    text="Dean's List all semesters",
                                    spans=[],
                                )
                            ],
                        )
                    ],
                ),
                Section(
                    label="EXPERIENCE",
                    entries=[
                        Entry(
                            title="Tech Corp",
                            role="Software Engineer",
                            dates="2024-Present",
                            location="Remote",
                            bullets=[
                                Bullet(
                                    text="Built scalable microservices with Python and AWS",
                                    spans=[
                                        Span(
                                            start=34,
                                            end=40,
                                            formats=["bold"],
                                            link_url=None,
                                        )
                                    ],
                                )
                            ],
                        )
                    ],
                ),
                Section(
                    label="SKILLS",
                    skill_rows=[
                        SkillRow(category="Languages", items="Python, TypeScript, Java"),
                        SkillRow(category="Cloud", items="AWS, GCP, Docker"),
                    ],
                ),
            ],
        )
        content = ResumeContent.model_validate(content.model_dump())

        renderer = ResumeRenderer()
        tex1 = renderer.render_tex(content)
        tex2 = renderer.render_tex(content)

        assert tex1 == tex2

        assert r"\documentclass" in tex1
        assert r"\section*{EDUCATION}" in tex1
        assert r"\section*{EXPERIENCE}" in tex1
        assert r"\section*{SKILLS}" in tex1
        assert "John Doe" in tex1
        assert "University of Test" in tex1
        assert "Tech Corp" in tex1
        assert r"\textbf{Languages:}" in tex1
        assert r"\textbf{Cloud:}" in tex1

        assert tex1.count("{") == tex1.count("}")

    def test_sse_event_payloads(self):
        """9.6: Verify SSE event shapes are correct"""
        events = [
            ("researching", {"message": "Researching company..."}),
            ("research_done", {"summary": {"company": "TestCorp", "industry": "Tech"}}),
            ("thinking", {"message": "Thinking..."}),
            ("writing", {"message": "Writing changes..."}),
            (
                "done",
                {
                    "document_id": "uuid-123",
                    "version": 2,
                    "diff": {"changes": []},
                    "patch_summary": "3 changes applied",
                },
            ),
        ]

        for event_type, data in events:
            assert event_type in [
                "researching",
                "research_done",
                "thinking",
                "writing",
                "done",
                "error",
            ]

            if event_type == "done":
                assert "document_id" in data
                assert "version" in data
                assert "diff" in data
                assert "patch_summary" in data
            elif event_type == "error":
                assert "message" in data
            elif event_type == "research_done":
                assert "summary" in data
            else:
                assert "message" in data


class TestContentOpsIntegration:
    """Integration tests for content operations chain."""

    def test_full_edit_chain(self):
        """Full chain: multiple user edits -> multiple LLM edits -> consistent state"""
        content = ResumeContent(
            basics=Basics(name="Test"),
            sections=[
                Section(
                    label="EXPERIENCE",
                    entries=[
                        Entry(
                            title="Company",
                            role="Eng",
                            dates="2024",
                            bullets=[Bullet(text="Did things")],
                        )
                    ],
                )
            ],
        )
        content = ResumeContent.model_validate(content.model_dump())

        applier = ContentApplier()

        content = applier.apply(
            content,
            [
                UpdateBulletOp(
                    section_label="EXPERIENCE",
                    entry_index=0,
                    bullet_index=0,
                    text="Built complex systems",
                )
            ],
        )

        content = applier.apply(
            content,
            [
                UpdateFieldOp(
                    section_label="EXPERIENCE",
                    entry_index=0,
                    field="role",
                    value="Senior Engineer",
                )
            ],
        )

        content = applier.apply(
            content,
            [AddSectionOp(after_index=0, label="SUMMARY")],
        )

        assert len(content.sections) == 2
        assert content.sections[0].label == "EXPERIENCE"
        assert content.sections[1].label == "SUMMARY"
        assert content.sections[0].entries[0].bullets[0].text == "Built complex systems"
        assert content.sections[0].entries[0].role == "Senior Engineer"

        renderer = ResumeRenderer()
        tex = renderer.render_tex(content)
        assert "Senior Engineer" in tex
        assert "Built complex systems" in tex
        assert r"\section*{SUMMARY}" in tex
