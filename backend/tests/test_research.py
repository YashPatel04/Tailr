import pytest

from app.services.research.extractor import extract_company_name
from app.services.research.scraper import fetch_text


class TestCompanyExtraction:
    def test_extract_from_at_pattern(self):
        text = "We are looking for a senior engineer at Acme Corp. The role involves..."
        result = extract_company_name(text)
        assert result == "Acme Corp"

    def test_extract_from_is_hiring_pattern(self):
        text = "TechStart Inc. is a fast-growing startup. TechStart Inc. is looking for..."
        result = extract_company_name(text)
        assert result is not None

    def test_extract_none_for_no_match(self):
        text = "This is just a job description without a clear company name pattern."
        result = extract_company_name(text)
        assert result is None

    def test_extract_handles_multiline(self):
        text = "Join\nAcme Corp!\nWe are hiring engineers..."
        result = extract_company_name(text)
        assert result is not None


class TestResearchTimeboxing:
    @pytest.mark.asyncio
    async def test_fetch_text_timeout(self):
        with pytest.raises(Exception):
            await fetch_text("http://192.0.2.1/nonexistent", timeout=1.0)

    @pytest.mark.asyncio
    async def test_graceful_degradation_on_failure(self):
        from app.services.research.summarizer import research_company

        result = await research_company("NonexistentCompany XYZ")
        assert result is not None
        assert "values" in result
        assert "hiring_signals" in result
        assert "tone_guidance" in result
