## Why

When the LLM edits a bullet via `update_bullet`, it sends span metadata (bold/italic formatting indices) that frequently reference the **old** text's character positions, not the new text's. This causes Pydantic validation errors (`span.end exceeds text length`, `span.start >= span.end`) and the entire operation fails — both on first attempt and retry. Current fallback clamps/drops invalid spans, silently losing formatting. We need a robust way to preserve bold formatting across text edits.

## What Changes

- Add `bold_added` and `bold_removed` fields to `update_bullet` and `add_bullet` operations so the LLM explicitly declares which words it bolded or un-bolded
- Implement `_remap_spans()` that uses old text + old spans + declared changes to produce correct spans for the new text
- Update the LLM prompt to include `bold_added`/`bold_removed` in operation examples and instructions
- Keep index-based `spans` as a fallback for unchanged bold words that just shifted position
- Remove the crude `_clamp_spans` function (replaced by proper remap)

## Capabilities

### New Capabilities

- `bold-span-remap`: Logic to declaratively remap bold formatting across bullet text edits using `bold_added`/`bold_removed` declarations plus positional fallback for shifted spans

### Modified Capabilities

## Impact

- `backend/app/services/editing/content_ops.py` — `_clamp_spans` replaced by `_remap_spans`, `update_bullet` and `add_bullet` handlers modified
- `backend/app/services/llm/prompts.py` — prompt updated with `bold_added`/`bold_removed` examples and instructions
- `backend/app/models/resume_schema.py` — no changes (Span model stays the same)
- LLM output format changes — operations now include declarative bold fields
