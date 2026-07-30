import json
import re

from pydantic import ValidationError

from app.models.resume_schema import ResumeContent

EXTRACTION_PROMPT = """You are a resume parser. Extract the content from this LaTeX document into the following JSON schema.

Return ONLY valid JSON — no markdown, no code fences, no explanatory text.

RESUME SCHEMA (JSON):
```json
{
  "basics": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "555-123-4567",
    "location": "City, State",
    "profiles": [{"network": "GitHub", "username": "user", "url": "https://github.com/user"}],
    "summary": null
  },
  "sections": [
    {
      "label": "SECTION NAME",
      "entries": [
        {
          "title": "Company or Institution",
          "role": "Job Title or Degree",
          "organization": null,
          "dates": "Jan 2020 - Dec 2021",
          "location": "City, State",
          "urls": {},
          "bullets": [
            {
              "text": "Bullet point text with no LaTeX formatting",
              "spans": [{"start": 0, "end": 5, "formats": ["bold"], "link_url": null}]
            }
          ]
        }
      ],
      "skill_rows": [
        {"category": "Skill Category", "items": "skill1, skill2, skill3"}
      ]
    }
  ]
}
```

INSTRUCTIONS:
1. Extract the name, email, phone, location from the header/center block.
2. For each \\section*{...} command, create a section with that label.
3. If a section has \\textbf{...:} lines (with colon), create skill_rows.
4. If a section has \\textbf{...} \\hfill ... header lines followed by itemize blocks, create entries with bullets.
5. Parse each entry header: \\textbf{Title} \\hfill \\textbf{Dates} on line 1, \\textit{Role} \\hfill \\textit{Location} on line 2 (if present).
6. For each \\item, extract the bullet text. Map \\textbf{...} to bold spans, \\textit{...} to italic spans, \\underline{...} to underline spans, \\texttt{...} to code spans. For entry-level \\href{url}{text} commands (not inside bullets), map to urls[url] = text (the display text becomes the mask). If \\href has no text mask, use the URL itself as the mask.
7. Map sections by their \\section* label. Preserve section order.
8. If you encounter LaTeX you cannot map, place it in the nearest element's metadata field (e.g., entry.metadata.raw_latex).
9. IMPORTANT: Return ONLY the JSON object. No markdown code fences, no explanatory text.
"""


class ImportError(Exception):
    pass


async def import_from_tex(tex_source: str, llm_adapter, max_retries: int = 2) -> ResumeContent:
    messages = [
        {"role": "system", "content": EXTRACTION_PROMPT},
        {"role": "user", "content": tex_source},
    ]

    for attempt in range(max_retries + 1):
        response = await llm_adapter.chat(messages)
        raw = response.content if hasattr(response, "content") else str(response)

        cleaned = raw.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            data = json.loads(cleaned)
            result = ResumeContent.model_validate(data)
            return result
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt < max_retries:
                messages.append({"role": "assistant", "content": raw})
                messages.append(
                    {
                        "role": "user",
                        "content": f"Your response was invalid: {str(e)}. Please fix and return ONLY valid JSON matching the schema.",
                    }
                )
            else:
                raise ImportError(f"Failed to import resume after {max_retries + 1} attempts: {e}")

    raise ImportError("Import failed")
