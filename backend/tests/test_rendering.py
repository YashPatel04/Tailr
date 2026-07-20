from __future__ import annotations

import os
import subprocess
import tempfile

import pytest

from app.models.resume_schema import (
    Basics,
    Bullet,
    Entry,
    FormatKind,
    Profile,
    ResumeContent,
    Section,
    SkillRow,
    Span,
)
from app.services.rendering.renderer import ResumeRenderer, span_format_filter


def _has_pdflatex() -> bool:
    return subprocess.run(["which", "pdflatex"], capture_output=True).returncode == 0


class TestSpanFormatFilter:
    def test_empty_text(self):
        result = span_format_filter("", [])
        assert result == ""

    def test_no_spans(self):
        result = span_format_filter("hello world", [])
        assert result == "hello world"

    def test_single_bold_span(self):
        spans = [Span(start=0, end=5, formats=[FormatKind.BOLD])]
        result = span_format_filter("hello world", spans)
        assert result == "\\textbf{hello} world"

    def test_single_italic_span(self):
        spans = [Span(start=6, end=11, formats=[FormatKind.ITALIC])]
        result = span_format_filter("hello world", spans)
        assert result == "hello \\textit{world}"

    def test_single_underline_span(self):
        spans = [Span(start=0, end=11, formats=[FormatKind.UNDERLINE])]
        result = span_format_filter("hello world", spans)
        assert result == "\\underline{hello world}"

    def test_single_code_span(self):
        spans = [Span(start=0, end=4, formats=[FormatKind.CODE])]
        result = span_format_filter("code here", spans)
        assert result == "\\texttt{code} here"

    def test_nested_bold_and_italic(self):
        spans = [
            Span(start=0, end=12, formats=[FormatKind.BOLD]),
            Span(start=5, end=12, formats=[FormatKind.ITALIC]),
        ]
        result = span_format_filter("hello world folks", spans)
        assert "hello" in result
        assert "\\textbf{" in result
        assert "\\textit{" in result
        assert result.count("{") == result.count("}")

    def test_adjacent_spans_bold_then_italic(self):
        spans = [
            Span(start=0, end=5, formats=[FormatKind.BOLD]),
            Span(start=6, end=11, formats=[FormatKind.ITALIC]),
        ]
        result = span_format_filter("hello world", spans)
        assert result == "\\textbf{hello} \\textit{world}"

    def test_span_with_link_url(self):
        spans = [Span(start=0, end=4, formats=[FormatKind.BOLD], link_url="https://example.com")]
        result = span_format_filter("text here", spans)
        assert "\\href{https://example.com}" in result
        assert "\\textbf{" in result
        assert result.count("{") == result.count("}")

    def test_link_url_as_outermost_wrapper(self):
        spans = [Span(start=0, end=4, formats=[FormatKind.BOLD], link_url="https://x.com")]
        result = span_format_filter("text", spans)
        href_pos = result.index("\\href")
        bf_pos = result.index("\\textbf")
        assert bf_pos < href_pos

    def test_multiple_formats_on_single_span(self):
        spans = [Span(start=0, end=4, formats=[FormatKind.BOLD, FormatKind.ITALIC])]
        result = span_format_filter("text", spans)
        assert result.count("{") == result.count("}")
        assert "\\textbf{" in result
        assert "\\textit{" in result

    def test_span_at_text_boundaries(self):
        spans = [Span(start=0, end=5, formats=[FormatKind.BOLD])]
        result = span_format_filter("hello", spans)
        assert result == "\\textbf{hello}"

    def test_overlapping_spans_with_different_links(self):
        spans = [
            Span(start=0, end=6, formats=[FormatKind.BOLD], link_url="https://a.com"),
            Span(start=3, end=10, formats=[FormatKind.ITALIC], link_url="https://b.com"),
        ]
        result = span_format_filter("0123456789", spans)
        assert result.count("{") == result.count("}")

    def test_code_and_underline_formats(self):
        spans = [
            Span(start=0, end=4, formats=[FormatKind.CODE]),
            Span(start=2, end=6, formats=[FormatKind.UNDERLINE]),
        ]
        result = span_format_filter("codeit", spans)
        assert result.count("{") == result.count("}")
        assert "\\texttt{" in result
        assert "\\underline{" in result

    def test_dict_spans(self):
        spans = [{"start": 0, "end": 4, "formats": ["bold"], "link_url": None}]
        result = span_format_filter("text", spans)
        assert result == "\\textbf{text}"

    def test_zero_length_text_with_spans(self):
        result = span_format_filter("", [Span(start=0, end=0, formats=[FormatKind.BOLD])])
        assert result == ""


class TestResumeRenderer:
    def _make_content(self) -> ResumeContent:
        return ResumeContent(
            basics=Basics(
                name="John Doe",
                email="john@example.com",
                phone="555-0123",
                location="New York, NY",
                profiles=[
                    Profile(network="GitHub", username="johndoe", url="https://github.com/johndoe"),
                    Profile(network="LinkedIn", username="johndoe", url="https://linkedin.com/in/johndoe"),
                ],
                summary="Experienced software engineer.",
            ),
            sections=[
                Section(
                    label="Experience",
                    entries=[
                        Entry(
                            title="Senior Engineer",
                            role="Backend Lead",
                            organization="Acme Corp",
                            dates="2020--Present",
                            location="Remote",
                            url="https://acme.com",
                            bullets=[
                                Bullet(
                                    text="Built scalable web services using Python and FastAPI",
                                    spans=[
                                        Span(start=0, end=5, formats=[FormatKind.BOLD]),
                                        Span(start=28, end=34, formats=[FormatKind.CODE]),
                                    ],
                                ),
                                Bullet(
                                    text="Led team of 5 engineers across three time zones",
                                ),
                            ],
                        ),
                    ],
                ),
                Section(
                    label="Skills",
                    skill_rows=[
                        SkillRow(category="Languages", items="Python, TypeScript, Rust"),
                        SkillRow(category="Frameworks", items="FastAPI, React, Next.js"),
                    ],
                ),
            ],
        )

    def test_render_tex_produces_string(self):
        renderer = ResumeRenderer()
        content = self._make_content()
        tex = renderer.render_tex(content)
        assert isinstance(tex, str)
        assert len(tex) > 0

    def test_render_tex_contains_expected_commands(self):
        renderer = ResumeRenderer()
        content = self._make_content()
        tex = renderer.render_tex(content)

        assert "\\documentclass" in tex
        assert "\\begin{document}" in tex
        assert "\\end{document}" in tex
        assert "John Doe" in tex
        assert "john@example.com" in tex
        assert "555-0123" in tex
        assert "New York, NY" in tex
        assert "Experience" in tex
        assert "Senior Engineer" in tex
        assert "Backend Lead" in tex
        assert "Acme Corp" in tex
        assert "2020--Present" in tex
        assert "Led team of 5 engineers" in tex
        assert "\\textbf{Built}" in tex or "\\textbf{" in tex
        assert "\\texttt{Python}" in tex or "\\texttt{" in tex
        assert "Skills" in tex
        assert "Languages" in tex
        assert "Python, TypeScript, Rust" in tex
        assert "Frameworks" in tex
        assert "\\href{https://github.com/johndoe}" in tex
        assert "\\href{https://linkedin.com/in/johndoe}" in tex

    def test_render_tex_balanced_braces(self):
        renderer = ResumeRenderer()
        content = self._make_content()
        tex = renderer.render_tex(content)
        assert tex.count("{") == tex.count("}")

    def test_render_html_produces_string(self):
        renderer = ResumeRenderer()
        content = self._make_content()
        html = renderer.render_html(content)
        assert isinstance(html, str)
        assert len(html) > 0
        assert "<!DOCTYPE html>" in html
        assert "John Doe" in html

    @pytest.mark.skipif(not _has_pdflatex(), reason="pdflatex not available")
    def test_render_tex_compiles_with_pdflatex(self):
        renderer = ResumeRenderer()
        content = self._make_content()
        tex = renderer.render_tex(content)

        with tempfile.TemporaryDirectory() as tmpdir:
            tex_path = os.path.join(tmpdir, "resume.tex")
            with open(tex_path, "w") as f:
                f.write(tex)

            result = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", tex_path],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=30,
            )

            assert result.returncode == 0, f"pdflatex failed:\n{result.stderr}\n{result.stdout}"
            assert os.path.exists(os.path.join(tmpdir, "resume.pdf"))

    def test_render_tex_no_content_produces_valid_document(self):
        renderer = ResumeRenderer()
        content = ResumeContent(
            basics=Basics(name="Minimal"),
            sections=[],
        )
        tex = renderer.render_tex(content)
        assert "\\begin{document}" in tex
        assert "\\end{document}" in tex
        assert "Minimal" in tex

    def test_render_tex_entry_without_role_or_location(self):
        renderer = ResumeRenderer()
        content = ResumeContent(
            basics=Basics(name="Test"),
            sections=[
                Section(
                    label="Projects",
                    entries=[
                        Entry(
                            title="Open Source Tool",
                            dates="2024",
                            bullets=[Bullet(text="Released v1.0")],
                        ),
                    ],
                ),
            ],
        )
        tex = renderer.render_tex(content)
        assert "Open Source Tool" in tex
        assert "Released v1.0" in tex

    def test_render_tex_entry_with_url(self):
        renderer = ResumeRenderer()
        content = ResumeContent(
            basics=Basics(name="Test"),
            sections=[
                Section(
                    label="Projects",
                    entries=[
                        Entry(
                            title="My Project",
                            dates="2024",
                            url="https://project.example.com",
                            bullets=[Bullet(text="Built it")],
                        ),
                    ],
                ),
            ],
        )
        tex = renderer.render_tex(content)
        assert "\\href{" in tex
        assert "https://project.example.com" in tex

    def test_render_tex_escapes_special_latex_chars(self):
        renderer = ResumeRenderer()
        content = ResumeContent(
            basics=Basics(name="A & B Co."),
            sections=[
                Section(
                    label="Experience",
                    entries=[
                        Entry(
                            title="Dev @ 50%",
                            dates="2024",
                            bullets=[Bullet(text="Increased revenue by 20%")],
                        ),
                    ],
                ),
            ],
        )
        tex = renderer.render_tex(content)
        assert "\\begin{document}" in tex
        assert "\\end{document}" in tex
        assert "A & B Co." in tex


# ---------------------------------------------------------------------------
# Task 2.5: Render known ResumeContent, verify output contains expected LaTeX
# ---------------------------------------------------------------------------

def test_render_tex_basic():
    """2.5: render known ResumeContent, verify output contains expected LaTeX commands"""
    content = ResumeContent(
        basics={"name": "John Doe", "email": "john@test.com", "phone": "555", "location": "CA"},
        sections=[{"id": "s1", "label": "EXPERIENCE", "entries": [
            {"id": "e1", "title": "Company", "role": "Engineer", "dates": "2024", "bullets": [
                {"id": "b1", "text": "Built things", "spans": []}
            ]}
        ]}]
    )
    content = ResumeContent.model_validate(content.model_dump())
    renderer = ResumeRenderer()
    tex = renderer.render_tex(content)

    assert r'\documentclass' in tex
    assert 'John Doe' in tex
    assert r'\section*{EXPERIENCE}' in tex
    assert r'\textbf{Company}' in tex
    assert r'\item Built things' in tex
    assert r'\end{document}' in tex


def test_render_empty_resume():
    """Minimal content produces valid tex"""
    content = ResumeContent(basics={"name": "Test"})
    content = ResumeContent.model_validate(content.model_dump())
    renderer = ResumeRenderer()
    tex = renderer.render_tex(content)
    assert r'\documentclass' in tex
    assert 'Test' in tex
    assert r'\end{document}' in tex


def test_render_skill_rows():
    """Skill rows render with bold category"""
    content = ResumeContent(
        basics={"name": "Test"},
        sections=[{"id": "s1", "label": "SKILLS", "skill_rows": [
            {"id": "sk1", "category": "Languages", "items": "Python, Java"}
        ]}]
    )
    content = ResumeContent.model_validate(content.model_dump())
    renderer = ResumeRenderer()
    tex = renderer.render_tex(content)
    assert r'\textbf{Languages:}' in tex


# ---------------------------------------------------------------------------
# Task 2.6: span_format edge cases via dict spans
# ---------------------------------------------------------------------------

def test_span_format_single_bold():
    result = span_format_filter("Hello World", [{"start": 0, "end": 5, "formats": ["bold"], "link_url": None}])
    assert result == r'\textbf{Hello} World'


def test_span_format_single_italic():
    result = span_format_filter("Hello World", [{"start": 0, "end": 5, "formats": ["italic"], "link_url": None}])
    assert result == r'\textit{Hello} World'


def test_span_format_nested_bold_italic():
    result = span_format_filter("abcde", [
        {"start": 0, "end": 4, "formats": ["bold"], "link_url": None},
        {"start": 1, "end": 3, "formats": ["italic"], "link_url": None}
    ])
    assert r'\textbf' in result
    assert r'\textit' in result
    assert result.count('{') == result.count('}')


def test_span_format_adjacent():
    result = span_format_filter("ab", [
        {"start": 0, "end": 1, "formats": ["bold"], "link_url": None},
        {"start": 1, "end": 2, "formats": ["italic"], "link_url": None}
    ])
    assert r'\textbf{a}' in result
    assert r'\textit{b}' in result


def test_span_format_with_link():
    result = span_format_filter("click", [
        {"start": 0, "end": 5, "formats": ["bold"], "link_url": "https://example.com"}
    ])
    assert r'\href{https://example.com}' in result
    assert r'\textbf{' in result
    assert 'click' in result


def test_span_format_empty_spans():
    result = span_format_filter("plain", [])
    assert result == "plain"


def test_span_format_underline():
    result = span_format_filter("text", [{"start": 0, "end": 4, "formats": ["underline"], "link_url": None}])
    assert r'\underline{text}' in result


def test_span_format_code():
    result = span_format_filter("code", [{"start": 0, "end": 4, "formats": ["code"], "link_url": None}])
    assert r'\texttt{code}' in result


def test_render_html_basic():
    """HTML rendering produces valid HTML"""
    content = ResumeContent(basics={"name": "Test"})
    content = ResumeContent.model_validate(content.model_dump())
    renderer = ResumeRenderer()
    html = renderer.render_html(content)
    assert '<!DOCTYPE html>' in html or '<html>' in html or '<div' in html
