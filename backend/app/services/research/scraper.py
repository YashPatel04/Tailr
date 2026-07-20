import httpx
from bs4 import BeautifulSoup


async def fetch_text(url: str, timeout: float = 5.0) -> str:
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(["script", "style", "nav", "header", "footer"]):
            tag.decompose()

        parts = []
        for tag in soup.find_all(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6"]):
            text = tag.get_text(strip=True)
            if text:
                parts.append(text)

        result = "\n".join(parts)
        return result[:8000]


async def scrape_careers(company: str) -> str:
    domain = company.lower().replace(" ", "")
    urls = [
        f"https://careers.{domain}.com",
        f"https://www.{domain}.com/careers",
        f"https://www.{domain}.com/jobs",
    ]
    for url in urls:
        try:
            return await fetch_text(url, timeout=5.0)
        except Exception:
            continue
    return ""


async def search_engineering_blog(company: str) -> str:
    try:
        from duckduckgo_search import DDGS

        results = DDGS().text(f"{company} engineering blog", max_results=3)
        texts = []
        for r in results:
            try:
                texts.append(await fetch_text(r["href"], timeout=5.0))
            except Exception:
                continue
        return "\n".join(texts)
    except Exception:
        return ""


async def search_subreddits(company: str) -> str:
    try:
        from duckduckgo_search import DDGS

        queries = [
            f"site:reddit.com/r/ExperiencedDevs {company}",
            f"site:reddit.com/r/cscareerquestions {company}",
        ]
        texts = []
        for q in queries:
            try:
                results = DDGS().text(q, max_results=3)
                for r in results:
                    texts.append(r.get("title", "") + "\n" + r.get("body", ""))
            except Exception:
                continue
        return "\n".join(texts)
    except Exception:
        return ""
