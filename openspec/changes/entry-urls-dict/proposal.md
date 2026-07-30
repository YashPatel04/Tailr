## Why

The current `Entry.url: str | None` field supports only a single URL with no control over display text. Both templates render the raw URL as the clickable text (`<a href="url">url</a>` / `\href{url}{url}`). Real resumes commonly need multiple links per entry (portfolio, GitHub repo, live demo) with meaningful display text (e.g., "GitHub repo" instead of `https://github.com/user/project`). The LLM import also loses information: `\href{https://example.com}{My Portfolio}` currently discards the mask "My Portfolio" and stores only the URL.

## What Changes

- **BREAKING**: `Entry.url: str | None` becomes `Entry.urls: dict[str, str]` where keys are URLs and values are display masks. Empty dict = no links.
- New `UpdateEntryUrlsOp` content operation for editing the urls dict independently.
- `UpdateFieldOp` no longer accepts `"url"` as a field literal.
- Both Jinja2 templates (LaTeX, HTML) iterate `entry.urls.items()` to render multiple links with mask text.
- LLM extraction prompt updated to map `\href{url}{text}` → `urls[url] = text`.
- LLM tailor prompt updated with `update_entry_urls` operation and new `add_entry` schema.
- Frontend `EntryRenderer` updated to display and edit URL/mask pairs.
- Convention: `""` key (empty string value) means "no mask, display the URL itself".

## Capabilities

### New Capabilities

_(none — this modifies existing capabilities)_

### Modified Capabilities

- `resume-schema`: Entry model changes `url: str | None` → `urls: dict[str, str]`
- `content-editing`: New `UpdateEntryUrlsOp`, `UpdateFieldOp` drops `"url"` from allowed fields, `ContentApplier` and `ContentDiffer` handle `urls`
- `resume-rendering`: Both LaTeX and HTML templates iterate `entry.urls` instead of reading `entry.url`

## Impact

- **Backend model**: `app/models/resume_schema.py` (Entry class)
- **Backend ops**: `app/services/editing/content_ops.py` (AddEntryOp, UpdateFieldOp, ContentApplier, ContentDiffer)
- **Backend prompts**: `app/services/llm/prompts.py`, `app/services/importers/tex_llm_importer.py`
- **Backend templates**: `resume.tex.j2`, `resume.html.j2`
- **Frontend**: `EntryRenderer.tsx` (display + edit URL/mask)
- **Tests**: `test_resume_schema.py`, `test_content_editing.py`, `test_rendering.py`
- **Docs**: `docs/resume-schema.md`, `docs/content-editing.md`
- **OpenSpec**: `data-first-resume-engine` change specs (resume-schema, content-editing, design.md)
