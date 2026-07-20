## Why

The recognizer-based LaTeX parser guesses semantics from layout tokens (`\hfill`, `\\`, `\textbf`) and breaks on format changes — the FACETS entry fragments across 6 nodes, entry headers leak raw LaTeX into fields, and 33 empty opaque nodes bloat the tree. Every new template variation requires a new recognizer. The entire resume builder ecosystem (YAMLResume, JSON Resume, simple-resume, resume-as-code) resolves this by making structured content the source of truth and treating LaTeX as a generated output format, not an input to parse.

## What Changes

- **BREAKING**: Delete the entire LaTeX parsing stack: `lexer.py`, `extractor_v2.py`, `recognizers/`, `region_model.py`, `serializer_v2.py`, `extractor_context.py`, `pipeline_v2.py`, `diff_v2.py`
- **BREAKING**: `SessionDocument.document_model_json` column replaced by `content_json` storing `ResumeSchema` instead of `Region` tree
- New `ResumeSchema` Pydantic model as the single source of truth for all resume content
- New Jinja2-based LaTeX generation from `ResumeSchema` (template-driven, not surgical emission)
- New one-time LLM-based import from `.tex` → `ResumeSchema` (not per-session parsing)
- New frontend renderer that consumes `ResumeSchema` directly (no `_convert_document_model`)
- Simplified LLM editing contract: structured content paths instead of Region tree node IDs
- Simplified diff: field-level changes with human-readable paths instead of node-ID tracking
- Simplified validation: Pydantic model validation replaces manual ID-existence and type checks

## Capabilities

### New Capabilities

- `resume-schema`: Structured Pydantic data model for resume content — basics (name, email, phone, profiles), education, experience, skills, research, projects. This is the single source of truth stored in the database.
- `resume-import`: One-time LLM-based extraction of `ResumeSchema` from an uploaded `.tex` file. User reviews side-by-side comparison before accepting. Runs once per master resume, not per session.
- `resume-rendering`: Template-driven generation of `.tex`, `.html`, and canvas views from `ResumeSchema`. Jinja2 templates for LaTeX/HTML output; direct React rendering for the canvas. Replaces surgical serialization and `_convert_document_model`.
- `content-editing`: LLM and user edit `ResumeSchema` content through a typed operation catalog (`update_bullet`, `add_entry`, `move_section`, etc.) with paths instead of tree node IDs. Validation is Pydantic schema validation. Replaces the `PatchV2` Region-tree ops catalog.

### Modified Capabilities

*(No source-of-truth specs exist in `openspec/specs/`. The following change-level specs are replaced or significantly altered:)*

- `doc-parsing` (from `resume-tailoring-app` and `document-model-overlay`): Replaced by `resume-schema` + `resume-import`. No more token tree, recognizer catalog, or region extraction.
- `doc-editing` (from `resume-tailoring-app` and `document-model-overlay`): Replaced by `content-editing`. Edit contract changes from Region tree ops to schema path ops.
- `doc-compilation` (from `resume-tailoring-app`): Simplified — compilation runs against generated `.tex` from the template, not against surgically-emitted bytes.
- `diff-view` (from `resume-tailoring-app`): Simplified — diffs are field-level path changes, not node-ID-level moves.
- `llm-integration` (from `resume-tailoring-app`): Contract changes — structured content prompt instead of Region tree JSON prompt. Provider integration unchanged.

## Impact

- **Backend code deleted**: `backend/app/services/latex/lexer.py`, `extractor_v2.py`, `extractor_context.py`, `pipeline_v2.py`, `region_model.py`, `serializer_v2.py`, `recognizers/` (entire directory), `backend/app/services/editing/applier_v2.py`, `ops_v2.py`, `diff_v2.py`
- **Backend code added**: `backend/app/models/resume_schema.py`, `backend/app/services/importers/tex_llm_importer.py`, `backend/app/services/rendering/` (Jinja2 templates + renderer), `backend/app/services/editing/content_ops.py`
- **Backend code modified**: `backend/app/api/tailor.py`, `backend/app/api/sessions.py`, `backend/app/api/document.py`, `backend/app/services/llm/prompts.py`
- **Frontend code deleted**: `_convert_document_model` in sessions.py response layer
- **Frontend code modified**: `DocumentCanvas`, `SectionRenderer`, `EntryRenderer`, `BulletRenderer`, `SkillRowRenderer` — consume `ResumeSchema` shape directly
- **Database**: `SessionDocument.document_model_json` → `content_json` (migration needed). Historical sessions with old-format `document_model_json` preserved but no longer used.
- **No new dependencies**: Jinja2 already available in Python stdlib-style via FastAPI ecosystem; Pydantic already in use.
