# Resume Builder — Architecture Overview

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2 (async) + PostgreSQL 16, Redis 7, Pydantic v2 |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand |
| LaTeX | Jinja2 templates, HTTP compile server on texlive container |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| State/Data | @tanstack/react-query (server state), Zustand (client state) |
| Streaming | SSE via `@microsoft/fetch-event-source` |
| Testing | pytest + pytest-asyncio (backend), vitest + @testing-library/react (frontend) |

## System Architecture

Six containers communicate over a shared Docker network:

```
Browser                   Browser
  │  :3000                   │  :8025 (web UI)
  ▼                          ▼
┌──────────┐           ┌──────────┐
│ frontend │           │ mailhog  │
│ Next.js  │──HTTP:8000▶│ (SMTP    │
│ 15       │           │  catch-   │
│          │           │  all)     │
└──────────┘           └────▲──────┘
     │                      │ :1025
     │  FastAPI              │
     ▼                      │
┌──────────┐              ┌─┴──────────┐
│ backend  │───HTTP:9777──▶│   latex    │
│ FastAPI  │              │ texlive +  │
│ uvicorn  │              │ compile_   │
│          │              │ server.py  │
└─┬──┬──┬──┘              └────────────┘
  │  │  │
  │  │  │ :6379
  │  │  ▼
  │  │ ┌───────┐
  │  │ │ redis │
  │  │ │ 7     │
  │  │ └───────┘
  │  │ :5432
  │  ▼
  │ ┌───────┐
  │ │  db   │
  │ │ PG 16 │
  │ └───────┘
  │ :8000
  ▼
(API responses
 to frontend)
```

| Container | Image | Role |
|---|---|---|
| `db` | `postgres:16-alpine` | Stores users, sessions, master resumes, patches, chat messages |
| `redis` | `redis:7-alpine` | Session state, rate limiting, caching |
| `latex` | custom `Dockerfile` | texlive + Python HTTP compile server on port 9777 |
| `backend` | custom `Dockerfile` | FastAPI API server on port 8000 |
| `frontend` | custom `Dockerfile` | Next.js dev server on port 3000 |
| `mailhog` | `mailhog/mailhog` | SMTP catch-all (1025) + web UI (8025) |

## Data Flow

### 1. Master Resume Import (one-time, per user)

User uploads a `.tex` master resume → backend sends the entire LaTeX source to the configured LLM with a structured prompt → LLM returns JSON → validated via `ResumeContent.model_validate()` → stored as `content_json` in the `master_resumes` table. A side-by-side comparison shows original vs. generated LaTeX; user reviews and accepts.

**Fallback path (no LLM):** regex extraction provides basic section structure — sections labelled by `\section*{}`, entries under each section.

### 2. Session Creation

User selects a master resume, enters company name + role title → backend copies the master's `ResumeContent` into a `SessionDocument` row (`doc_type: "initial"`). If no LLM import was run, fallback regex extraction runs here to populate the initial content.

### 3. Chat Message → SSE Stream

```
User sends message → POST /api/sessions/{id}/chat
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
   SSE event stream              Backend reads
   to frontend:                  ResumeContent from DB
   "researching" ────┐                │
   "thinking"    ────┤          builds LLM prompt
   "writing"     ────┤          with content + job desc
   "proposal" ←──────┘                │
          │                     calls LLM adapter
          ▼                     (OpenAI / Anthropic / Ollama)
   Frontend renders                   │
   ProposalMessage             LLM returns typed ops
   with Accept/Decline         (update_bullet, add_entry,
          │                     delete_section, etc.)
          ▼
   User clicks Accept
   → POST /proposal/accept
   → ContentApplier applies ops
   → diff computed (deepdiff)
   → new SessionDocument version stored
   → new Patch + ChatMessage rows stored
```

### 4. Canvas Rendering

`DocumentCanvas` receives `ResumeContent` JSON from the API → iterates `sections[]` → each `Section` renders through `SectionRenderer` → each `Entry` through `EntryRenderer` → each `Bullet` through `BulletRenderer`. The header (name, email, phone, profiles) renders via `ResumeHeader`. No intermediate data transformation.

### 5. Direct User Edits

User edits a field inline → `RichEditableField` or `EditableField` captures the change → edit is sent through `editQueue` (debounced) → typed op (e.g. `update_field`, `update_bullet`) is POSTed to the backend → `ContentApplier` applies the op → `ResumeContent.model_validate()` checks validity → new `SessionDocument` version saved → response flows back through React Query cache.

### 6. Drag & Drop Reordering

Works at three levels — sections, entries within sections, bullets within entries. Each uses `@dnd-kit/sortable` with a grip handle. On drag end, a `reorder_bullets` / `move_section` op is queued through `editQueue`. The UI updates optimistically before the API call completes.

### 7. PDF Compilation

Backend generates `.tex` from `ResumeContent` via Jinja2 template → sends HTTP POST to the latex container (`compile_server.py` on port 9777) with tex source → latex container runs `pdflatex` → returns PDF bytes → backend streams to frontend for download.

## Key Design Decisions

**Structured content is the single source of truth.** `ResumeContent` (Pydantic model with flat lists of `Basics` → `Section[]` → `Entry[]` → `Bullet[]`) is stored as `content_json` (JSONB) in the database. LaTeX is generated from templates, never parsed back.

**LaTeX is output-only.** Jinja2 templates (`resume.tex.j2`, `resume.html.j2`) receive `ResumeContent` and produce formatted output. No surgical serialization, no token-tree walking.

**Path-based editing ops.** The LLM and user edit content through operations addressed by semantic paths (`section_label`, `entry_index`, `bullet_index`) instead of fragile tree-node IDs. Paths are stable across regenerations and semantically meaningful to the LLM.

**LLM proposal flow (accept/decline).** The chat endpoint emits an SSE `proposal` event with proposed operations and a computed diff. The frontend renders a `ProposalMessage` with Accept/Decline buttons. Changes are not auto-applied. On accept, `ContentApplier` applies ops and creates a new document version.

**Pydantic validation replaces manual checks.** Every edit goes through `ResumeContent.model_validate()`, which checks field types, required fields, span offset bounds, and enum values. No manual ID-existence or type checks.

**HTTP compile microservice instead of `docker exec`.** The latex container runs a lightweight Python HTTP server (`compile_server.py`) that receives tex source and returns PDF bytes. Avoids mounting the Docker socket into the backend container.

**Rich text via custom spans, not a full editor library.** `Span` objects track `start`, `end`, and `formats` (bold, italic, underline, code) for formatting annotations on bullet text. `RichEditableField` provides a toolbar and keyboard shortcuts (Ctrl+B/I/U) without pulling in Slate or ProseMirror.

**Flat list schema, not a tree.** `ResumeContent` uses ordered lists (`sections`, `entries`, `bullets`) that mirror visual layout. No recursive tree walking or parent-child ID lookups. Sections are generic (identified by `label`) so users can have custom sections like `RESEARCH` or `CERTIFICATIONS`.

**Deepdiff for human-readable change descriptions.** Diffs produce field-level paths like `sections[2].entries[1].bullets[0].text` with old/new values, which the frontend maps back to rendered elements for color-coded highlighting.

## Directory Structure

```
resume_builder/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app, middleware, route registration
│   │   ├── config.py            Settings from env (DB, Redis, SMTP, OAuth)
│   │   ├── db.py                Async SQLAlchemy engine + session factory
│   │   ├── api/                 Route handlers
│   │   │   ├── auth.py          Login, register, OAuth, email verify
│   │   │   ├── sessions.py      Session + master resume CRUD, companies, tags
│   │   │   ├── tailor.py        Chat endpoint (SSE), LLM proposal accept/decline
│   │   │   ├── document.py      Document versioning, content CRUD
│   │   │   ├── export.py        LaTeX/PDF/HTML generation and download
│   │   │   ├── providers.py     LLM provider configuration
│   │   │   └── deps.py          Shared FastAPI dependencies (current user, DB session)
│   │   ├── models/
│   │   │   ├── models.py        SQLAlchemy ORM models (User, Session, SessionDocument, Patch, ChatMessage, etc.)
│   │   │   └── resume_schema.py Pydantic models (ResumeContent, Basics, Section, Entry, Bullet, Span)
│   │   ├── services/
│   │   │   ├── llm/             LLM adapter layer
│   │   │   │   ├── factory.py   Creates adapter from provider config
│   │   │   │   ├── prompts.py   System + user prompts for LLM interactions
│   │   │   │   └── adapters/    OpenAI, Anthropic, Ollama adapters
│   │   │   ├── editing/
│   │   │   │   └── content_ops.py  Typed ops: update_bullet, add_entry, move_section, etc.
│   │   │   ├── rendering/
│   │   │   │   ├── renderer.py     LaTeX/HTML generation from ResumeContent
│   │   │   │   └── templates/      resume.tex.j2, resume.html.j2
│   │   │   ├── latex/
│   │   │   │   ├── compiler.py     HTTP client calling the compile microservice
│   │   │   │   ├── compile_server.py  HTTP server (runs inside latex container)
│   │   │   │   └── parser.py       Regex fallback extractor for .tex when LLM unavailable
│   │   │   ├── importers/
│   │   │   │   └── tex_llm_importer.py  Send .tex to LLM, parse result into ResumeContent
│   │   │   ├── research/           Company research (job description scraping)
│   │   │   └── email.py            SMTP email sending
│   │   ├── middleware/
│   │   │   └── csrf.py             CSRF token generation and validation
│   │   ├── utils/                   Crypto, password hashing, token generation
│   │   └── templates/email/        Jinja2 email templates
│   ├── tests/                      pytest test suite
│   ├── Dockerfile
│   ├── pyproject.toml              Poetry dependencies (Python ^3.11)
│   └── .env                        Environment variables (DB URL, Redis URL, secrets)
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              Root layout
│   │   ├── globals.css             Tailwind directives
│   │   ├── (app)/                  Authenticated routes
│   │   │   ├── page.tsx            Dashboard (sessions list)
│   │   │   ├── session/[id]/       Session view (chat rail + canvas)
│   │   │   ├── company/            Company management
│   │   │   └── tag/                Tag management
│   │   ├── (auth)/                 Login, register, forgot/reset password, verify email
│   │   ├── settings/               User settings, LLM providers
│   │   ├── components/
│   │   │   ├── document/           Canvas renderers: DocumentCanvas, SectionRenderer,
│   │   │   │                       EntryRenderer, BulletRenderer, SkillRowRenderer,
│   │   │   │                       ResumeHeader, SortableSection/Entry/Bullet,
│   │   │   │                       EditableField, RichEditableField, FormattedText
│   │   │   ├── chat/               ChatRail, ChatMessageList, ChatInput,
│   │   │   │                       ProgressMessage, ProposalMessage, SessionSetupForm
│   │   │   ├── diff/               DiffView for proposal changes
│   │   │   ├── import/             Master resume upload + side-by-side comparison
│   │   │   ├── layout/             App shell, sidebar, header, navigation
│   │   │   ├── search/             Search components
│   │   │   ├── ui/                 Shared UI primitives (buttons, inputs, modals, etc.)
│   │   │   ├── theme/              Theme toggling
│   │   │   └── auth/               Auth form components
│   │   ├── hooks/
│   │   │   ├── queries.ts          React Query hooks (useSessions, useDocument, etc.)
│   │   │   ├── useSessionSSE.ts    SSE stream hook for chat
│   │   │   └── useKeyboardShortcut.ts
│   │   ├── stores/
│   │   │   ├── sessionStore.ts     Zustand: active session, pending proposal, edit queue
│   │   │   ├── searchStore.ts      Search state
│   │   │   └── layout.ts           Layout state
│   │   ├── lib/
│   │   │   ├── api.ts              API client (axios/fetch wrapper with CSRF)
│   │   │   ├── editQueue.ts        Debounced optimistic edit queue
│   │   │   └── env.ts              Client-side env helpers
│   │   ├── types/index.ts          TypeScript types mirroring ResumeContent schema
│   │   └── providers/              React Query client provider
│   ├── tests/                      vitest test suite
│   ├── Dockerfile
│   ├── package.json                Node dependencies
│   ├── tailwind.config.ts
│   └── .env.local                  Environment variables (API URL, etc.)
│
├── docker/
│   └── latex/
│       ├── Dockerfile              texlive + Python base image
│       └── compile_server.py       HTTP compile service (entrypoint for the latex container)
│
├── docker-compose.yml              All 6 services defined
├── openspec/                       Change proposals (specs + design docs)
└── docs/                           This file
```
