## 1. ResumeSchema data model

- [x] 1.1 Create `backend/app/models/resume_schema.py` with `ResumeContent`, `Basics`, `Profile`, `Section`, `Entry`, `Bullet`, `SkillRow`, `Span` Pydantic models
- [x] 1.2 Add UUID4 ID generation for all structural elements (Section, Entry, Bullet, SkillRow)
- [x] 1.3 Add `metadata: dict[str, Any]` to ResumeContent, Section, and Entry for extensibility
- [x] 1.4 Add Pydantic validators for span offset bounds (start >= 0, end <= len(text), start < end)
- [x] 1.5 Write unit tests for ResumeSchema validation (valid content, missing fields, invalid spans)

## 2. LaTeX rendering (Jinja2 templates)

- [x] 2.1 Create `backend/app/services/rendering/` package with `__init__.py`
- [x] 2.2 Create `backend/app/services/rendering/templates/resume.tex.j2` Jinja2 template with professional ATS-friendly formatting
- [x] 2.3 Implement `span_format` Jinja2 filter that converts `Span` annotations to `\textbf{...}`, `\textit{...}`, `\underline{...}`, `\texttt{...}` with balanced braces
- [x] 2.4 Create `ResumeRenderer` class with `render_tex(content: ResumeContent) -> str` and `render_html(content: ResumeContent) -> str` methods
- [x] 2.5 Write round-trip test: render known ResumeContent → compile with pdflatex → verify no errors
- [x] 2.6 Write span_format edge-case tests (nested spans, overlapping spans, spans at boundaries, link URLs)

## 3. TeX import via LLM

- [x] 3.1 Create `backend/app/services/importers/tex_llm_importer.py` with `import_from_tex(tex_source: str, llm_adapter) -> ResumeContent`
- [x] 3.2 Write structured extraction prompt instructing LLM to map LaTeX sections/entries/bullets/spans to ResumeContent JSON
- [x] 3.3 Implement extraction → validation → retry loop (up to 2 retries on ValidationError)
- [x] 3.4 Implement side-by-side comparison endpoint `POST /api/master-resume/import` streaming SSE events: `importing` → `extracting` → `validating` → `import_done`
- [x] 3.5 Modify `POST /api/master-resume` to call `import_from_tex` and store `ResumeContent` on the `MasterResume` row
- [x] 3.6 Add frontend import review UI showing original .tex vs generated .tex with Accept/Reject buttons
- [x] 3.7 Write tests: successful import of standard resume, failed import recovery, span preservation, section label mapping

## 4. Content editing engine

- [x] 4.1 Create `backend/app/services/editing/content_ops.py` with `ContentOp` union type for all path-based operations
- [x] 4.2 Implement `ContentApplier` class with `apply(content: ResumeContent, ops: list[ContentOp]) -> ResumeContent` that deep-copies, applies ops, validates with Pydantic
- [x] 4.3 Implement path resolution for `update_bullet`, `add_entry`, `delete_entry`, `move_entry`, `update_field`, `add_section`, `delete_section`, `move_section`, `add_bullet`, `delete_bullet`, `reorder_bullets`, `update_skill_row`, `update_basics_field`
- [x] 4.4 Implement `ContentDiffer` that compares old vs new `ResumeContent` and produces human-readable `DiffChangeSet` with semantic paths
- [x] 4.5 Write tests: apply single op, apply batch ops, apply op to missing path (error), diff modified bullet, diff new section, diff deleted entry

## 5. LLM prompt update

- [x] 5.1 Rewrite `build_tailor_prompt_v2` in `backend/app/services/llm/prompts.py` to accept `ResumeContent` and produce a clean JSON representation (no byte slices, no opaque nodes)
- [x] 5.2 Update the LLM system prompt to instruct path-based ops (section label + index) instead of Region tree node IDs
- [x] 5.3 Write tests: prompt JSON under 8KB for typical resume, prompt contains labeled sections with typed fields, prompt excludes metadata noise

## 6. API layer migration

- [x] 6.1 Modify `POST /api/sessions` in `backend/app/api/sessions.py` to call `import_from_tex` on master resume .tex and store `ResumeContent` as `content_json` on `SessionDocument`
- [x] 6.2 Modify `GET /api/sessions/{id}` to return `content_json` directly (no `_convert_document_model`)
- [x] 6.3 Modify `POST /api/sessions/{id}/chat` in `backend/app/api/tailor.py` to load `ResumeContent` from `content_json`, use new prompt, parse LLM output as `ContentOp` list, apply via `ContentApplier`
- [x] 6.4 Modify `PATCH /api/sessions/{id}/document` in `backend/app/api/document.py` to accept `ContentOp` list, apply via `ContentApplier`, return diff
- [x] 6.5 Modify `GET /api/sessions/{id}/export` to use `ResumeRenderer.render_tex()` for `.tex` export and `render_html()` for `.html`
- [x] 6.6 Add `content_json JSONB` column to `SessionDocument` model (Alembic migration — nullable, no backfill)
- [x] 6.7 Keep `document_model_json` column as legacy read-only (reads fall back to legacy converter if `content_json` is null)

## 7. Frontend migration

- [x] 7.1 Update TypeScript types in `frontend/app/types/` to match `ResumeContent` schema (Basics, Section, Entry, Bullet, SkillRow, Span)
- [x] 7.2 Rewrite `DocumentCanvas` to iterate `content.sections` and render `SectionRenderer` per section
- [x] 7.3 Rewrite `SectionRenderer` to consume `Section` type directly (label, entries, skill_rows) — no `_convert_document_model` conversion
- [x] 7.4 Rewrite `EntryRenderer` to consume `Entry` type directly (title, role, dates, location, bullets, url)
- [x] 7.5 Rewrite `BulletRenderer` to consume `Bullet` type directly (text, spans)
- [x] 7.6 Add `SkillRowRenderer` component for rendering skill rows (category + items)
- [x] 7.7 Update `useSessionDocument` query hook to read `content_json` from API response
- [x] 7.8 Update `DiffView` to consume path-based `DiffChangeSet` (semantic paths instead of node IDs)

## 8. Cleanup: delete v2 parser stack

- [x] 8.1 Delete `backend/app/services/latex/lexer.py`
- [x] 8.2 Delete `backend/app/services/latex/extractor_v2.py`
- [x] 8.3 Delete `backend/app/services/latex/extractor_context.py`
- [x] 8.4 Delete `backend/app/services/latex/region_model.py`
- [x] 8.5 Delete `backend/app/services/latex/serializer_v2.py`
- [x] 8.6 Delete `backend/app/services/latex/pipeline_v2.py`
- [x] 8.7 Delete `backend/app/services/latex/recognizers/` (entire directory)
- [x] 8.8 Delete `backend/app/services/editing/applier_v2.py`
- [x] 8.9 Delete `backend/app/services/editing/ops_v2.py`
- [x] 8.10 Delete `backend/app/services/editing/diff_v2.py`
- [x] 8.11 Remove `_convert_document_model` from `backend/app/api/sessions.py`
- [x] 8.12 Remove legacy `document_model_json` fallback logic from API endpoints

## 9. Integration testing

- [x] 9.1 End-to-end test: upload .tex → LLM import → validate ResumeContent → generate .tex → compile to PDF
- [x] 9.2 End-to-end test: create session → send chat message → apply ContentOps → render canvas with new content
- [x] 9.3 End-to-end test: user edits field on canvas → PATCH document → new version stored → diff computed
- [x] 9.4 Test conflict detection: user editing when LLM patch arrives → conflict banner shown
- [x] 9.5 Test round-trip: import .tex → render .tex from template → both compile to PDF without errors
- [x] 9.6 Verify all existing SSE events still fire (researching, thinking, writing, done) with correct payloads
