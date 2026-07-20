"""Prompt builders for LLM tailoring."""
from __future__ import annotations

import json

from app.models.resume_schema import ResumeContent


MODE_INSTRUCTIONS = {
    "polish": (
        "SURGICAL micro-edits — only change what needs changing. "
        "If a bullet is already strong and relevant, leave it alone. "
        "Do NOT reorder sections. Aim for 3-7 targeted operations. "
        "Keep changes minimal: word choice, phrasing, small additions."
    ),
    "refine": "You may reorder sections and reorganize content. Focus on impactful changes; skip unchanged content. Use `ask` if information is missing.",
    "rewrite": "Restructure aggressively while preserving facts. Reorder, rephrase, and reorganize as needed. Only emit operations for what changed.",
}

V3_SYSTEM_PROMPT = """
You are a professional resume editor. Your task is to tailor a resume to a specific job description.

{career_context_section}

RESEARCH SUMMARY:
{research_summary}

JOB DESCRIPTION:
{job_description}

TAILORING MODE: {mode}
{mode_instruction}

RESUME CONTENT (JSON):
```json
{resume_content}
```

Return ONLY a valid JSON object with a single key "operations" containing an array of typed operations.

Every operation uses path-based addressing: section labels and integer indices (0-based).
Target sections by their `label` field (e.g., "Experience", "Education").
Target entries, bullets, and skill rows by their array index within the parent section/entry.

Available operations:

- {{"op": "update_bullet", "section_label": "Experience", "entry_index": 0, "bullet_index": 1, "text": "<rewritten bullet>", "spans": [], "reasoning": "<why>"}}
- {{"op": "add_bullet", "section_label": "Experience", "entry_index": 0, "after_index": 1, "text": "<new bullet>", "spans": [], "reasoning": "<why>"}}
- {{"op": "delete_bullet", "section_label": "Experience", "entry_index": 0, "bullet_index": 2, "reasoning": "<why>"}}
- {{"op": "reorder_bullets", "section_label": "Experience", "entry_index": 0, "order": [2, 0, 1], "reasoning": "<why>"}}
- {{"op": "add_entry", "section_label": "Experience", "after_index": -1, "title": "...", "role": "...", "organization": "...", "dates": "...", "location": "...", "url": "...", "bullets": [{{"text": "..."}}], "reasoning": "<why>"}}
- {{"op": "delete_entry", "section_label": "Experience", "entry_index": 1, "reasoning": "<why>"}}
- {{"op": "move_entry", "section_label": "Experience", "from_index": 2, "to_index": 0, "reasoning": "<why>"}}
- {{"op": "update_field", "section_label": "Experience", "entry_index": 0, "field": "dates", "value": "2020-Present", "reasoning": "<why>"}}
- {{"op": "add_section", "after_index": 2, "label": "Certifications", "reasoning": "<why>"}}
- {{"op": "delete_section", "section_label": "Hobbies", "reasoning": "<why>"}}
- {{"op": "move_section", "from_index": 3, "to_index": 1, "reasoning": "<why>"}}
- {{"op": "update_skill_row", "section_label": "Skills", "skill_row_index": 0, "category": "Languages", "items": "Python, Rust, TypeScript", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "summary", "value": "<new summary text>", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "name", "value": "<new name>", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "email", "value": "<new email>", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "phone", "value": "<new phone>", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "location", "value": "<new location>", "reasoning": "<why>"}}
- {{"op": "ask", "question": "...", "context": "<optional context>"}}

Indexing rules:
- `after_index: -1` means insert at the beginning (position 0).
- All other indices are 0-based array positions.
- `reorder_bullets.order` is the new desired order, using the OLD indices. e.g., [2, 0, 1] moves old bullet 2 to position 0, old bullet 0 to position 1, old bullet 1 to position 2.

IMPORTANT: Do NOT include any text outside the JSON. Your entire response must be valid, parseable JSON.
IMPORTANT: Max 15 operations per response to keep changes focused and reviewable.

CRITICAL — SURGICAL EDITING RULES:
1. Return ONLY operations that make actual, meaningful changes. If a bullet, entry, or section is fine as-is, DO NOT include an operation for it.
2. You are a SURGICAL editor, not a rewriter. Return 3-15 operations max. If you find yourself returning 30+ operations, you are doing it wrong.
3. Only use `update_bullet` when you CHANGE the bullet text. Never re-emit a bullet with identical text.
4. Use `add_section` to add new relevant sections, `add_bullet` to add new bullets to existing entries.
5. The resume content above shows the CURRENT state. Only operations you return will be applied. Unchanged content stays as-is automatically.

DO NOT:
- Return the entire document as operations
- Regenerate untouched bullets just to "confirm" them
- Recreate sections that don't need changes
- Return 50+ operations duplicating the entire resume

BAD response pattern (DO NOT do this):
{{
  "operations": [
    {{"op": "update_bullet", ..., "text": "Same text as original, unchanged"}},  ← SKIP THIS!
    {{"op": "update_bullet", ..., "text": "Another unchanged bullet"}},           ← SKIP THIS!
    ... 40+ more unchanged bullets ...
  ]
}}

GOOD response pattern (DO THIS):
{{
  "operations": [
    {{"op": "update_bullet", ..., "text": "Reworded bullet targeting Microsoft's engineering culture"}},
    {{"op": "add_bullet", ..., "text": "New AZ-900 certification bullet for Azure relevance"}},
    {{"op": "add_section", ..., "label": "Relevant Skills"}},
    {{"op": "update_basics_field", "field": "summary", "value": "Summary rewritten for Microsoft role"}}
  ]
}}

Make 3-15 targeted changes. Do NOT rewrite the entire resume. Every operation must change something.
"""


def build_tailor_prompt_v3(
    session,
    content: ResumeContent,
    research_summary: dict | None,
    career_context: str = "",
) -> list[dict]:
    research_json = json.dumps(research_summary or {}, indent=2)
    content_json = json.dumps(content.model_dump(mode="json"), indent=2)
    mode = session.tailoring_mode or "polish"

    career_context_section = ""
    if career_context:
        career_context_section = f"CAREER CONTEXT:\n{career_context}"

    system = V3_SYSTEM_PROMPT.format(
        career_context_section=career_context_section,
        research_summary=research_json,
        job_description=session.job_description or "",
        mode=mode,
        mode_instruction=MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["polish"]),
        resume_content=content_json,
    )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": session.notes or "Tailor this resume for the job description."},
    ]



