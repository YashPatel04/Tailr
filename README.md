# Tailr

A precision editing tool that tailors your resume to specific job descriptions using LLMs. Think of it as a copyeditor's desk — it preserves your exact formatting while making targeted, reviewable edits.

## How it works

1. **Upload a master resume** — a `.tex` file is parsed (LLM-assisted) into a typed JSON content model: sections, entries, bullets, skill rows, and inline formatting spans (bold, italic, underline, code).
2. **Add an LLM provider** — OpenAI, Anthropic, Ollama, or any OpenAI-compatible custom endpoint.
3. **Start a session** — give the company and role, paste a job description. The LLM researches the company (keyword-based web search) and proposes targeted edits.
4. **Review changes** — proposals arrive as structured content operations. Changes are shown as proofreading marks (green additions, red removals) on the rendered document.
5. **Chat to refine** — iterate on the proposal with follow-up messages, or accept/decline.
6. **Export** — download the resume as `.tex`, `.pdf`, `.docx`, or `.txt`, plus a cover letter (`.pdf`/`.docx`).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- No other dependencies are required on the host — everything runs in containers

## Quick Start

### 1. Create environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Set a secure `SECRET_KEY` in `backend/.env` (at least 32 characters — the backend refuses to start otherwise):

```bash
openssl rand -hex 32
```

### 2. Start all services

```bash
docker compose up --build
```

This launches 5 services:

| Service    | URL                   | Purpose                      |
| ---------- | --------------------- | ---------------------------- |
| Frontend   | http://localhost:3000 | Next.js app                  |
| Backend    | http://localhost:8000 | FastAPI REST API + SSE chat  |
| PostgreSQL | localhost:5432        | Persistent storage           |
| Redis      | localhost:6379        | LLM model-list cache         |
| LaTeX      | (internal)            | texlive-full PDF compilation |

### 3. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Sign in

Visit **http://localhost:3000** and sign in with GitHub or Google (the only supported auth — there is no email/password registration).

## Usage

1. **Set up your master resume** — click the Settings icon, then **Master Resume** to upload a `.tex` file, or **Providers** to add an LLM provider (OpenAI, Anthropic, Ollama, or custom).
2. **Start a session** — click **New Chat**, enter the company name, role, and paste a job description.
3. **Review changes** — the LLM returns a proposal shown as proofreading marks on the rendered document. Accept, decline, or send feedback to refine.
4. **Export** — download as `.tex`, `.pdf`, `.docx`, or `.txt`, and optionally a cover letter.

## Development

### Backend (Python/FastAPI)

```bash
cd backend
poetry install          # Install dependencies
poetry run uvicorn app.main:app --reload --port 8000
```

- **Lint:** `poetry run ruff check . && poetry run ruff format --check .`
- **Test:** `poetry run pytest` (requires a local `resume_builder_test` PostgreSQL database)

### Frontend (Next.js/TypeScript)

```bash
cd frontend
npm install             # Install dependencies
npm run dev             # Start dev server on port 3000
```

- **Lint:** `npm run lint && npx prettier --check .`
- **Test:** `npm test` (Vitest + MSW, no external services)

### Pre-commit hooks

```bash
pip install pre-commit
pre-commit install
```

Runs ruff (Python), ESLint, and Prettier on every commit.

## Architecture

```
                         ┌──────────────┐
                         │   Browser    │
                         └──────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
         ┌────▼────┐     ┌─────▼──────┐    ┌─────▼─────┐
         │ Sidebar │     │  Document  │    │ Chat Rail │
         └─────────┘     │   Canvas   │    └─────┬─────┘
                         └─────┬──────┘          │  SSE
                               │                 │
                        ┌──────▼─────────────────▼──────┐
                        │         FastAPI Backend        │
                        │  Auth │ Sessions │ Content ops │
                        │  LLM  │ Research │ Import/Export│
                        └──────┬───────────┬────────────┘
                               │           │
                    ┌──────────▼──┐  ┌─────▼──────┐
                    │ PostgreSQL  │  │   Redis    │
                    └─────────────┘  └────────────┘
                               │
                        ┌──────▼──────┐
                        │  LaTeX/PDF  │
                        │  Container  │
                        └─────────────┘
```

### Document Pipeline

1. **Import** — a `.tex` master resume is converted to a typed JSON content model (LLM-assisted extraction with self-correction retries).
2. **Edit** — the LLM returns structured content operations (add/update/delete bullets, entries, sections, skill rows); validated and applied server-side as a new document version.
3. **Review** — the frontend computes field-level diffs against the master resume and shows them as proofreading marks.
4. **Render** — the JSON model renders to the canvas and exports to `.tex`, `.pdf`, `.docx`, or `.txt`.

### Key Design Decisions

- **Typed JSON content model** — LLMs edit structured data with inline formatting spans, not raw LaTeX.
- **Content operations protocol** — 24 typed ops; the user's own edits are batched, debounced, and undoable.
- **Client-side field diff** — changes are computed against the master resume in the browser, not sent from the server.
- **SSE chat pipeline** — Researching → Thinking → Writing → Proposal events streamed over a single `fetch` stream.
- **Keyword-based company research** — lightweight web search with value/signal keyword matching, no LLM call.
- **OAuth-only auth** — GitHub/Google sign-in with rotating JWT cookies and double-submit CSRF.

## Tech Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Backend  | Python 3.11, FastAPI, SQLAlchemy (async/asyncpg), Alembic               |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query, Zustand |
| Database | PostgreSQL 16                                                           |
| Cache    | Redis 7                                                                 |
| Auth     | OAuth (GitHub/Google), JWT httpOnly cookies, CSRF                       |
| LLM      | OpenAI, Anthropic, Ollama + OpenAI-compatible custom adapters           |
| Compile  | Dockerized texlive-full + latexmk                                       |
| Export   | python-docx, jinja2 (tex/txt), pypdf                                    |
| Linting  | ruff (Python), ESLint + Prettier (TypeScript)                           |
| Testing  | pytest + pytest-asyncio (backend), Vitest + MSW (frontend)              |
