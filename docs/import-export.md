# Import & Export — Getting Data In and Out

## Importing a Master Resume (.tex)

The master resume is the canonical source document. Users upload a `.tex` file as their master resume via `POST /api/master-resume` (`backend/app/api/sessions.py:400`). The file can be sent either as a multipart file upload or as raw text in the JSON body.

### LLM Extraction (primary path)

If an LLM provider is configured, the backend immediately attempts to extract structured content:

1. The `.tex` source is sent to `import_from_tex()` (`backend/app/services/importers/tex_llm_importer.py:68`).
2. The LLM receives a detailed system prompt (`EXTRACTION_PROMPT`) describing the `ResumeContent` JSON schema, along with instructions to map LaTeX constructs (`\section*`, `\textbf`, `\href`, `\item`) to structured fields.
3. The LLM returns JSON. The backend validates it with `ResumeContent.model_validate()`.
4. If validation fails, the error is sent back to the LLM for self-correction. **Up to 2 retries** are attempted.
5. On success, the `content_json` is stored on the `MasterResume` row. The endpoint returns `import_status: "imported"`.

The extraction preserves rich formatting: `\textbf{...}` becomes bold spans, `\textit{...}` becomes italic spans, `\href{url}{text}` becomes spans with `link_url`. Section labels from `\section*{...}` are preserved verbatim.

### SSE Import (with progress)

`POST /api/master-resume/import` (`sessions.py:460`) streams progress events to the frontend:
- `importing` → `extracting` → `validating` → `import_done`

The `import_done` event carries `original_tex`, `generated_tex` (TeX regenerated from the extracted content), and the structured `content` JSON. The frontend renders these side-by-side in an `ImportReview` component. The user can accept or reject before the content is committed.

### Fallback Regex Extraction

If no LLM provider is configured, or if the LLM import throws an exception, the system falls back to regex extraction. This also runs when creating a session (see below).

The fallback, in `sessions.py:156`:
- Matches `\section*{...}` commands for section labels.
- Captures raw body text between one section heading and the next, storing it as the `title` of a single placeholder entry per section.
- Extracts the author name from the `{\LARGE \textbf{...}}` pattern.
- Marks the content with `metadata.fallback_extraction: true` so the frontend can warn the user.

The user can re-import with LLM later via the SSE import endpoint to get fully structured entries.

## Creating a Session

`POST /api/sessions` (`sessions.py:91`) creates a tailoring session tied to a company and role.

During creation, the backend:
1. Reads the user's `MasterResume` (must already exist).
2. Fetches the job description text from a URL if provided (`fetch_jd_text()`), falling back to the raw text field.
3. Creates a `Session` row with company name, role title, JD, tailoring mode, and LLM provider ID.
4. Tries to import the master resume with LLM to get structured `content_json`. Falls back to regex if LLM is unavailable or fails.
5. Creates an initial `SessionDocument` at version 0 with the extracted content.

## Export Formats

`GET /api/sessions/{session_id}/export?format={format}` (`backend/app/api/export.py:98`). The `format` query parameter must be one of: `tex`, `pdf`, `docx`, `txt`, `html`.

| Format | How it's generated |
|--------|--------------------|
| `.tex` | Rendered from `ResumeContent` via Jinja2 template (`resume.tex.j2`). Falls back to stored `tex_source` if no structured content exists. |
| `.pdf` | TeX is rendered from content, then sent to the LaTeX compile service for PDF generation (see below). |
| `.docx` | Built with `python-docx`. Name is an H1 heading. Contact info is italic. Sections are H2 headings. Entries have bold titles and italic roles. Bullets use `List Bullet` style with `_docx_apply_spans()` for bold/italic/underline formatting. |
| `.txt` | Plain text with section labels in UPPERCASE, tab-indented entries, and bullet points using `•`. |
| `.html` | Rendered from `ResumeContent` via Jinja2 template (`resume.html.j2`). Requires structured content — returns 400 if only raw LaTeX is available. |

All formats that support structured content (`tex`, `pdf`, `html`, `docx`, `txt`) use `ResumeContent.model_validate()` to parse `doc.content_json`, then feed it to `ResumeRenderer` or hand-build the output.

## PDF Compilation

PDF generation involves two components:

### The LaTeX Compile Server

`backend/app/services/latex/compile_server.py` — a small Python HTTP server designed to run inside a Docker container with a full TeX distribution.

- Listens on port **9777**.
- Single endpoint: `POST /compile` with JSON body `{"tex_source": "...", "document_id": "..."}`.
- Writes the `.tex` to a temporary directory under `/work/{document_id}/`.
- Runs `latexmk -pdf -interaction=nonstopmode -halt-on-error`.
- On success: returns the PDF bytes with `Content-Type: application/pdf`.
- On timeout (30s): returns HTTP 408.
- On failure: returns HTTP 400 with compilation error output.

### The Python Compiler Client

`backend/app/services/latex/compiler.py` (`LatexCompiler` class):

- Sends an HTTP POST to `http://latex:9777/compile` (the container hostname `latex` is resolved via Docker networking).
- Uses a **60-second timeout** on the socket level.
- Wraps HTTP and network errors in `CompileError` with the first 300 characters of the error body.

The compile server is not part of the FastAPI app — it's an independent process started as the container's `CMD`.
