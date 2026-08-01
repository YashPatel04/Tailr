# Tailr

A precision editing tool that tailors your LaTeX resume to specific job descriptions using LLMs. Think of it as a copyeditor's desk — it preserves your exact formatting while letting AI make targeted edits you can review and approve.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- No other dependencies are required on the host — everything runs in containers

## Quick Start

### 1. Create environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Then generate a secure secret key for `backend/.env`:

```bash
# Linux/macOS
openssl rand -hex 32 | sed 's/.*/SECRET_KEY=&/' | sed -i '' 's/SECRET_KEY=.*/SECRET_KEY=&/' backend/.env 2>/dev/null || \
  echo "SECRET_KEY=$(openssl rand -hex 32)" | tee -a backend/.env
```

Or manually set `SECRET_KEY` to a random string at least 32 characters long.

### 2. Start all services

```bash
docker compose up --build
```

This launches 6 services:

| Service    | URL                     | Purpose                          |
| ---------- | ----------------------- | -------------------------------- |
| Frontend   | http://localhost:3000   | Next.js app                      |
| Backend    | http://localhost:8000   | FastAPI REST API                 |
| PostgreSQL | localhost:5432          | Persistent storage               |
| Redis      | localhost:6379          | Rate limiting cache              |
| LaTeX      | (internal)              | texlive-full compilation         |
| MailHog    | http://localhost:8025   | Dev email capture (SMTP: 1025)   |

### 3. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Open the app

Visit **http://localhost:3000**, register an account, and check http://localhost:8025 to verify your email (MailHog captures all dev emails).

## Usage

1. **Upload your master resume** — Settings > Master Resume. Supports `.tex`, `.docx`, and `.txt`.
2. **Add an LLM provider** — Settings > Providers. Supports OpenAI, Anthropic, Ollama, and OpenAI-compatible custom endpoints.
3. **Start a session** — Click "New Chat" in the sidebar, enter company name, role, and paste a job description.
4. **Review changes** — The LLM returns a structured diff shown with proofreading marks (green for additions, red for deletions) on the rendered document.
5. **Chat to refine** — Send follow-up messages in the chat rail to iterate on the changes.
6. **Export** — Download as `.tex`, `.pdf`, `.docx`, or `.txt`.

## Development

### Backend (Python/FastAPI)

```bash
cd backend
poetry install          # Install dependencies
poetry run uvicorn app.main:app --reload --port 8000
```

- **Lint:** `poetry run ruff check . && poetry run ruff format --check .`
- **Test:** `poetry run pytest`

### Frontend (Next.js/TypeScript)

```bash
cd frontend
npm install             # Install dependencies
npm run dev             # Start dev server on port 3000
```

- **Lint:** `npm run lint && npx prettier --check .`
- **Test:** `npm test`

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
         │ (260px) │     │   Canvas   │    │  (320px)  │
         └─────────┘     └─────┬──────┘    └─────┬─────┘
                               │                 │
                        ┌──────▼─────────────────▼──────┐
                        │         FastAPI Backend        │
                        │   Auth │ Sessions │ Parsing    │
                        │   LLM  │ Research │ Compile   │
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

1. **Parse** — `.tex`, `.docx`, or `.txt` → tree-sitter token tree
2. **Extract** — Token tree → structured document model (sections, entries, bullets)
3. **Edit** — LLM returns JSON patch → validated → applied to document model
4. **Serialize** — Edited model → idiomatic `.tex` (using learned vocabulary map)
5. **Export** — `.tex` → compiled PDF, or serialized to `.docx`/`.txt`

### Key Design Decisions

- **Syntactic token tree**, not semantic AST — handles exotic user templates
- **JSON patch protocol** — LLMs edit structured document model, not raw `.tex`
- **Interactive section diff** — proofreading marks in rendered view, not PDF comparison
- **SSE progress pipeline** — Researching → Thinking → Writing → Done
- **Master resume push-back is opt-in** — apply individual changes back, not the whole session

## Tech Stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Backend    | Python 3.11, FastAPI, SQLAlchemy (async), Alembic  |
| Frontend   | Next.js 15, React 19, TypeScript, Tailwind CSS      |
| Database   | PostgreSQL 16                                       |
| Cache      | Redis 7                                            |
| Parsing    | tree-sitter-latex                                   |
| Auth       | JWT (httpOnly cookies), bcrypt, CSRF                |
| LLM        | OpenAI, Anthropic, Ollama + custom adapters         |
| Compile    | Dockerized texlive-full + latexmk                   |
| Email dev  | MailHog                                            |
| Linting    | ruff (Python), ESLint + Prettier (TypeScript)       |
| Testing    | pytest + pytest-asyncio (backend), Vitest + MSW (frontend) |
