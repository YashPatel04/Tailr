# Import & Export — Getting Data In and Out

## Importing a Master Resume (.tex)

The master resume is the canonical source document. Users upload a `.tex` file as their master resume via `POST /api/master-resume` (`backend/app/api/sessions.py:464`). The source can be sent either as a multipart `file` upload or as raw text in the JSON body (`tex_source`, embedded), with optional `provider_id` and `model`. The file is decoded to UTF-8 text before import.

There is exactly one import path: LLM extraction. A configured LLM provider is required — the endpoint returns 400 with `Configure an LLM provider to import resume` if none is found, and 422 with `Failed to parse resume: ...` if extraction fails. On success the `MasterResume` row is upserted (an existing row is updated in place, otherwise one is created with `filename: "resume.tex"`, `original_format: "tex"`), and the endpoint returns:

```json
{ "id": "...", "content_json": { ... }, "import_status": "imported" }
```

The `MasterResume` row stores only `filename`, `original_format`, `content_json` (JSONB), and `page_count`. Raw TeX is not persisted.

### LLM Extraction

1. The `.tex` source is sent to `import_from_tex()` (`backend/app/services/importers/tex_llm_importer.py:67`).
2. The LLM receives a detailed system prompt (`EXTRACTION_PROMPT`) describing the `ResumeContent` JSON schema (`basics`, `sections`, `entries`, `skill_rows`, bullets with `spans`), along with instructions to map LaTeX constructs to structured fields: `\textbf` → bold spans, `\textit` → italic, `\underline` → underline, `\texttt` → code, entry-level `\href` → the `urls` dict (display text becomes the mask). `\section*` labels become section labels.
3. The LLM returns JSON (code fences are stripped). The backend validates it with `ResumeContent.model_validate()`.
4. If validation fails, the error is sent back to the LLM for self-correction: **up to 2 retries** (`max_retries=2`, 3 attempts total). After the final failure it raises `ImportError`.
5. On success, the resulting `content_json` is stored on the `MasterResume` row and the endpoint returns `import_status: "imported"`.

### SSE Import

`POST /api/master-resume/import` (`sessions.py:537`) streams progress events to the frontend over `text/event-stream`. Body is JSON with a required embedded `tex_source`, plus optional `provider_id` and `model`. Unlike the plain upload endpoint it does **not** persist anything — it only extracts and streams the result.

Events emitted by `_emit()` (`sessions.py:460`), in order:

- `importing` — `{"message": "Analyzing resume structure..."}`
- `extracting` — `{"message": "Extracting content with AI..."}`
- `import_done` — `{"content": {...}}` carrying the structured `ResumeContent`
- `error` — `{"message": "No LLM provider configured"}` when no provider exists, or `{"message": "Import failed: ..."}` on any exception during extraction.

There are no other progress events; the `import_done` payload carries only `content` (no TeX payloads).

**Frontend status:** this endpoint is not currently consumed. The frontend has no SSE client for it; the active upload flow (`frontend/app/components/settings/SettingsModal.tsx:502`) calls `POST /api/master-resume` with `FormData`. A review component — `frontend/app/components/import/ImportReview.tsx` — was built to display the imported content with original/generated TeX side-by-side and accept/reject buttons before committing, but it is **imported by no other file** and no page wires the `import_done` payload into it. The accept/reject review step is therefore not part of any running flow.

## Creating a Session

`POST /api/sessions` (`sessions.py:163`) creates a tailoring session tied to a company and role.

During creation, the backend:

1. Reads the user's `MasterResume` (must already exist, else 400 `Upload a master resume first`).
2. Fetches the job description text from a URL if `job_description_url` is provided (`fetch_jd_text()`), falling back to the `job_description` text field.
3. Creates a `Session` row with company name, role title, JD, tailoring mode, and optional provider/model.
4. Creates an initial `SessionDocument` (`doc_type: "resume"`, `version: 0`) whose `content_json` is copied directly from `master.content_json`. No import runs at session creation.

## Export Formats

`GET /api/sessions/{session_id}/export` (`backend/app/api/export.py:92`). Two query parameters:

- `format` — constrained by regex to one of: `tex`, `pdf`, `docx`, `txt`, `html`.
- `doc_type` — default `resume`; `cover_letter` is the only other supported value.

The latest `resume` (or `cover_letter`) `SessionDocument` for the session is selected by highest version.

| Format  | How it's generated                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.tex`  | Rendered from `ResumeContent` via Jinja2 template (`resume.tex.j2`) using `ResumeRenderer.render_tex()`.                                                                                                                                                                                                                                                                                |
| `.pdf`  | TeX is rendered from content, then sent to the LaTeX compile service for PDF generation (see below).                                                                                                                                                                                                                                                                                    |
| `.docx` | Built with `python-docx`. Name is an H1 heading. Email/phone/location join a single italic contact line. Section labels are H1 headings. Entries have bold titles (with dates appended) and italic role/location lines. Bullets use the `List Bullet` style with `_docx_apply_spans()` (`export.py:18`) applying bold/italic/underline run properties. Skill rows have a bold category. |
| `.txt`  | Plain text: name and section labels in UPPERCASE, contact fields joined by two spaces, `  --  ` between title and dates, roles indented 4 spaces, bullets using `•` indented 2 spaces, skill rows as `Category: items`.                                                                                                                                                                 |
| `.html` | Rendered from `ResumeContent` via Jinja2 template (`resume.html.j2`) using `ResumeRenderer.render_html()`.                                                                                                                                                                                                                                                                              |

All resume formats parse `doc.content_json` with `ResumeContent.model_validate()` and then render via `ResumeRenderer` or hand-build the output. There is no stored TeX to fall back on — content always comes from the structured JSON.

### Cover Letter Export

When `doc_type=cover_letter`, only `pdf` and `docx` are accepted (any other format returns 400 `Cover letter export supports pdf and docx only`). A missing cover-letter document returns 404. The stored `content_json` is loaded either via `CoverLetterContent.model_validate()` or, for legacy `{text, type}` payloads, migrated with `CoverLetterContent.from_legacy_text()`.

- `.pdf` — salutation, paragraphs, and closing are passed through `tex_escape()` into a plain `article` document, compiled via the LaTeX compile service (`_render_cover_letter_pdf`, `export.py:65`).
- `.docx` — salutation, paragraphs, and closing become plain `python-docx` paragraphs (`_render_cover_letter_docx`, `export.py:48`).

Responses use `Content-Disposition: attachment; filename=resume.{format}` or `cover_letter.{format}`.

### Frontend Export UI

`frontend/app/components/document/DocumentTopBar.tsx` offers the Export menu: for the active resume it lists `pdf`, `docx`, `txt`, `tex`; for a cover letter it lists `pdf`, `docx`. It downloads via `GET /api/sessions/{activeSessionId}/export?format={format}&doc_type={activeDocType}` and saves the blob as `{docType}.{format}`. `html` is backend-supported but not offered in the UI.

## PDF Compilation

PDF generation involves two components:

### The LaTeX Compile Server

`backend/app/services/latex/compile_server.py` — a small Python HTTP server that runs inside a Docker container with a full TeX distribution.

- Listens on port **9777**.
- Single endpoint: `POST /compile` with JSON body `{"tex_source": "...", "document_id": "..."}`.
- Writes the `.tex` to `/work/{document_id}/resume.tex`.
- Runs `latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir={document_dir}`.
- On success: returns the PDF bytes with `Content-Type: application/pdf`.
- On timeout (30s): returns HTTP 408.
- On failure: returns HTTP 400 with the last 500 characters of `latexmk` output.

It is the `latex` container's entrypoint — `docker/latex/Dockerfile` sets `CMD ["python3", "/compile_server.py"]` and `docker-compose.yml` overrides it with `command: ["python3", "/compile_server.py"]`. The `/work` directory is a volume shared between the `latex` and `backend` containers.

### The Python Compiler Client

`backend/app/services/latex/compiler.py` (`LatexCompiler` class):

- Sends an HTTP POST to `http://latex:9777/compile` (the container hostname `latex` is resolved via Docker networking; the URL is configurable via `service_url`).
- Uses a **60-second timeout** on the socket level.
- Wraps HTTP and network errors in `CompileError` with the first 300 characters of the error body.
