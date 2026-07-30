## Why

The system stores raw LaTeX alongside JSON in the database, creating three problems:
1. Every new session triggers a redundant LLM call to re-parse the master resume from LaTeX to JSON, even though the JSON already exists on `MasterResume.content_json` (written but never read by sessions).
2. `tex_source` is stored on both `MasterResume` and `SessionDocument` but is only needed at export time — wasting storage and coupling the system to LaTeX.
3. `document_model_json` (legacy DocNode tree) is written on every `SessionDocument` but never read by any current code path.

This change makes JSON the single source of truth. LaTeX becomes a transient export format, generated on-demand.

## What Changes

- **BREAKING**: `MasterResume.tex_source` column removed — LaTeX is discarded after upload-time conversion
- **BREAKING**: `MasterResume.vocabulary_map_json` column removed — never read
- **BREAKING**: `SessionDocument.tex_source` column removed — never stored, rendered on-demand
- **BREAKING**: `SessionDocument.document_model_json` column removed — legacy DocNode tree eliminated
- Session creation copies `master.content_json` directly — no LLM call, no regex fallback (53 lines deleted)
- Cover letter generation renders `content_json` → LaTeX before LLM prompt
- All export paths use `content_json` exclusively — no `tex_source` fallback
- Master resume preview in frontend renders `content_json` natively (structured display)
- Fresh database required — all tables except `users`, `llm_providers`, `refresh_tokens`, `email_verifications`, `password_resets` are dropped and recreated

## Capabilities

### New Capabilities
- `json-first-resume`: JSON is the only stored resume format. LaTeX is generated on-demand at export time. Master resume upload converts LaTeX→JSON once via LLM, then discards the source.

### Modified Capabilities
<!-- No existing specs in openspec/specs/ -->

## Impact

**Backend files modified:**
- `app/models/models.py` — column removals on `MasterResume` and `SessionDocument`
- `app/api/sessions.py` — session creation simplified, cover letter flow updated, master resume upload updated
- `app/api/tailor.py` — remove `tex_source` from `SessionDocument` creation
- `app/api/document.py` — remove `tex_source` from `SessionDocument` creation
- `app/api/export.py` — remove all `tex_source` fallback paths

**Backend files unchanged:**
- `app/services/importers/tex_llm_importer.py` — still used at upload time
- `app/services/rendering/renderer.py` — still used for on-demand export
- `app/services/latex/compiler.py` + `compile_server.py` — still used for PDF export
- `app/services/editing/content_ops.py` — no change
- `app/services/llm/prompts.py` — no change

**Frontend files modified:**
- `app/types/index.ts` — remove `tex_source` and `document_model_json` from types
- `app/settings/master-resume/page.tsx` — rebuild View button for native JSON rendering
- `app/components/settings/SettingsModal.tsx` — remove `tex_source` display
- `app/components/document/SectionRenderer.tsx` — remove `texSource` prop
- `app/components/document/DocumentCanvas.tsx` — remove `texSource` prop

**Database:**
- Fresh database required — all tables except auth/api-key tables dropped and recreated
