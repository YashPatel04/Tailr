import asyncio
import json

from app.services.research.scraper import (
    scrape_careers,
    search_engineering_blog,
    search_subreddits,
)


async def research_company(company: str, provider=None) -> dict:
    async def run_with_timeout(coro, timeout: float):
        try:
            return await asyncio.wait_for(coro, timeout=timeout)
        except asyncio.TimeoutError:
            return ""
        except Exception:
            return ""

    careers, blog, reddit = await asyncio.gather(
        run_with_timeout(scrape_careers(company), 5.0),
        run_with_timeout(search_engineering_blog(company), 5.0),
        run_with_timeout(search_subreddits(company), 5.0),
        return_exceptions=False,
    )

    corpus = f"Careers page:\n{careers}\n\nBlog:\n{blog}\n\nReddit:\n{reddit}"
    if not corpus.strip():
        return {"values": [], "hiring_signals": [], "tone_guidance": "No research data available."}

    values = []
    hiring_signals = []
    tone_guidance = ""

    corpus_lower = corpus.lower()
    value_keywords = ["mission", "values", "culture", "principles", "believe"]
    for kw in value_keywords:
        if kw in corpus_lower:
            values.append(kw)

    signal_keywords = ["hiring", "looking for", "seeking", "join our team", "we're growing"]
    for kw in signal_keywords:
        if kw in corpus_lower:
            hiring_signals.append(kw)

    if not values:
        values = ["Professionalism", "Quality", "Innovation"]
    if not hiring_signals:
        hiring_signals = ["Active hiring"]

    tone_guidance = (
        "Based on research, tailor the resume to emphasize technical depth "
        "and measurable impact. Use the company's terminology where visible."
    )

    return {"values": values, "hiring_signals": hiring_signals, "tone_guidance": tone_guidance}
