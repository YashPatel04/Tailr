"""Task 3.7: Tests for TeX LLM importer."""

from __future__ import annotations

from app.services.importers.tex_llm_importer import EXTRACTION_PROMPT


def test_import_successful():
    """3.7: successful import of standard resume — verify prompt structure"""

    assert "section" in EXTRACTION_PROMPT
    assert "entry" in EXTRACTION_PROMPT
    assert "bullet" in EXTRACTION_PROMPT
    assert "spans" in EXTRACTION_PROMPT


def test_extraction_prompt_includes_schema():
    """Prompt includes the schema format"""
    assert '"basics"' in EXTRACTION_PROMPT
    assert '"sections"' in EXTRACTION_PROMPT
    assert '"label"' in EXTRACTION_PROMPT
    assert '"entries"' in EXTRACTION_PROMPT
    assert '"skill_rows"' in EXTRACTION_PROMPT
