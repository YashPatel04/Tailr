## 1. Backend Model Changes

- [x] 1.1 Remove `tex_source` and `vocabulary_map_json` columns from `MasterResume` in `app/models/models.py`
- [x] 1.2 Remove `tex_source` and `document_model_json` columns from `SessionDocument` in `app/models/models.py`
- [x] 1.3 Make `content_json` NOT NULL on both `MasterResume` and `SessionDocument`

## 2. Backend API — Session Creation

- [x] 2.1 Simplify `create_session` in `app/api/sessions.py` — copy `master.content_json` directly to `SessionDocument.content_json`
- [x] 2.2 Delete 53-line LLM import + regex fallback block from `create_session` (lines 136-189)
- [x] 2.3 Remove `tex_source=master.tex_source` from `SessionDocument` creation in `create_session`

## 3. Backend API — Master Resume Upload

- [x] 3.1 Update `upload_master_resume` in `app/api/sessions.py` — discard `tex_source` after LLM import, ensure `content_json` always set
- [x] 3.2 Update `get_master_resume` response — remove `tex_source` from returned dict
- [x] 3.3 Update `replace_master_resume` — ensure it flows through updated `upload_master_resume`

## 4. Backend API — Cover Letter

- [x] 4.1 Update `generate_cover_letter` in `app/api/sessions.py` — render `master.content_json` → LaTeX via `renderer.render_tex()` before calling `build_cover_letter_prompt`
- [x] 4.2 Remove `tex_source=raw_content` from cover letter `SessionDocument` creation (text stored in `content_json` already)

## 5. Backend API — Tailor & Document Edit

- [x] 5.1 Update `accept_proposal` in `app/api/tailor.py` — remove `render_tex` call (line 229), remove `tex_source=new_tex` from `SessionDocument` creation (line 240)
- [x] 5.2 Update `edit_document` in `app/api/document.py` — remove `render_tex` call (line 74), remove `tex_source=new_tex` from `SessionDocument` creation (line 83)

## 6. Backend API — Export

- [x] 6.1 Remove `tex_source = doc.tex_source` line from `export_document` in `app/api/export.py` (line 122)
- [x] 6.2 Remove all `doc.tex_source` fallback paths in `.tex`, `.pdf`, and `.txt` export branches
- [x] 6.3 Ensure all export paths use `ResumeContent.model_validate(doc.content_json)` exclusively

## 7. Frontend Types

- [x] 7.1 Remove `tex_source` from `MasterResume` interface in `app/types/index.ts`
- [x] 7.2 Remove `tex_source` and `document_model_json` from `SessionDocument` interface
- [x] 7.3 Remove `tex_source` from `SectionNode` interface

## 8. Frontend — Master Resume Preview

- [x] 8.1 Rebuild View button in `app/settings/master-resume/page.tsx` — render `content_json` natively (structured display with name, sections, entries, bullets, skill rows)
- [x] 8.2 Remove `tex_source` display from `app/components/settings/SettingsModal.tsx`

## 9. Frontend — Document Canvas

- [x] 9.1 Remove `texSource` prop from `SectionRenderer` in `app/components/document/SectionRenderer.tsx`
- [x] 9.2 Remove `texSource` prop from `DocumentCanvas` in `app/components/document/DocumentCanvas.tsx`

## 10. Database & Tests

- [x] 10.1 Create Alembic migration to drop columns from `master_resumes` and `session_documents`
- [x] 10.2 Update `tests/test_sessions.py` — remove `tex_source` from `MasterResume` factory
- [x] 10.3 Update `tests/test_integration.py` — no changes needed (uses local variable, not model field)
- [x] 10.4 Update `tests/factories.py` — remove `tex_source` and `document_model_json` from factory
- [x] 10.5 Verify `test_prompts.py` still passes (assertion checks system prompt doesn't contain tex_source — still valid)
- [x] 10.6 Fresh database setup — drop all tables except auth/api-key tables, re-run migrations
