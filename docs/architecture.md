# Tailr — Architecture Overview

## Tech Stack

| Layer       | Technology                                                                          |
| ----------- | ----------------------------------------------------------------------------------- |
| Backend     | Python 3.11, FastAPI, SQLAlchemy 2 (async) + PostgreSQL 16, Redis 7, Pydantic v2    |
| Frontend    | Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand                             |
| LaTeX       | Jinja2 templates, HTTP compile microservice on a texlive-full container             |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities                              |
| State/Data  | @tanstack/react-query (server state), Zustand (client state)                        |
| Streaming   | SSE via `fetch` + a custom reader (`parseSSEStream` in `lib/sseParser.ts`)          |
| Testing     | pytest + pytest-asyncio (backend), vitest + @testing-library/react + MSW (frontend) |

## System Architecture

Five containers communicate over a shared Docker network:

```
Browser
  │  :3000
  ▼
┌─────────────┐
│  frontend   │
│  Next.js 15 │
└──────┬──────┘
       │  HTTP :8000 (API)
       │  /api/auth/* proxied via rewrites
       ▼
┌─────────────┐   HTTP :9777   ┌─────────────┐
│   backend   │───────────────▶│    latex    │
│   FastAPI   │                │ texlive-full│
│   uvicorn   │                │ compile_    │
└──┬───┬───┬──┘                │ server.py   │
   │   │   │                   └──────┬──────┘
   │   │   │                          │ :9777
   │   │   │   :6379                  │ (shared
   │   │   ▼                          │  latex_work
   │   │ ┌───────┐                    │  volume)
   │   │ │ redis │                    ▼
   │   │ │ 7     │                  /work
   │   │ └───────┘
   │   │ :5432
   │   ▼
   │ ┌───────┐
   │ │  db   │
   │ │ PG 16 │
   │ └───────┘
```

| Container  | Image / Build                   | Role                                                                                                     |
| ---------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `db`       | `postgres:16-alpine`            | Stores users, master resumes, sessions, documents, patches, chat messages, LLM providers, refresh tokens |
| `redis`    | `redis:7-alpine`                | LLM model-list cache (used by `providers.py`)                                                            |
| `latex`    | `./docker/latex` (texlive-full) | texlive + Python HTTP compile server on port 9777                                                        |
| `backend`  | `./backend`                     | FastAPI API server on port 8000 (`uvicorn --reload`)                                                     |
| `frontend` | `./frontend`                    | Next.js dev server on port 3000                                                                          |

Only `db`, `redis`, `backend`, and `frontend` publish host ports; `latex` is reachable only over the Docker network. `backend` and `latex` share the `latex_work` volume at `/work`. `backend` waits for `db` health and `redis` via `depends_on`.

## Data Flow

### 1. Master Resume Import (one-time, per user)

User uploads a `.tex` master resume (or pastes the source) → `POST /api/master-resume` requires a configured LLM provider (422 otherwise) → the LaTeX source is sent to the LLM with a structured extraction prompt (`EXTRACTION_PROMPT` in `tex_llm_importer.py`), retrying on invalid output → the result is validated via `ResumeContent.model_validate()` → stored as `content_json` (JSONB) in the `master_resumes` table (one row per user, upserted). An SSE variant (`POST /api/master-resume/import`) streams `importing` / `extracting` / `import_done` / `error` events. The import UI (`components/import/ImportReview`) shows the generated structure for review. No non-LLM fallback path is wired into the import flow.

### 2. Session Creation

User selects a master resume and enters company name + role title → `POST /api/sessions` copies the master's `content_json` into a new `SessionDocument` row (`doc_type: "resume"`, `version: 0`). `POST /api/sessions/analyze` can pre-fill the company/role by having the LLM parse a pasted job description or a fetched job-description URL (`fetch_jd_text`).

### 3. Chat Message → SSE Stream

```
User sends message → POST /api/sessions/{id}/chat
                        │  (returns text/event-stream)
                        ▼
        SSE events consumed by the frontend
        via fetch + parseSSEStream (lib/sseParser.ts):
        "researching" ──┐
        "research_done" ┤   backend loads latest SessionDocument,
        "thinking"      ┤   validates content (ResumeContent /
        "writing"       ┤   CoverLetterContent), builds prompt with
        "proposal"      ┤   content + job desc + research summary
        "done"/"error"  ┘
                        │
        LLM returns typed ops
        (update_bullet, add_entry, delete_section, etc.)
        → ops_from_list → ContentApplier applies ops
        → pending ops stored on session.pending_operations_json
        → "proposal" event carries operations + explanation
                        │
        User clicks Accept
        → POST /api/sessions/{id}/proposal/accept
        → ContentApplier applies ops
        → new SessionDocument version stored
        → new Patch + ChatMessage rows stored
```

Company research (`research_company` in `services/research/summarizer.py`) runs on the first message and is cached in `session.research_summary_json`. If the LLM's ops fail to apply, the backend retries once with the error feedback. Duplicate requests are rejected (409) within a 60-second window via `request_id`. Plan mode (`mode: "plan"`) returns a `proposal` event with a markdown message and no operations, rendered by the frontend with `react-markdown`; no document is written. Cover-letter chat follows the same stream using `CoverLetterContent` and the `cover_letter` doc type.

### 4. Canvas Rendering

`DocumentCanvas` receives the `ResumeContent` JSON from the API → iterates `sections[]` → each `Section` renders through `SectionRenderer` → each `Entry` through `EntryRenderer` → each `Bullet` through `BulletRenderer`; `SkillRowRenderer` handles skill rows, `ResumeHeader` renders the basics, `CoverLetterCanvas` renders cover letters. The diff view is computed client-side, not by the backend.

### 5. Direct User Edits

User edits a field inline → `RichEditableField` or `EditableField` captures the change → edit is sent through `editQueue` (debounced) → typed ops are `PATCH`ed to `/api/sessions/{session_id}/document` → `ContentApplier` applies the ops → new `SessionDocument` version + `Patch` stored → response flows back through the React Query cache.

### 6. Drag & Drop Reordering

Works at four levels — sections, entries within sections, bullets within entries, and skill rows. Each uses `@dnd-kit/sortable` with a grip handle. On drag end, a `reorder_*` / `move_section` op is queued through `editQueue`. The UI updates optimistically before the API call completes.

### 7. Export / PDF Compilation

`GET /api/sessions/{id}/export?format=...` supports `tex`, `pdf`, `docx`, `txt`, and `html` for resumes and `pdf`/`docx` for cover letters. `ResumeRenderer` generates `.tex` and `.html` from `ResumeContent` via Jinja2 templates; PDFs are produced by `LatexCompiler` POSTing the source to `http://latex:9777/compile`, where `compile_server.py` runs `latexmk -pdf` and returns the PDF bytes.

## Key Design Decisions

**Structured content is the single source of truth.** `ResumeContent` (Pydantic model: `Basics` → `Section[]` → `Entry[]` → `Bullet[]`, plus `SkillRow[]`) is stored as `content_json` (JSONB) in the database. Cover letters use a separate `CoverLetterContent` schema (`salutation`, `paragraphs[]`, `closing`). LaTeX is generated from templates, never parsed back.

**LaTeX is output-only.** Jinja2 templates (`resume.tex.j2`, `resume.html.j2`) receive `ResumeContent` and produce formatted output. No surgical serialization, no token-tree walking.

**Path-based editing ops.** The LLM and user edit content through operations addressed by semantic paths (`section_label`, `entry_index`, `bullet_index`) instead of fragile tree-node IDs. Ops are validated and applied by `ContentApplier` in `services/editing/content_ops.py`.

**LLM proposal flow (accept/decline).** The chat endpoint emits an SSE `proposal` event with proposed operations, an explanation, and reasoning. The frontend renders an `EnhancedProposal` component with Accept/Decline and an inline reply-to-refine loop. Changes are not auto-applied; on accept, `ContentApplier` applies ops and creates a new document version.

**OAuth-only authentication with rotation.** Users sign in via GitHub or Google; there is no password login. Access (15 min) and refresh (7 days) JWTs are stored in httpOnly cookies, and the refresh token rotates on use with reuse detection (`auth.py`, `utils/tokens.py`). `get_current_user` (`api/deps.py`) decodes the access cookie. A double-submit CSRF token (`csrf_token` cookie + `X-CSRF-Token` header, exposed via CORS, exempt for `/api/auth/*` and `/api/health`) protects state-changing requests. Next.js rewrites `/api/auth/*` to the backend so OAuth callbacks stay same-origin.

**Pydantic validation replaces manual checks.** Every edit goes through `ResumeContent.model_validate()` (or `CoverLetterContent.model_validate()`), which checks field types, required fields, and span offset bounds. No manual ID-existence or type checks.

**HTTP compile microservice instead of `docker exec`.** The latex container runs a lightweight Python HTTP server (`compile_server.py`) that receives tex source and returns PDF bytes. Avoids mounting the Docker socket into the backend container.

**Rich text via custom spans, not a full editor library.** `Span` objects track `start`, `end`, and `formats` (bold, italic, underline, code) for formatting annotations on bullet text. `RichEditableField` provides a toolbar and keyboard shortcuts without pulling in Slate or ProseMirror.

**Flat list schema, not a tree.** `ResumeContent` uses ordered lists (`sections`, `entries`, `bullets`) that mirror visual layout. No recursive tree walking or parent-child ID lookups. Sections are generic (identified by `label`) so users can have custom sections like `RESEARCH` or `CERTIFICATIONS`.

**Client-side diff computation.** The backend proposal event does not compute a diff (`diff` is `null`). The frontend computes added/modified/removed changes itself in `computeFieldDiffs` (`lib/fieldDiff.ts`) by comparing the pre-proposal snapshot with the applied document, keyed by stable content IDs; `wordDiff` adds word-level highlighting via a dynamic-programming LCS.

## Directory Structure

```
resume_builder/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app (title "Tailr"); middleware stack (CORS exposing
│   │   │                        X-CSRF-Token, 10 MB payload limit → 413, CSRF); slowapi
│   │   │                        Limiter on app.state + 429 handler; router registration
│   │   ├── config.py            pydantic-settings Settings from .env (DB, Redis, SECRET_KEY ≥ 32
│   │   │                        chars, FRONTEND_ORIGIN, GitHub/Google OAuth)
│   │   ├── db.py                Async SQLAlchemy engine + session factory (get_db)
│   │   ├── api/
│   │   │   ├── auth.py          OAuth (GitHub/Google) login + callback, token refresh, logout,
│   │   │   │                    and /api/users endpoints (me, preferences)
│   │   │   ├── sessions.py      Session CRUD, /analyze, cover-letter generation, /api/master-resume,
│   │   │   │                    /api/companies, /api/tags
│   │   │   ├── tailor.py        Chat endpoint (SSE), proposal accept/decline
│   │   │   ├── document.py      PATCH /document — typed user edit ops
│   │   │   ├── export.py        Export resume/cover letter (tex, pdf, docx, txt, html)
│   │   │   ├── providers.py     LLM provider CRUD, test, model list (Redis cache)
│   │   │   └── deps.py          get_current_user (JWT from httpOnly cookie) → CurrentUser
│   │   ├── models/
│   │   │   ├── models.py        SQLAlchemy ORM: User, LLMProvider, MasterResume, Session,
│   │   │   │                    SessionDocument, Patch, ChatMessage, RefreshToken
│   │   │   └── resume_schema.py Pydantic: ResumeContent, Basics, Section, Entry, Bullet, Span,
│   │   │                        SkillRow, Profile, CoverLetterContent
│   │   ├── services/
│   │   │   ├── llm/
│   │   │   │   ├── factory.py   Adapter factory (openai, anthropic, ollama, custom)
│   │   │   │   ├── prompts.py   Prompt builders (tailor, plan mode, cover letter)
│   │   │   │   └── adapters/    base, openai, anthropic, ollama
│   │   │   ├── editing/
│   │   │   │   └── content_ops.py  Typed ops + ContentApplier (resume & cover letter)
│   │   │   ├── rendering/
│   │   │   │   ├── renderer.py     LaTeX/HTML generation from ResumeContent
│   │   │   │   └── templates/      resume.tex.j2, resume.html.j2
│   │   │   ├── latex/
│   │   │   │   ├── compiler.py     HTTP client calling the compile microservice (:9777)
│   │   │   │   ├── compile_server.py  HTTP server (runs inside the latex container)
│   │   │   │   └── parser.py       LaTeX tokenizer (not referenced by current endpoints)
│   │   │   ├── importers/
│   │   │   │   └── tex_llm_importer.py  Send .tex to LLM, parse result into ResumeContent
│   │   │   └── research/
│   │   │       ├── scraper.py      Careers page / blog / Reddit scraping (duckduckgo-search)
│   │   │       ├── extractor.py    Job-description URL → text
│   │   │       └── summarizer.py   Keyword-based company research summary
│   │   ├── middleware/
│   │   │   └── csrf.py             Double-submit CSRF token validation
│   │   └── utils/
│   │       ├── tokens.py           JWT access/refresh token creation + decoding
│   │       └── crypto.py           AES-GCM encryption of provider API keys
│   ├── tests/                      pytest test suite
│   ├── Dockerfile
│   └── pyproject.toml              Poetry dependencies (Python ^3.11)
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx, globals.css Root layout + Tailwind directives
│   │   ├── page.tsx                Public landing page
│   │   ├── (auth)/login/           OAuth sign-in (GitHub / Google)
│   │   ├── (app)/
│   │   │   ├── dashboard/          Session dashboard
│   │   │   ├── session/[id]/       Session view (chat rail + canvas)
│   │   │   ├── company/[name]/     Company management
│   │   │   └── tag/[tag]/          Tag management
│   │   ├── components/
│   │   │   ├── document/           DocumentCanvas, SectionRenderer, EntryRenderer, BulletRenderer,
│   │   │   │                       SkillRowRenderer, ResumeHeader, CoverLetterCanvas,
│   │   │   │                       SortableSection/Entry/Bullet/SkillRow, EditableField,
│   │   │   │                       RichEditableField, FormattedText, DocumentTopBar, DocumentTabs
│   │   │   ├── chat/               ChatRail, ChatMessageList, ChatInput, ProgressMessage,
│   │   │   │                       EnhancedProposal, ModelPicker, ModeBar, JDSetupForm
│   │   │   ├── diff/               DiffOverlay, DiffContext (client-side diff view)
│   │   │   ├── import/             ImportReview (master resume import + review)
│   │   │   ├── layout/             AppShell, ErrorBoundary
│   │   │   ├── sidebar/            Sidebar, history, archived items
│   │   │   ├── search/             SearchModal
│   │   │   ├── settings/           SettingsModal (user preferences, LLM providers)
│   │   │   ├── ui/                 Shared UI primitives (Button, Input, Modal, Spinner, Toaster)
│   │   │   ├── theme/              ThemeProvider
│   │   │   └── auth/               ProtectedRoute
│   │   ├── hooks/                  queries.ts (React Query), useAnalyzeMutation, useKeyboardShortcut
│   │   ├── stores/                 sessionStore, searchStore, layoutStore (Zustand)
│   │   ├── lib/
│   │   │   ├── api.ts              fetch wrapper (CSRF token, 401 → refresh)
│   │   │   ├── editQueue.ts        Debounced optimistic edit queue
│   │   │   ├── sseParser.ts        SSE reader (parseSSEStream)
│   │   │   ├── fieldDiff.ts        Client-side diff computation
│   │   │   └── env.ts              Client-side env helpers
│   │   ├── types/index.ts          TypeScript types mirroring ResumeContent schema
│   │   └── providers/QueryClientProvider.tsx
│   ├── tests/                      vitest test suite
│   ├── Dockerfile
│   ├── package.json                Node dependencies
│   ├── next.config.js              output: standalone; /api/auth/:path* rewrites to backend
│   ├── tailwind.config.ts
│   └── .env.local                  Environment variables (API URL, etc.)
│
├── docker/
│   └── latex/
│       ├── Dockerfile              texlive-full + Python base image
│       └── compile_server.py       HTTP compile service (entrypoint for the latex container)
│
├── docker-compose.yml              5 services: db, redis, latex, backend, frontend
└── docs/                           This file
```
