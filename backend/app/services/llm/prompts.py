"""Prompt builders for LLM tailoring."""

from __future__ import annotations

import json

from app.models.resume_schema import CoverLetterContent, ResumeContent

PLAN_MODE_SYSTEM_PROMPT = """\
You are a resume advisor and career coach. Your job is to help the user understand the role, \
research the company, and plan their resume tailoring strategy — WITHOUT making any edits to their resume.

You are in PLAN MODE. Your responsibilities:
- Answer questions about the company, role, and industry
- Analyze the job description and explain what the employer is looking for
- Compare the user's resume to the job requirements
- Advise on which experiences to emphasize and how to position them
- Explain resume strategy, best practices, and career advice
- Suggest what changes would be most impactful

YOU MUST NOT:
- Return structured JSON operations
- Propose specific edits to the resume content
- Return a list of changes to apply
- Format your response as code or JSON

Your responses should be conversational, helpful, and in natural language. \
Always format your replies in markdown for readability. Use: \
- **bold** for emphasis on key points \
- ## headers to structure longer responses \
- bullet lists (- item) for multiple suggestions or comparisons \
- `inline code` for specific resume field names or technical terms \
Do NOT use code blocks for your entire response — only for inline references.

{career_context_section}

RESEARCH SUMMARY:
{research_summary}

JOB DESCRIPTION:
{job_description}

RESUME CONTENT (JSON):
```json
{resume_content}
```

Respond naturally to the user's questions. Be specific and reference actual content from their resume and the job description.
"""

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

Return ONLY a valid JSON object with keys:
- "explanation": A clear, 2-3 sentence summary of WHAT changes you are making and the overall strategy
- "reasoning": A clear explanation of WHY these changes matter for this specific job — reference the JD, company culture, or role requirements
- "operations": An array of typed operations (see below)

Every operation uses path-based addressing: section labels and integer indices (0-based).
Target sections by their `label` field (e.g., "Experience", "Education").
Target entries, bullets, and skill rows by their array index within the parent section/entry.

Available operations:

- {{"op": "update_bullet", "section_label": "Experience", "entry_index": 0, "bullet_index": 1, "text": "<rewritten bullet>", "spans": [], "bold_added": [], "bold_removed": [], "reasoning": "<why>"}}
- {{"op": "add_bullet", "section_label": "Experience", "entry_index": 0, "after_index": 1, "text": "<new bullet>", "spans": [], "bold_added": [], "bold_removed": [], "reasoning": "<why>"}}
- {{"op": "delete_bullet", "section_label": "Experience", "entry_index": 0, "bullet_index": 2, "reasoning": "<why>"}}
- {{"op": "reorder_bullets", "section_label": "Experience", "entry_index": 0, "order": [2, 0, 1], "reasoning": "<why>"}}
- {{"op": "add_entry", "section_label": "Experience", "after_index": -1, "title": "...", "role": "...", "organization": "...", "dates": "...", "location": "...", "urls": {{"https://example.com": "Display Text"}}, "bullets": [{{"text": "..."}}], "reasoning": "<why>"}}
- {{"op": "delete_entry", "section_label": "Experience", "entry_index": 1, "reasoning": "<why>"}}
- {{"op": "move_entry", "section_label": "Experience", "from_index": 2, "to_index": 0, "reasoning": "<why>"}}
- {{"op": "update_field", "section_label": "Experience", "entry_index": 0, "field": "dates", "value": "2020-Present", "reasoning": "<why>"}}
- {{"op": "update_entry_urls", "section_label": "Experience", "entry_index": 0, "urls": {{"https://github.com/repo": "GitHub", "https://demo.example.com": "Live Demo"}}, "reasoning": "<why>"}}
- {{"op": "add_section", "after_index": 2, "label": "Certifications", "reasoning": "<why>"}}
- {{"op": "delete_section", "section_label": "Hobbies", "reasoning": "<why>"}}
- {{"op": "move_section", "from_index": 3, "to_index": 1, "reasoning": "<why>"}}
- {{"op": "update_skill_row", "section_label": "Skills", "skill_row_index": 0, "category": "Languages", "items": "Python, Rust, TypeScript", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "name", "value": "<new name>", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "email", "value": "<new email>", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "phone", "value": "<new phone>", "reasoning": "<why>"}}
- {{"op": "update_basics_field", "field": "location", "value": "<new location>", "reasoning": "<why>"}}
- {{"op": "ask", "question": "...", "context": "<optional context>"}}

Bold formatting rules for update_bullet and add_bullet:
- `bold_added`: List words/phrases you made BOLD that were NOT bold before. Find the EXACT word in the new text.
- `bold_removed`: List words/phrases you REMOVED bold formatting from. Find the EXACT word in the old text.
- `spans`: Index-based formatting (fallback). Use only if you are confident in character positions.
- ALWAYS declare bold_added and bold_removed when you change bold formatting. This is more reliable than indices.
- Example: If original had "Engineered" bold and you changed it to "Designed" bold, use bold_added: ["Designed"], bold_removed: ["Engineered"].

Indexing rules:
- `after_index: -1` means insert at the beginning (position 0).
- All other indices are 0-based array positions.
- `reorder_bullets.order` is the new desired order, using the OLD indices. e.g., [2, 0, 1] moves old bullet 2 to position 0, old bullet 0 to position 1, old bullet 1 to position 2.

IMPORTANT: Do NOT include any text outside the JSON. Your entire response must be valid, parseable JSON.
IMPORTANT: Max 15 operations per response to keep changes focused and reviewable.

CRITICAL — SURGICAL EDITING RULES:
1. ALWAYS follow the user's explicit instructions. If they ask to delete something, DELETE it. If they ask to remove a section, use `delete_section`. If they ask to delete everything, delete everything.
2. Return ONLY operations that make actual, meaningful changes. If a bullet, entry, or section is fine as-is, DO NOT include an operation for it.
3. You are a SURGICAL editor, not a rewriter. Return 3-15 operations max. If you find yourself returning 30+ operations, you are doing it wrong.
4. Only use `update_bullet` when you CHANGE the bullet text. Never re-emit a bullet with identical text.
5. Use `add_section` to add new relevant sections, `add_bullet` to add new bullets to existing entries.
6. If the user asks for a summary, profile, or objective, use `add_section` with a "Summary" or "Profile" label — do NOT use `update_basics_field`. There is no basics summary field.
6. Use `delete_section`, `delete_entry`, `delete_bullet` when the user asks to remove content. Do NOT add replacements unless the user asks.
7. The resume content above shows the CURRENT state. Only operations you return will be applied. Unchanged content stays as-is automatically.

DO NOT:
- Return the entire document as operations
- Regenerate untouched bullets just to "confirm" them
- Recreate sections that don't need changes
- Return 50+ operations duplicating the entire resume
- Ignore the user's explicit instructions (e.g., if they say "delete X", do not add new content instead)
- Add content the user did not ask for

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
    {{"op": "delete_section", "section_label": "Hobbies", "reasoning": "User asked to remove this section"}},
    {{"op": "update_basics_field", "field": "name", "value": "Summary rewritten for Microsoft role"}}
  ]
}}

When the user explicitly asks to delete or remove content, use delete operations:
- `delete_section` to remove an entire section
- `delete_entry` to remove an entry from a section
- `delete_bullet` to remove a bullet from an entry

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


def build_plan_mode_prompt(
    session,
    content: ResumeContent,
    research_summary: dict | None,
    career_context: str = "",
) -> list[dict]:
    research_json = json.dumps(research_summary or {}, indent=2)
    content_json = json.dumps(content.model_dump(mode="json"), indent=2)

    career_context_section = ""
    if career_context:
        career_context_section = f"CAREER CONTEXT:\n{career_context}"

    system = PLAN_MODE_SYSTEM_PROMPT.format(
        career_context_section=career_context_section,
        research_summary=research_json,
        job_description=session.job_description or "",
        resume_content=content_json,
    )

    return [
        {"role": "system", "content": system},
    ]


COVER_LETTER_SYSTEM_PROMPT = """\
You are a professional cover letter writer. Write a compelling, tailored cover letter based on the provided resume content and job description.

The cover letter should:
- Be professional and confident in tone
- Open with a strong introduction mentioning the company and role
- Highlight 2-3 key relevant experiences/skills from the resume that match the job description
- Close with enthusiasm and a call to action
- Be 250-400 words
- Do NOT include any markdown or formatting markup — just plain text paragraphs

Return ONLY the cover letter text, nothing else."""


COVER_LETTER_EDIT_PROMPT = """\
You are editing a cover letter. The user will ask you to make changes.

Current cover letter:
Salutation: {salutation}
{paragraphs_formatted}
Closing: {closing}

Company: {company}
Role: {role}
{research_block}

Tone guidance: {tone_guidance}

Return ONLY a valid JSON object with keys:
- "explanation": 1-3 sentence summary of what you changed
- "reasoning": why you made these changes
- "operations": array of operations (see below)

Available operations:
- {{"op": "update_salutation", "text": "Dear Ms. Chen,"}}
- {{"op": "update_paragraph", "id": "<paragraph-id>", "text": "new paragraph text"}}
- {{"op": "add_paragraph", "text": "new paragraph text", "after_id": "<paragraph-id or null for start>"}}
- {{"op": "delete_paragraph", "id": "<paragraph-id>"}}
- {{"op": "reorder_paragraphs", "ids": ["p3", "p1", "p2"]}}
- {{"op": "update_closing", "text": "Thank you for your consideration,\\nYash"}}

IMPORTANT:
- Only return operations for what needs changing. Be conservative.
- Max 6 operations per response.
- Do NOT include any text outside the JSON.
- Each paragraph has an "id" field — use it to target specific paragraphs.

Tailoring mode: {mode}
{mode_instruction}
"""


CL_MODE_INSTRUCTIONS = {
    "polish": "SURGICAL micro-edits — fix word choice, tighten phrasing. 1-3 operations max.",
    "refine": "May restructure paragraphs and improve flow. Focus on impact.",
    "rewrite": "Restructure aggressively — rewrite paragraphs, reorder, reorganize. Only preserve facts.",
}


def build_cover_letter_prompt(
    master_tex: str,
    job_description: str,
    company_name: str,
    role_title: str,
    research: dict | None = None,
) -> list[dict]:
    research_block = ""
    if research:
        values = ", ".join(research.get("values", []))
        signals = ", ".join(research.get("hiring_signals", []))
        tone = research.get("tone_guidance", "")
        research_block = f"\nCompany Research:\n- Values: {values}\n- Hiring signals: {signals}\n- Tone guidance: {tone}"

    return [
        {"role": "system", "content": COVER_LETTER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""Company: {company_name}
Role: {role_title}

Job Description:
{job_description}
{research_block}

My Resume:
{master_tex}""",
        },
    ]


def build_cover_letter_edit_prompt(
    content: CoverLetterContent,
    session,
    research_summary: dict | None = None,
) -> list[dict]:
    paragraphs_formatted = "\n".join(f"[{p.id}]: {p.text}" for p in content.paragraphs)
    if not paragraphs_formatted:
        paragraphs_formatted = "(no paragraphs)"

    research_block = ""
    tone_guidance = ""
    if research_summary:
        values = ", ".join(research_summary.get("values", []))
        signals = ", ".join(research_summary.get("hiring_signals", []))
        tone_guidance = research_summary.get("tone_guidance", "")
        research_block = f"Company Research:\n- Values: {values}\n- Hiring signals: {signals}"

    mode = session.tailoring_mode or "polish"

    system = COVER_LETTER_EDIT_PROMPT.format(
        salutation=content.salutation or "(none)",
        paragraphs_formatted=paragraphs_formatted,
        closing=content.closing or "(none)",
        company=session.company_name or "",
        role=session.role_title or "",
        research_block=research_block,
        tone_guidance=tone_guidance,
        mode=mode,
        mode_instruction=CL_MODE_INSTRUCTIONS.get(mode, CL_MODE_INSTRUCTIONS["polish"]),
    )

    return [{"role": "system", "content": system}]
