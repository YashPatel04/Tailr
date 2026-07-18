## Why

Job seekers tailor their resumes for every application, but existing tools either produce generic AI-generated fluff that reads like ChatGPT, or break LaTeX formatting entirely. This app gives users a precision editing tool — like a copyeditor's desk — that tailors their resume to a specific job description using LLMs while preserving exact LaTeX formatting fidelity, organizing work by company, and producing output that reads as genuinely human-written.

## What Changes

- New web application with Python FastAPI backend and React Next.js frontend
- LaTeX-native document pipeline: parse `.tex` into a lossless syntactic token tree, extract a structured document model for LLM editing, and serialize back to idiomatic `.tex`
- Multi-provider LLM integration (OpenAI, Anthropic, Ollama) with encrypted API key storage, configurable per tailoring session
- Three tailoring levels (micro-edits, reorganization, full rewrite) controlling how aggressively the LLM restructures the resume
- Company research pipeline that scrapes official sources and subreddits before tailoring, informing tone and emphasis
- Interactive diff view with margin proofreading marks (Proof Green/Red) on rendered document sections — not PDF diffs
- Chat-style interface with SSE-based progress pipeline (Researching → Thinking → Writing → Done)
- Sidebar navigation with ChatGPT-style layout: logo + search toggle + collapse, New Chat, Projects, scrollable history categorized by date, fixed profile at bottom
- Company-wise organization: Master Resume → Company folder → Role/posting, with global tagging across companies
- Cover letter generation from the same JD + research context, in generic letter format
- Multi-format import (.tex, .docx, .txt) normalized to a unified document model
- Multi-format export (.tex, .pdf, .docx, .txt) regardless of input format
- Email + OAuth (GitHub, Google) authentication with JWT in httpOnly cookies, CSRF protection, rate limiting
- Docker Compose local development setup with PostgreSQL, Redis, texlive-full, MailHog
- Design system: Paper/Ink base palette, Brass accent, Proof Green/Red for diffs only, serif/sans/mono type pairing (Newsreader, Public Sans, JetBrains Mono)

## Capabilities

### New Capabilities

- `doc-parsing`: Parse `.tex` files into a lossless syntactic token tree, extract a structured document model with stable node IDs and a template vocabulary map. Also handles `.docx` and `.txt` import normalization.
- `doc-editing`: JSON patch protocol (modify/insert/delete/move/ask) for LLM-driven document mutations, validated and applied to the token tree. Tracks version chains and computes structural diffs.
- `doc-compilation`: Docker-based LaTeX compilation via latexmk with full texlive, error extraction with cheap LLM-generated fix suggestions. Multi-format export from document model to `.tex`, `.pdf`, `.docx`, `.txt`.
- `llm-integration`: Multi-provider LLM support with encrypted API key storage, per-provider parameter configuration, and swappable per-session. Supports OpenAI, Anthropic, Ollama, and custom providers.
- `company-research`: Pre-tailoring web scraping pipeline from official sources (careers page, engineering blog) and subreddits (r/ExperiencedDevs, r/cscareerquestions), summarized and injected into the tailoring prompt. 15-second timebox, graceful degradation.
- `user-auth`: Email/password registration with verification and password reset, plus GitHub and Google OAuth login. JWT-based sessions with access/refresh tokens in httpOnly cookies. No TOTP for initial release.
- `tailoring-session`: Full lifecycle for tailoring sessions — create from master resume + JD, store company/role metadata, attach chat history, manage patches, generate cover letters, organize by company with global tag support.
- `ui-layout`: ChatGPT-style three-pane layout: collapsible sidebar (logo + search + new chat + projects + history + profile), dominant document canvas, right-side chat rail. Search modal overlay. Design system with Paper/Ink/Brass/Proof colors and serif/sans/mono typefaces.
- `diff-view`: Interactive rendered document diff with margin proofreading marks (green/red vertical rules, caret for insertions, strikethrough for deletions). 150-200ms transitions on updates. Live alongside chat for iterative revision.

### Modified Capabilities

None — this is a new project with no existing specs.

## Impact

- New codebase: Python FastAPI backend, React Next.js frontend, PostgreSQL database, Redis cache
- Docker infrastructure: texlive-full compilation container, MailHog dev email, docker-compose orchestration
- Dependencies: tree-sitter-latex (parsing), python-docx (import/export), latexmk (compilation), sqlalchemy + asyncpg (DB), httpx + BeautifulSoup (research), python-jose (JWT), slowapi (rate limiting)
- Zero paid services required except user-provided LLM API keys
