## Context

The resume builder stores resumes in two formats: raw LaTeX (`tex_source`) and structured JSON (`content_json`). The JSON is the canonical format used by the LLM tailoring engine, content operations, and all export paths. However, the system also stores LaTeX alongside it and re-parses it from LaTeX on every session creation — even though the JSON already exists on the master resume.

The system has three ORM models that store resume data:

- `MasterResume` — user's uploaded resume (has both `tex_source` and `content_json`)
- `SessionDocument` — versioned snapshots per tailoring session (has both `tex_source` and `content_json`)
- Legacy `document_model_json` on `SessionDocument` — a DocNode tree that is written but never read

This change eliminates all stored LaTeX, making JSON the single source of truth.

## Goals / Non-Goals

**Goals:**

- JSON is the only stored resume format
- LaTeX generated on-demand at export time, never stored
- Session creation copies master JSON directly — no LLM call
- Remove all dead columns and legacy fields
- Frontend renders `content_json` natively for preview

**Non-Goals:**

- Changing the LLM tailoring prompt or operation system
- Modifying the content operations engine (`content_ops.py`)
- Adding new export formats
- Changing the cover letter prompt structure (only changing what's passed to it)
- Backend rendering infrastructure (`renderer.py`, `compiler.py`)

## Decisions

### D1: Remove `tex_source` from both `MasterResume` and `SessionDocument`

**Choice:** Drop both columns.

**Alternatives considered:**

- Keep `SessionDocument.tex_source` as a render cache — rejected because the render is fast (no LLM) and removing it simplifies the schema.
- Keep `MasterResume.tex_source` for re-import — rejected because the user wants one-way conversion: LaTeX → JSON at upload, never back.

**Rationale:** LaTeX is a transport format. Once converted to JSON, it has no purpose in storage. Export renders fresh from JSON every time.

### D2: Remove `document_model_json` from `SessionDocument`

**Choice:** Drop the column.

**Alternatives considered:**

- Keep for backward compatibility — rejected because no code reads it. It's dead weight from the legacy DocNode system.

**Rationale:** The `document_model_json` is a remnant of the old region-based document model. The current system uses `content_json` exclusively. Removing it eliminates confusion.

### D3: Cover letter renders JSON → LaTeX before LLM prompt

**Choice:** `renderer.render_tex(content)` produces LaTeX, which is passed to `build_cover_letter_prompt()`.

**Alternatives considered:**

- Send structured JSON directly to the LLM — would require rewriting `COVER_LETTER_SYSTEM_PROMPT` and the prompt template. Higher risk for no clear benefit.

**Rationale:** The cover letter prompt is tuned for LaTeX input. Rendering from JSON is a single function call (fast, no LLM cost). Preserves existing behavior.

### D4: Frontend renders `content_json` natively for master resume preview

**Choice:** Build a structured display component that reads `content_json` and renders name, sections, entries, bullets, skill rows.

**Alternatives considered:**

- Backend renders HTML via `render_html()` and sends to frontend — adds a network round-trip and backend dependency for a UI feature.
- Show raw JSON dump — poor UX.

**Rationale:** The frontend already has the `ResumeContent` TypeScript types. Native rendering is self-contained and matches the data model.

### D5: Fresh database — no backfill migration

**Choice:** Drop all tables except `users`, `llm_providers`, `refresh_tokens`, `email_verifications`, `password_resets`. Re-run migrations from scratch.

**Alternatives considered:**

- Lazy backfill (convert on first access) — rejected because user confirmed no existing users to preserve.
- Eager migration (batch convert all masters) — unnecessary with no existing data.

**Rationale:** User confirmed "no existing users delete everything from database." Clean slate is simpler.

### D6: `content_json` becomes NOT NULL on both models

**Choice:** `MasterResume.content_json` and `SessionDocument.content_json` are `JSONB NOT NULL`.

**Alternatives considered:**

- Keep nullable with fallbacks — adds conditional logic everywhere. Unnecessary since every document must have content.

**Rationale:** Every session document must have structured content. NULL would mean broken state.

## Risks / Trade-offs

**[Risk] Cover letter quality may change** — The rendered LaTeX from `renderer.render_tex()` may differ from the user's original LaTeX formatting. → Mitigation: The renderer produces clean, standardized LaTeX. The LLM prompt asks for plain text output, so LaTeX formatting differences are unlikely to affect cover letter quality.

**[Risk] Fresh database breaks any existing deployments** — All data except auth tables is lost. → Mitigation: This is intentional per user decision. Document in deployment notes.

**[Risk] Frontend native preview may not capture all LaTeX nuances** — The structured display won't show LaTeX-specific formatting that the original had. → Mitigation: The `content_json` already captures all meaningful structure (bold/italic spans, links). The preview shows content, not formatting.

**[Trade-off] LaTeX rendered on every export** — No caching. → Acceptable: render_tex() is fast (no LLM), and exports are infrequent user-initiated actions.

## Migration Plan

1. Create new Alembic migration that drops the four columns
2. Set up fresh database (drop all tables except auth/api-key tables)
3. Run migrations from scratch
4. Deploy backend changes
5. Deploy frontend changes

**Rollback:** Not applicable — fresh database means no production data to roll back.
