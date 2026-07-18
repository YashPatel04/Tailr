## 1. Project Scaffold & Infrastructure

- [ ] 1.1 Create top-level `docker-compose.yml` with services: db (PostgreSQL 16-alpine), redis (7-alpine), latex (texlive-full), backend, frontend, mailhog
- [ ] 1.2 Create `docker/latex/Dockerfile` based on texlive/texlive (or ubuntu + texlive-full) with latexmk, set entrypoint to `sleep infinity`
- [ ] 1.3 Create `backend/` FastAPI project with Poetry/pip, add dependencies: fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, alembic, pydantic, python-jose, httpx, beautifulsoup4, duckduckgo-search, python-docx, slowapi, bcrypt, redis, tree-sitter, tree-sitter-latex, pytest, pytest-asyncio, httpx (for test client), ruff
- [ ] 1.4 Create `frontend/` Next.js project with TypeScript, configure Tailwind CSS with the design system palette (Paper #F1F2EE, Ink #171B22, Slate #5B6472, Brass #B8863A, Proof Green #2E7D5B, Proof Red #B23B3B), and custom font families (Newsreader, Public Sans, JetBrains Mono). Add vitest, @testing-library/react, @testing-library/jest-dom, eslint, prettier, eslint-config-next
- [ ] 1.5 Configure Alembic and create initial migration with all tables: users, llm_providers, master_resumes, sessions, session_documents, patches, chat_messages, refresh_tokens, email_verifications
- [ ] 1.6 Add Lucide icon package and configure SVG sprite or per-icon imports
- [ ] 1.7 Create backend `.env` / environment config loader with DATABASE_URL, REDIS_URL, LATEX_WORK_DIR, SECRET_KEY, SMTP_HOST, SMTP_PORT
- [ ] 1.8 Configure ruff in `backend/pyproject.toml` with rules for formatting, import sorting, and code style
- [ ] 1.9 Configure ESLint + Prettier in `frontend/` with TypeScript rules, consistent with Next.js defaults
- [ ] 1.10 Create `.pre-commit-config.yaml` at repo root running ruff check, ESLint, and Prettier on staged files
- [ ] 1.11 Create GitHub Actions CI workflow (`.github/workflows/ci.yml`) running backend tests, frontend tests, ruff, ESLint, and Prettier on push

## 2. Authentication System

- [ ] 2.1 Implement email/password registration endpoint with bcrypt hashing, email uniqueness check, unverified user creation
- [ ] 2.2 Implement email verification flow: generate single-use token (1hr expiry), send email via SMTP (MailHog in dev), verify endpoint that marks user as verified
- [ ] 2.3 Implement login endpoint: verify credentials, check email verified, issue access token (15min) and refresh token (7d) as httpOnly Secure SameSite=Lax cookies
- [ ] 2.4 Implement refresh token rotation: refresh endpoint issues new access token, rotates refresh token, detects reuse (revokes all tokens for user on replay)
- [ ] 2.5 Implement password reset flow: forgot-password generates token (does not reveal whether email exists), reset-password validates token and updates hash, revokes all refresh tokens
- [ ] 2.6 Implement GitHub OAuth: redirect to GitHub, handle callback, create or link user, set cookies, redirect to app
- [ ] 2.7 Implement Google OAuth: same flow as GitHub
- [ ] 2.8 Implement logout endpoint: revoke current refresh token, clear cookies
- [ ] 2.9 Create JWT dependency/middleware for FastAPI that validates access token on protected routes
- [ ] 2.10 Build login, register, verify-email, forgot-password, reset-password pages in frontend with design system styling

## 3. Security Middleware

- [ ] 3.1 Implement CSRF protection: double-submit cookie pattern, middleware validates CSRF token on POST/PUT/DELETE, exempt GET/HEAD/OPTIONS
- [ ] 3.2 Configure rate limiting via slowapi: /auth/* 20/min, /api/research 10/min, /api/tailor 6/min, /api/compile 30/min, return 429 with Retry-After
- [ ] 3.3 Configure CORS middleware with explicit frontend origin allowlist
- [ ] 3.4 Add CSP headers middleware
- [ ] 3.5 Add Pydantic request validation with max payload sizes (1MB for .tex uploads) on all endpoints
- [ ] 3.6 Implement AES-GCM encryption/decryption utility for API keys using app SECRET_KEY

## 4. Document Parsing Pipeline

- [ ] 4.1 Integrate tree-sitter-latex in Python backend: load grammar, create parser, define token node types
- [ ] 4.2 Build syntactic token tree parser: parse .tex source → typed nodes (command, environment, group, text, math, verbatim, comment) with source ranges
- [ ] 4.3 Build token tree serializer: traverse tree → produce byte-identical .tex output
- [ ] 4.4 Build document model extractor: walk token tree, map known commands to semantic types (section, entry, bullet, text), record spans with formatting annotations
- [ ] 4.5 Implement stable ID generator: assign persistent IDs to structural nodes within a session context
- [ ] 4.6 Build template vocabulary map: extract which commands the user's template uses for each semantic type during parsing
- [ ] 4.7 Implement .docx import: python-docx extraction mapping heading styles → sections, bullet paragraphs → bullets, bold/italic runs → span annotations
- [ ] 4.8 Implement .txt import: whitespace heuristic parser (ALL CAPS → sections, bullet-prefixed lines → bullets, rest → paragraphs)
- [ ] 4.9 Build generic .tex serializer for non-.tex inputs: document model → standard LaTeX commands
- [ ] 4.10 Implement page count enforcement: reject documents exceeding 5 pages

## 5. Document Editing Engine

- [ ] 5.1 Define JSON patch schema (Pydantic models): Operation union type with modify/insert/delete/move/ask variants
- [ ] 5.2 Build patch validator: check target/parent/after IDs exist, no cycles on moves, no delete of required metadata, format types in vocabulary, text length limits
- [ ] 5.3 Build patch applier: apply validated patch to document model, serialize updated token tree to .tex, save new document version with parent_doc_id
- [ ] 5.4 Implement document version chain: create child documents on each accepted patch, traverse chain for diff computation
- [ ] 5.5 Build structural diff engine: compare two document models, produce unified change set (added/removed/modified/moved nodes)
- [ ] 5.6 Implement master resume push-back: selectively apply individual patch operations to master resume's document model and .tex source

## 6. LLM Integration

- [ ] 6.1 Build LLM provider CRUD: create, list, update, delete provider configs with encrypted API key storage, masked key display (last 4 chars)
- [ ] 6.2 Implement provider test endpoint: send minimal request to provider's API, return success or error
- [ ] 6.3 Build OpenAI provider adapter: chat completions API with configurable model, temperature, top_p, max_tokens
- [ ] 6.4 Build Anthropic provider adapter: messages API with configurable model, temperature, max_tokens
- [ ] 6.5 Build Ollama provider adapter: chat API with configurable model, base URL
- [ ] 6.6 Build "custom" provider adapter for arbitrary OpenAI-compatible APIs (configurable base URL + API key)
- [ ] 6.7 Build prompt assembler: combine document model + JD text + user notes + career context + research summary + tailoring mode (Polish/Refine/Rewrite) into structured system prompt with JSON patch response format
- [ ] 6.8 Implement SSE streaming endpoint: /api/sessions/[id]/chat accepts user message, runs research if needed, streams progress events (researching/research_progress/research_done/thinking/writing/done)
- [ ] 6.9 Implement LLM response parsing: extract JSON patch from streaming/non-streaming LLM response, handle malformed responses with retry prompt

## 7. Company Research Pipeline

- [ ] 7.1 Build company name extractor: parse JD or user input to identify target company name
- [ ] 7.2 Build web scraper utility using httpx + BeautifulSoup: fetch page, extract visible text content with timeout
- [ ] 7.3 Implement careers page scraper: try `careers.{company}.com`, `{company}.com/jobs`, `{company}.com/careers`
- [ ] 7.4 Implement engineering blog search: duckduckgo-search for "{company} engineering blog", extract top 3 results
- [ ] 7.5 Implement subreddit search: duckduckgo-search for "site:reddit.com/r/ExperiencedDevs {company} hiring" and "site:reddit.com/r/cscareerquestions {company}", extract top 5 threads
- [ ] 7.6 Build research timeboxing: 5s per source, 15s total, drop timed-out sources gracefully
- [ ] 7.7 Build research summarizer: send scraped text to LLM for structured summary (values, hiring signals, tone guidance)
- [ ] 7.8 Store research summary in session record for reuse within session lifetime

## 8. LaTeX Compilation & Export

- [ ] 8.1 Build Docker container management: check latex container is running, write .tex to shared volume
- [ ] 8.2 Implement latexmk compilation: exec `latexmk -pdf -interaction=nonstopmode` in container, 30s timeout, capture stdout/stderr
- [ ] 8.3 Build error parser: extract line numbers and error messages from latexmk output
- [ ] 8.4 Build cheap LLM error suggestor: send error context to Ollama/GPT-4o-mini for fix suggestions (graceful fallback if unavailable)
- [ ] 8.5 Implement PDF caching: store compiled PDFs keyed by document version hash, serve cached on re-request
- [ ] 8.6 Implement .tex export: serialize document model to .tex using template vocabulary map (or generic LaTeX for non-.tex originals)
- [ ] 8.7 Implement .docx export: python-docx write with heading styles, bullet lists, bold/italic formatting
- [ ] 8.8 Implement .txt export: render document model as plain text with ALL CAPS sections and bullet-prefixed items

## 9. Tailoring Session Management

- [ ] 9.1 Implement session CRUD: create (from master resume + JD + company/role + tailoring mode + provider), read, update, archive, delete
- [ ] 9.2 Implement JD fetching: accept URL, fetch and parse content, store as session's job_description
- [ ] 9.3 Build session document initialization: copy master resume as first session_documents row with version 0
- [ ] 9.4 Implement chat message storage: save all messages (user, assistant, system) with metadata_json for progress events and patch references
- [ ] 9.5 Build session list endpoint: group by date category (Today, Yesterday, Previous 7 Days, Older) for sidebar display
- [ ] 9.6 Build company view endpoint: list all sessions for a company grouped by role
- [ ] 9.7 Implement global tag system: store tags as text[] on sessions, list distinct tags across all sessions with counts
- [ ] 9.8 Implement cover letter generation: separate prompt for letter format, store as session_documents with doc_type "cover_letter", share same research/JD context
- [ ] 9.9 Implement cover letter editing via same patch protocol applied to cover letter document type
- [ ] 9.10 Build master resume management: upload (parse + vocab extraction + .tex normalization), replace, get current

## 10. Frontend — Sidebar & Navigation

- [ ] 10.1 Build collapsible Sidebar component: expanded (260px) and collapsed (50px icon strip) states with transition
- [ ] 10.2 Build Sidebar header: logo placeholder, search icon button, collapse/expand toggle using Lucide icons (Search, PanelLeftClose/PanelLeftOpen)
- [ ] 10.3 Build New Chat button with Lucide Pencil/Plus icon
- [ ] 10.4 Build project grouping section: collapsible projects with session entries, derived from company grouping
- [ ] 10.5 Build History section: date-grouped session list (Today, Yesterday, Previous 7 Days, Older) with company name and role title
- [ ] 10.6 Build History session entry component: title, company tag, timestamp, hover actions (archive, rename, delete)
- [ ] 10.7 Build fixed Profile section: user avatar, email, click opens Settings menu with Lucide User icon
- [ ] 10.8 Build Search Modal overlay component: single input, live-filtered results grouped by category (Chats, Companies, Tags), Cmd/Ctrl+K shortcut, Escape to close

## 11. Frontend — Chat Rail

- [ ] 11.1 Build ChatRail component: fixed-width (320px), scrollable message list, fixed bottom input
- [ ] 11.2 Build ChatMessage component: role-based alignment (user right, system/assistant left), role-based color (user in Brass, system in Slate)
- [ ] 11.3 Build ProgressMessage component: Lucide icons per phase (Search → researching, Sparkles → thinking, Pencil → writing, Check → done), sub-text for researching/writing details
- [ ] 11.4 Build ChatInput component: textarea with auto-resize, Enter to send, Shift+Enter for newline
- [ ] 11.5 Implement SSE client: EventSource connection to /api/sessions/[id]/chat, parse event types, append messages to chat rail, update document canvas on writing/done events
- [ ] 11.6 Build session setup form within chat: company name, role title, JD input (URL or paste), tailoring mode selector (Polish/Refine/Rewrite), provider/model selector, notes field

## 12. Frontend — Document Canvas

- [ ] 12.1 Build DocumentCanvas component: dominant-width area, renders document model as styled sections
- [ ] 12.2 Build SectionRenderer: renders sections with serif font (Newsreader), handles section/entry/bullet/text node types
- [ ] 12.3 Build text span renderer: applies bold/italic formatting per span annotations within text nodes
- [ ] 12.4 Build raw .tex toggle: CodeMirror 6 editor (JetBrains Mono) per section, toggle between rendered and source view, re-parse on source edit
- [ ] 12.5 Build empty state: "No changes yet — paste a job description to begin" with action button
- [ ] 12.6 Build document tab switcher: toggle between Resume and Cover Letter views within a session

## 13. Frontend — Diff View

- [ ] 13.1 Build DiffView component: renders document with margin proofreading marks (vertical rules in Proof Green/Red, caret for insertions, strikethrough for deletions)
- [ ] 13.2 Build diff transition animations: 150-200ms fade/slide for changed elements on patch application
- [ ] 13.3 Build diff toggle: user can switch between "diff view" (with marks) and "final view" (clean document)
- [ ] 13.4 Build Accept/Reject buttons: accept all changes (remove highlights, finalize version), reject all (revert to pre-patch state)
- [ ] 13.5 Build hover tooltip: display `reasoning` text from patch operation on hover over changed element
- [ ] 13.6 Build "Apply to master" button: per-changed-element, pushes individual operation to master resume

## 14. Frontend — Settings Pages

- [ ] 14.1 Build Settings layout: navigation tabs/sidebar within settings (Profile, Providers, Master Resume, Templates, Account)
- [ ] 14.2 Build Profile settings: career context textarea (freeform "about me" for prompt injection)
- [ ] 14.3 Build Providers settings: list configured providers with masked keys, add/edit/delete/test actions, configurable parameters (temperature, top-p, max_tokens) per provider
- [ ] 14.4 Build Master Resume settings: upload button, current master preview (filename, page count, last modified), replace option
- [ ] 14.5 Build Templates settings: upload custom .cls/.sty files for LaTeX compilation (stretch goal)
- [ ] 14.6 Build Account settings: change password, linked OAuth accounts management, delete account

## 15. Backend Tests

- [ ] 15.1 Set up pytest configuration in `backend/pyproject.toml` with async test support and coverage targets
- [ ] 15.2 Write API integration tests for auth endpoints: register, verify, login, refresh, logout, forgot/reset password
- [ ] 15.3 Write API integration tests for OAuth flow: GitHub callback, Google callback, account linking
- [ ] 15.4 Write unit tests for document parsing: token tree construction, round-trip serialization, vocabulary extraction
- [ ] 15.5 Write unit tests for document model extraction: known commands → semantic types, unknown macros → opaque spans, formatting spans
- [ ] 15.6 Write unit tests for .docx and .txt import normalization
- [ ] 15.7 Write unit tests for patch validation: valid patches accepted, invalid IDs rejected, cycles detected, required metadata protected
- [ ] 15.8 Write unit tests for patch application: modify, insert, delete, move operations produce correct document model changes
- [ ] 15.9 Write unit tests for version chain and diff computation
- [ ] 15.10 Write unit tests for master resume push-back: selective operation application
- [ ] 15.11 Write unit tests for LLM provider adapters: OpenAI, Anthropic, Ollama request/response handling, error cases
- [ ] 15.12 Write unit tests for API key encryption/decryption
- [ ] 15.13 Write unit tests for research pipeline: timeboxing, source timeout, graceful degradation
- [ ] 15.14 Write unit tests for LaTeX compilation: valid compile, error extraction, cheap LLM suggestion, timeout
- [ ] 15.15 Write API integration tests for session CRUD: create, list by date, archive, delete
- [ ] 15.16 Write API integration tests for cover letter generation and editing

## 16. Frontend Tests

- [ ] 16.1 Configure Vitest with jsdom environment and React Testing Library in `frontend/`
- [ ] 16.2 Write component tests for Sidebar: expanded/collapsed states, history groups, session entries, profile section
- [ ] 16.3 Write component tests for SearchModal: opens/closes on icon click and Cmd+K, live filters, results grouped by category, closes on Escape
- [ ] 16.4 Write component tests for ChatRail: message rendering (user/system roles), progress event rendering with correct Lucide icons
- [ ] 16.5 Write component tests for ChatInput: text entry, Enter to send, Shift+Enter for newline
- [ ] 16.6 Write component tests for DocumentCanvas: section rendering, serif font application, empty state
- [ ] 16.7 Write component tests for raw .tex toggle: CodeMirror editor mount/unmount, re-parsing
- [ ] 16.8 Write component tests for DiffView: proofreading marks (green caret, red strikethrough), hover tooltips, accept/reject buttons
- [ ] 16.9 Write component tests for diff transitions: animation classes applied on change
- [ ] 16.10 Write hook tests for SSE client: event parsing, state updates
- [ ] 16.11 Write component tests for Settings pages: providers CRUD, career context save, master resume upload

## 17. Integration & Polish

- [ ] 17.1 Wire full flow: sidebar → new session → JD paste → research → tailoring → diff view → accept/reject → export
- [ ] 17.2 Implement light/dark mode with theme persistence (localStorage), Paper/Ink swap, consistent Brass accent
- [ ] 17.3 Add loading states and error boundaries across all components
- [ ] 17.4 Manual test: LaTeX parsing against real resume templates (moderncv, Awesome-CV, AltaCV, basic custom)
- [ ] 17.5 Manual test: .docx and .txt import/export round-trips
- [ ] 17.6 Manual test: LLM integration across all three providers (OpenAI, Anthropic, Ollama)
- [ ] 17.7 Manual test: error paths (invalid .tex compilation, network failures, LLM API errors, patch validation failures)
- [ ] 17.8 Run full test suite and linting before merge to main
