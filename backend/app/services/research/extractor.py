import re

import httpx
from bs4 import BeautifulSoup


async def fetch_jd_text(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(["script", "style", "nav", "header", "footer"]):
            tag.decompose()

        article = soup.find("article") or soup.find("main") or soup.find("body")
        if article:
            text = article.get_text(separator="\n", strip=True)
        else:
            text = soup.get_text(separator="\n", strip=True)

        return text[:20000]


def extract_company_name(jd_text: str) -> str | None:
    patterns = [
        r"at\s+([A-Z][A-Za-z0-9\s&.]+?)(?: is|,|\n|\.)",
        r"([A-Z][A-Za-z0-9\s&.]+?) is (?:a|an|hiring|looking)",
        r"Join\s+([A-Z][A-Za-z0-9\s&.]+?)(?:!|\.|\n)",
        r"About\s+([A-Z][A-Za-z0-9\s&.]+?)\n",
    ]
    for pattern in patterns:
        match = re.search(pattern, jd_text)
        if match:
            name = match.group(1).strip()
            if len(name) < 50:
                return name
    return None
