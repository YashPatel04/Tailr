## 0. Frontend Design System & Component Map (read this first)

These rules are inputs for every frontend task. Do not deviate without updating this section.

### 0.1 Design tokens (Tailwind theme extension in `frontend/tailwind.config.ts`)

- Colors:
  - `paper`: `#F1F2EE` — default page/canvas background in light mode
  - `ink`: `#171B22` — default text and dark-mode background
  - `slate`: `#5B6472` — secondary/muted text, system messages, borders
  - `brass`: `#B8863A` — primary accent, user chat bubbles, active states, buttons
  - `brass-hover`: `#9A6F2D` — hover state for brass elements
  - `proof-green`: `#2E7D5B` — additions only in diff view
  - `proof-red`: `#B23B3B` — deletions only in diff view
  - `danger`: `#B23B3B` — destructive actions (reuse proof-red)
- Font families:
  - `font-serif`: Newsreader (Google Fonts) — document canvas headings and body
  - `font-sans`: Public Sans (Google Fonts) — UI chrome, chat, labels
  - `font-mono`: JetBrains Mono (Google Fonts) — raw .tex source, code
- Spacing/sizing:
  - Sidebar expanded: `w-[260px]`
  - Sidebar collapsed: `w-[50px]`
  - Chat rail: `w-[320px]`
  - Header height: `h-14` (56px)
  - Max document width: `max-w-[820px]` centered in canvas
- Transitions:
  - Diff transitions: `transition-all duration-200 ease-out`
  - Sidebar collapse: `transition-[width] duration-200 ease-in-out`

### 0.2 Global layout component map

Root layout file: `frontend/app/layout.tsx`.
- Wraps everything in `ThemeProvider` (light/dark) from `frontend/app/components/theme/ThemeProvider.tsx`.
- Renders `Toaster` from `frontend/app/components/ui/Toaster.tsx` for all toast notifications.
- Provides `QueryClientProvider` (TanStack Query) from `frontend/app/providers/QueryClientProvider.tsx`.

Authenticated app shell: `frontend/app/components/layout/AppShell.tsx`.
- Props: `children: React.ReactNode` (the document canvas area).
- State: `sidebarCollapsed: boolean` (persist in `localStorage` key `rt-sidebar-collapsed`).
- Renders three flex children in a horizontal `div.h-screen.w-screen.flex.overflow-hidden.bg-paper.text-ink`:
  1. `<Sidebar collapsed={sidebarCollapsed} onToggle={...} />`
  2. `<main className="flex-1 min-w-0 overflow-hidden">{children}</main>`
  3. `<ChatRail />` (always mounted; shows empty state when no active session)
- Chat rail visibility on small screens is out of scope for MVP (desktop only).

### 0.3 Icon rules

- Import icons from `lucide-react`. Never use emojis in the product chrome.
- Default icon stroke width: `1.5`, default size: `16`.
- Sidebar icons use `size={18}` when collapsed.

### 0.4 API client rules

- Base fetch wrapper: `frontend/app/lib/api.ts` exporting `apiRequest(method, path, body?, options?)`.
- It attaches `credentials: "include"`, reads `X-CSRF-Token` header on GET and writes it back on mutating methods.
- It refreshes access token on 401 via `/api/auth/refresh` and retries once.
- All data fetching from React components uses TanStack Query hooks defined in `frontend/app/hooks/queries.ts`.

### 0.5 Type definitions

Central types file: `frontend/app/types/index.ts`. Must define:
- `User`, `LLMProvider`, `MasterResume`, `Session`, `SessionDocument`, `Patch`, `ChatMessage`, `ResearchSummary`, `DocumentModel`, `DiffChangeSet`, `ExportFormat`.
- `SectionNode` must include `label: string` and `tex_source: string | null` for the per-section raw .tex toggle.
- Keep all types in sync with backend Pydantic schemas.

---

## 1. Project Scaffold & Infrastructure

### 1.1 Docker Compose

 - [x] 1.1.1 Create `docker-compose.yml` at repo root with services:
  - `db`: image `postgres:16-alpine`, env `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, volume `postgres_data`, port `5432`.
  - `redis`: image `redis:7-alpine`, volume `redis_data`, port `6379`.
  - `latex`: build context `./docker/latex`, volumes `latex_work:/work`, command `sleep infinity`.
  - `backend`: build context `./backend`, env file `.env`, ports `8000:8000`, depends_on `db` and `redis`, volume `./backend:/app` for dev.
  - `frontend`: build context `./frontend`, ports `3000:3000`, env file `.env.local`, volume `./frontend:/app` for dev.
  - `mailhog`: image `mailhog/mailhog`, ports `1025:1025` and `8025:8025`.
 - [x] 1.1.2 Define named volumes `postgres_data`, `redis_data`, `latex_work`.
 - [x] 1.1.3 Add healthcheck to `db` service using `pg_isready`.

### 1.2 LaTeX Docker image

 - [x] 1.2.1 Create directory `docker/latex/`.
 - [x] 1.2.2 Create `docker/latex/Dockerfile` using `texlive/texlive:latest-full` (or Ubuntu + `texlive-full` if size is acceptable). Must include `latexmk`.
 - [x] 1.2.3 Set working directory `/work`, expose `/work` as shared volume, set `CMD ["sleep", "infinity"]`.
 - [x] 1.2.4 Ensure container runs as non-root user `latex` with UID 1000 to match dev volume permissions.

### 1.3 Backend project scaffold

 - [x] 1.3.1 Create `backend/` directory with `pyproject.toml` using Poetry.
 - [x] 1.3.2 Add dependencies: `fastapi`, `uvicorn[standard]`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `pydantic`, `pydantic-settings`, `python-jose[cryptography]`, `httpx`, `beautifulsoup4`, `duckduckgo-search`, `python-docx`, `slowapi`, `bcrypt`, `redis`, `tree-sitter`, `tree-sitter-latex`, `pytest`, `pytest-asyncio`, `httpx`, `ruff`, `python-multipart`, `email-validator`.
 - [x] 1.3.3 Create package structure:
  - `backend/app/__init__.py`
  - `backend/app/main.py` — FastAPI app factory
  - `backend/app/config.py` — Pydantic settings
  - `backend/app/db.py` — async engine, sessionmaker, Base
  - `backend/app/models/` — SQLAlchemy models
  - `backend/app/schemas/` — Pydantic request/response schemas
  - `backend/app/api/` — API routers
  - `backend/app/services/` — business logic
  - `backend/app/utils/` — encryption, tokens, etc.
  - `backend/app/tasks/` — background-ish helpers
  - `backend/tests/` — pytest tests mirroring app structure
 - [x] 1.3.4 Create `backend/alembic.ini` and `backend/alembic/` directory with `env.py` configured for async.
 - [x] 1.3.5 Create `backend/.env.example` with all required env vars.

### 1.4 Frontend project scaffold

 - [x] 1.4.1 Create `frontend/` with `npx create-next-app@latest` using TypeScript, App Router, Tailwind CSS, no src directory.
 - [x] 1.4.2 Install dependencies: `lucide-react`, `@tanstack/react-query`, `zustand`, `clsx`, `tailwind-merge`, `@uiw/react-codemirror` (or `codemirror` directly), `@codemirror/lang-lezer` (for .tex highlighting reuse plain text mode), `date-fns`, `react-hot-toast`, `zod`, `@microsoft/fetch-event-source`.
 - [x] 1.4.3 Install dev dependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@testing-library/dom`, `msw` (Mock Service Worker) v2, `eslint-config-prettier`, `prettier`, `@types/node`.
 - [x] 1.4.4 Create `frontend/vitest.config.ts` with `environment: "jsdom"`, `globals: true`, and path alias `@/*` mapping to `./app/*`.
 - [x] 1.4.5 Create `frontend/.env.example` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.
 - [x] 1.4.6 Delete default `frontend/app/page.tsx` content; replace with placeholder.

### 1.5 Tailwind + fonts configuration

 - [x] 1.5.1 Update `frontend/tailwind.config.ts` to extend theme with colors listed in 0.1 and font families `serif`, `sans`, `mono`.
 - [x] 1.5.2 Add Google Fonts imports for Newsreader, Public Sans, JetBrains Mono in `frontend/app/layout.tsx` using `next/font/google`. Export CSS variables `--font-serif`, `--font-sans`, `--font-mono`.
 - [x] 1.5.3 Configure `fontFamily.serif`, `fontFamily.sans`, `fontFamily.mono` in Tailwind to read those CSS variables.
 - [x] 1.5.4 Add global base styles in `frontend/app/globals.css`: `body { @apply bg-paper text-ink antialiased; }`, dark mode via `.dark` class.

### 1.6 Database initial migration

 - [x] 1.6.1 Define SQLAlchemy models in `backend/app/models/` for:
  - `User` (`id`, `email`, `password_hash`, `is_verified`, `oauth_provider`, `oauth_id`, `career_context`, `created_at`, `updated_at`)
  - `LLMProvider` (`id`, `user_id`, `name`, `provider_type`, `api_key_encrypted`, `base_url`, `model`, `temperature`, `top_p`, `max_tokens`, `is_default`, `created_at`, `updated_at`)
  - `MasterResume` (`id`, `user_id`, `filename`, `original_format`, `tex_source`, `vocabulary_map_json`, `page_count`, `created_at`, `updated_at`)
  - `Session` (`id`, `user_id`, `master_resume_id`, `company_name`, `role_title`, `job_description`, `tailoring_mode`, `llm_provider_id`, `notes`, `research_summary_json`, `tags`, `is_archived`, `created_at`, `updated_at`)
  - `SessionDocument` (`id`, `session_id`, `doc_type`, `version`, `document_model_json`, `tex_source`, `parent_doc_id`, `is_final`, `created_at`)
  - `Patch` (`id`, `session_id`, `source_doc_id`, `target_doc_id`, `operations_json`, `raw_llm_response`, `user_message`, `applied`, `user_feedback`, `created_at`)
  - `ChatMessage` (`id`, `session_id`, `role`, `content`, `metadata_json`, `patch_id`, `created_at`)
  - `RefreshToken` (`id`, `user_id`, `token_hash`, `expires_at`, `revoked`, `replaced_by_token_hash`, `created_at`)
  - `EmailVerification` (`id`, `user_id`, `token_hash`, `expires_at`, `used`)
  - `PasswordReset` (`id`, `user_id`, `token_hash`, `expires_at`, `used`)
 - [x] 1.6.2 Create Alembic initial migration generating all tables with foreign keys and indexes.
 - [x] 1.6.3 Add `pg_trgm` and `GIN` indexes only if full-text search is implemented; otherwise skip.

### 1.7 Environment & config

 - [x] 1.7.1 Create `backend/app/config.py` with `Settings` class reading `DATABASE_URL`, `REDIS_URL`, `LATEX_WORK_DIR`, `SECRET_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_TLS`, `FRONTEND_ORIGIN`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
 - [x] 1.7.2 Validate `SECRET_KEY` is at least 32 bytes on startup; fail fast if not.
 - [x] 1.7.3 Create `frontend/app/lib/env.ts` exporting typed env helpers; assert `NEXT_PUBLIC_API_BASE_URL` is set.

### 1.8 Lint & formatting

 - [x] 1.8.1 Configure `backend/pyproject.toml` with `[tool.ruff]` target Python 3.11+, select `E`, `F`, `I`, `N`, `W`, `UP`, `B`, `C4`, `SIM`, `ASYNC`, line length 100.
 - [x] 1.8.2 Configure `frontend/.eslintrc.json` extending `next/core-web-vitals`, `plugin:@typescript-eslint/recommended`, `prettier`.
 - [x] 1.8.3 Create `frontend/.prettierrc` with `semi: false`, `singleQuote: true`, `trailingComma: "es5"`, `printWidth: 100`.
 - [x] 1.8.4 Add `.pre-commit-config.yaml` at repo root running `ruff check --fix`, `ruff format`, `eslint --fix`, `prettier --write`, and `pytest` + `npm test` via local hooks.

### 1.9 CI

 - [x] 1.9.1 Create `.github/workflows/ci.yml` running on `push` and `pull_request`.
 - [x] 1.9.2 Job 1: backend lint/test in container with PostgreSQL service.
 - [x] 1.9.3 Job 2: frontend lint/test using Node LTS.
 - [x] 1.9.4 Add `--exit-zero` to nothing; failures block merge.

---

## 2. Authentication System (Backend)

### 2.1 Password utilities

 - [x] 2.1.1 Create `backend/app/utils/password.py` with `hash_password(plain: str) -> str` using `bcrypt`.
 - [x] 2.1.2 Add `verify_password(plain: str, hashed: str) -> bool`.

### 2.2 Token utilities

 - [x] 2.2.1 Create `backend/app/utils/tokens.py` with functions:
  - `create_access_token(user_id: UUID) -> str` (15 min)
  - `create_refresh_token(user_id: UUID) -> str` (7 days)
  - `decode_access_token(token: str) -> dict`
  - `decode_refresh_token(token: str) -> dict`
  - `generate_email_token() -> str` (URL-safe random 32 bytes)
  - `hash_token(token: str) -> str` (sha256 for DB storage)
 - [x] 2.2.2 Use `python-jose` with `HS256` and app `SECRET_KEY`.

### 2.3 Email service

 - [x] 2.3.1 Create `backend/app/services/email.py` with `send_email(to: str, subject: str, body: str, html: str | None = None) -> None`.
 - [x] 2.3.2 Use `aiosmtplib` if async, otherwise `smtplib`. In dev, target `mailhog:1025`.
 - [x] 2.3.3 Create email templates as plain text in `backend/app/templates/email/verification.txt` and `password_reset.txt`. HTML versions optional.

### 2.4 Registration endpoint

 - [x] 2.4.1 Create `backend/app/api/auth.py` router with prefix `/api/auth`.
 - [x] 2.4.2 Define `RegisterRequest` schema: `email: EmailStr`, `password: str` with `Field(min_length=10, max_length=128)`.
 - [x] 2.4.3 POST `/api/auth/register`: check email uniqueness, hash password, create unverified user, generate verification token, send email, return `{ "message": "Check your inbox" }` with identical response time regardless of email existence.
 - [x] 2.4.4 Store `EmailVerification` row with `token_hash`, `expires_at = now + 1 hour`.

### 2.5 Email verification endpoint

 - [x] 2.5.1 GET `/api/auth/verify-email?token=<token>`: hash token, find unused non-expired `EmailVerification`, mark user verified, mark token used, redirect to frontend `/login?verified=1`.
 - [x] 2.5.2 Return 400 with `{ "detail": "Invalid or expired token" }` if not found.

### 2.6 Login endpoint

 - [x] 2.6.1 Define `LoginRequest` schema: `email`, `password`.
 - [x] 2.6.2 POST `/api/auth/login`: fetch user by email, if not found or password mismatch return generic 401 "Invalid credentials". If user exists and unverified, return 403 with `{ "detail": "Email not verified", "resend_available": true }`.
 - [x] 2.6.3 On success: create refresh token row with hash, set cookies:
  - `access_token`: httpOnly, Secure in prod, SameSite=Lax, Path=/, Max-Age=900
  - `refresh_token`: httpOnly, Secure in prod, SameSite=Lax, Path=/api/auth/refresh, Max-Age=604800
 - [x] 2.6.4 Return `UserResponse`.

### 2.7 Refresh endpoint

 - [x] 2.7.1 POST `/api/auth/refresh`: read `refresh_token` cookie, decode, find row by hash, check not revoked and not expired.
 - [x] 2.7.2 If revoked: revoke all refresh tokens for user, return 401 forcing re-login.
 - [x] 2.7.3 On valid: mark old token revoked with `replaced_by_token_hash`, create new refresh token, set new cookies, return new access token.

### 2.8 Password reset

 - [x] 2.8.1 POST `/api/auth/forgot-password`: accept `ForgotPasswordRequest` with `email`. Always return 200 `{ "message": "If the email exists..." }`. Only generate token row if user exists.
 - [x] 2.8.2 POST `/api/auth/reset-password`: accept `ResetPasswordRequest` with `token` and `new_password` (min 10). Validate token, update password hash, revoke all refresh tokens, return 200.

### 2.9 OAuth — GitHub

 - [x] 2.9.1 Add `/api/auth/github/login` redirect endpoint building GitHub OAuth URL with `client_id`, `redirect_uri`, `state` (random CSRF state stored in short-lived cookie `oauth_state`).
 - [x] 2.9.2 Add `/api/auth/github/callback`: validate state, exchange code for token via `httpx`, fetch user info (`/user`) and emails (`/user/emails`), upsert user by `oauth_provider=github, oauth_id`, set cookies, redirect to `/`.

### 2.10 OAuth — Google

 - [x] 2.10.1 Add `/api/auth/google/login` redirect endpoint using Google OAuth 2.0 authorization URL with PKCE/state.
 - [x] 2.10.2 Add `/api/auth/google/callback`: exchange code, fetch userinfo, upsert by `oauth_provider=google, oauth_id`, link by email if existing email user exists, set cookies, redirect to `/`.

### 2.11 Logout endpoint

 - [x] 2.11.1 POST `/api/auth/logout`: read refresh token cookie, revoke matching row, clear `access_token` and `refresh_token` cookies, return 200.

### 2.12 Current user dependency

 - [x] 2.12.1 Create `backend/app/api/deps.py` with `get_current_user(request: Request, db: AsyncSession) -> User`.
 - [x] 2.12.2 Read `access_token` cookie, decode, load user from DB, raise 401 if missing/invalid.
 - [x] 2.12.3 Export `CurrentUser = Annotated[User, Depends(get_current_user)]`.

### 2.13 Current user endpoints

 - [x] 2.13.1 `GET /api/users/me`: return `UserResponse` for authenticated user (email, career_context, oauth_provider).
 - [x] 2.13.2 `PATCH /api/users/me`: accept `UserUpdateRequest` (`career_context` optional), update user, return updated response.
 - [x] 2.13.3 `POST /api/users/me/change-password`: accept `current_password`, `new_password`; verify current, update hash, revoke all refresh tokens, return 200.
 - [x] 2.13.4 `DELETE /api/users/me`: delete user and all associated data, clear cookies.

---

## 3. Security Middleware (Backend)

### 3.1 CSRF protection

 - [x] 3.1.1 Create `backend/app/middleware/csrf.py` implementing double-submit cookie.
 - [x] 3.1.2 On every request, ensure cookie `csrf_token` exists (create if missing). Set response header `X-CSRF-Token` to the cookie value on GET/HEAD/OPTIONS.
 - [x] 3.1.3 On POST/PUT/PATCH/DELETE, require header `X-CSRF-Token` equal to `csrf_token` cookie value. Exempt `/api/auth/*` OAuth callbacks and `/api/health`.
 - [x] 3.1.4 Register middleware in `backend/app/main.py`.

### 3.2 Rate limiting

 - [x] 3.2.1 Configure `slowapi` limiter backed by Redis in `backend/app/main.py`.
 - [x] 3.2.2 Apply limits:
  - `/api/auth/*`: 20/minute
  - `/api/research`: 10/minute
  - `/api/tailor`: 6/minute
  - `/api/compile`: 30/minute
  - default: 100/minute
 - [x] 3.2.3 Return 429 with `Retry-After` header.

### 3.3 CORS

 - [x] 3.3.1 Configure CORSMiddleware with `allow_origins=[settings.FRONTEND_ORIGIN]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.

### 3.4 Payload limits

 - [x] 3.4.1 Add request size limit middleware: 1MB for upload endpoints, 10MB default.
 - [x] 3.4.2 Return 413 for oversized `.tex` uploads.

### 3.5 AES-GCM encryption

 - [x] 3.5.1 Create `backend/app/utils/crypto.py` with `encrypt(plaintext: str) -> str` and `decrypt(ciphertext: str) -> str` using AES-GCM with key derived from `SECRET_KEY`.
 - [x] 3.5.2 Output format: `base64(nonce + tag + ciphertext)`.

---

## 4. Document Parsing Pipeline (Backend)

### 4.1 Tree-sitter integration

 - [x] 4.1.1 Install `tree-sitter` and `tree-sitter-latex` via Poetry.
 - [x] 4.1.2 Create `backend/app/services/latex/parser.py` with class `LatexParser`.
 - [x] 4.1.3 On init, load `tree_sitter_latex` grammar and create `Parser`.
 - [x] 4.1.4 Add `parse(source: bytes) -> SyntaxNode` returning tree-sitter root node.

### 4.2 Syntactic token tree model

 - [x] 4.2.1 Create `backend/app/services/latex/token_tree.py` with Pydantic models:
  - `TexNode` base with `id`, `type`, `start_byte`, `end_byte`, `children: list[TexNode]`
  - Subtypes: `CommandNode`, `EnvironmentNode`, `GroupNode`, `TextNode`, `MathNode`, `VerbatimNode`, `CommentNode`
 - [x] 4.2.2 Add `CommandNode` fields: `name`, `args: list[GroupNode]`.
 - [x] 4.2.3 Add `EnvironmentNode` fields: `env_name`, `begin_range`, `end_range`.
 - [x] 4.2.4 Add `TextNode` fields: `content`.

### 4.3 Token tree builder

 - [x] 4.3.1 Implement `build_token_tree(root: SyntaxNode, source: bytes) -> TexNode` recursively walking tree-sitter nodes.
 - [x] 4.3.2 Map tree-sitter node types to custom types. Unknown node types become generic `TextNode` or `CommandNode` based on presence of `\`.
 - [x] 4.3.3 Preserve whitespace and comments as first-class nodes so round-trip is byte-identical.

### 4.4 Token tree serializer

 - [x] 4.4.1 Implement `serialize_token_tree(node: TexNode, source: bytes) -> bytes`.
 - [x] 4.4.2 For nodes with source ranges, emit original bytes. For generated nodes, emit reconstructed syntax using vocabulary map.
 - [x] 4.4.3 Add pytest asserting byte identity for a corpus of sample `.tex` files.

### 4.5 Document model

 - [x] 4.5.1 Create `backend/app/services/latex/document_model.py` with Pydantic models:
  - `DocNode` base with `id`, `type`, `children: list[DocNode]`, `metadata: dict`
  - `SectionNode`, `EntryNode`, `BulletNode`, `TextNode`, `OpaqueNode`
 - [x] 4.5.2 `SectionNode` has `label: str` and `tex_source: str | None` (raw .tex source for that section, used by per-section toggle).
 - [x] 4.5.3 `EntryNode` has `title: str`, `organization: str | None`, `dates: str | None`.
 - [x] 4.5.4 `BulletNode` has `text: str` and `spans: list[SpanAnnotation]`.
 - [x] 4.5.5 `TextNode` has `text: str` and `spans: list[SpanAnnotation]` with `start`, `end`, `formats: list[Literal["bold","italic","underline","code"]]`.

### 4.6 Model extractor

 - [x] 4.6.1 Implement `DocumentModelExtractor` in `backend/app/services/latex/extractor.py`.
 - [x] 4.6.2 Map known commands: `\section`, `\subsection` → `SectionNode`; `\begin{itemize}` / `\begin{enumerate}` → bullet list container; `\item` → `BulletNode`; `\cventry`, `\entry` → `EntryNode` with heuristic fields (title, dates, organization).
 - [x] 4.6.3 Treat unknown commands and environments as `OpaqueNode` with `editable: false`.
 - [x] 4.6.4 Extract text formatting spans from `\textbf`, `\textit`, `\underline`, `\texttt`.
 - [x] 4.6.5 Generate stable IDs deterministically from node position and type using prefix `sec-`, `ent-`, `bul-`, `txt-`, `opa-` + sequential number.
 - [x] 4.6.6 For each `SectionNode`, record the corresponding token tree source range and store `tex_source` for that section by serializing the token subtree.

### 4.7 Vocabulary map

 - [x] 4.7.1 Create `VocabularyMap` Pydantic model storing mappings:
  - `section_command: str` (e.g. `\cvsection`)
  - `subsection_command: str`
  - `entry_command: str | None`
  - `bullet_env: str` (`itemize` or `enumerate`)
  - `item_command: str` (`\item`)
  - `bold_command: str` (`\textbf`)
  - `italic_command: str` (`\textit`)
 - [x] 4.7.2 Build vocabulary map during extraction by recording the first command encountered for each semantic type.
 - [x] 4.7.3 Store vocabulary map JSON on `MasterResume` and on each `SessionDocument`.

### 4.8 .docx import

 - [x] 4.8.1 Create `backend/app/services/import/docx_importer.py`.
 - [x] 4.8.2 Use `python-docx` to read paragraphs and runs.
 - [x] 4.8.3 Map styles: `Heading 1`/`Title` → `SectionNode`; bullet paragraphs → `BulletNode` under implicit section; normal paragraphs → `TextNode`.
 - [x] 4.8.4 Map run formatting: `bold`, `italic`, `underline` → span annotations.
 - [x] 4.8.5 Generate generic `.tex` serializer output for imported documents.

### 4.9 .txt import

 - [x] 4.9.1 Create `backend/app/services/import/txt_importer.py`.
 - [x] 4.9.2 Parse line by line: ALL CAPS lines (regex `^[A-Z][A-Z\s]{2,}$`) → `SectionNode`; lines starting with `•`, `-`, `*` → `BulletNode`; blank lines split paragraphs; other lines → `TextNode`.
 - [x] 4.9.3 Join consecutive non-section lines into a single `TextNode`.

### 4.10 Page count enforcement

 - [x] 4.10.1 Estimate page count from normalized `.tex` source using heuristic: count `\item`, `\section`, and paragraphs; reject if > 5 pages.
 - [x] 4.10.2 Alternatively, compile and count pages once during upload; fallback to heuristic if compilation unavailable.
 - [x] 4.10.3 Return 400 with `{ "detail": "Document exceeds 5-page limit" }`.

---

## 5. Document Editing Engine (Backend)

### 5.1 Patch schema

 - [x] 5.1.1 Create `backend/app/services/editing/patch.py` with Pydantic models:
  - `OperationBase`: `op: str`, `reasoning: str`
  - `ModifyOp`: `op="modify"`, `target: str`, `text: str | None`, `spans: list[SpanAnnotation] | None`
  - `InsertOp`: `op="insert"`, `parent: str`, `after: str | None`, `element: DocNode`
  - `DeleteOp`: `op="delete"`, `target: str`
  - `MoveOp`: `op="move"`, `target: str`, `parent: str`, `after: str | None`
  - `AskOp`: `op="ask"`, `question: str`, `context: str | None`
  - `Patch`: `operations: list[Operation]`

### 5.2 Patch validator

 - [x] 5.2.1 Implement `PatchValidator.validate(document: DocNode, patch: Patch, vocab: VocabularyMap) -> ValidationResult`.
 - [x] 5.2.2 Rules:
  - All `target`, `parent`, `after` IDs must exist.
  - `parent` and `after` must accept children (sections, entries, bullet lists).
  - `move` must not create cycles (DFS from target).
  - `delete` must not remove required metadata nodes (contact section or last section).
  - `modify`/`insert` text length must be ≤ 2000 chars per node.
  - `insert.element.type` must be one of supported semantic types.
 - [x] 5.2.3 Return list of errors with `operation_index` and `message`.

### 5.3 Patch applier

 - [x] 5.3.1 Implement `PatchApplier.apply(document: DocNode, patch: Patch) -> DocNode` in `backend/app/services/editing/applier.py`.
 - [x] 5.3.2 Deep-copy document before mutation.
 - [x] 5.3.3 For `modify`: update target node's `text` and `spans`.
 - [x] 5.3.4 For `insert`: create new node with stable ID, append to parent children after `after` sibling or at end.
 - [x] 5.3.5 For `delete`: remove target from parent's children.
 - [x] 5.3.6 For `move`: detach target and re-attach under new parent.
 - [x] 5.3.7 For `ask`: halt applier, return partial result with `ask_question`; do not mutate document.

### 5.4 Version chain

 - [x] 5.4.1 On accepted patch, create new `SessionDocument` with `parent_doc_id` = previous doc ID, `version` = previous version + 1.
 - [x] 5.4.2 Serialize new document model to `.tex` using vocabulary map and store both in row.
 - [x] 5.4.3 Store `Patch` row with `source_doc_id`, `target_doc_id`, `operations_json`, `raw_llm_response`, `user_message`, `applied=true`.

### 5.5 Diff engine

 - [x] 5.5.1 Implement `DiffEngine.compute_diff(old: DocNode, new: DocNode) -> DiffChangeSet` in `backend/app/services/editing/diff.py`.
 - [x] 5.5.2 Compare nodes by ID. Categories: `added`, `removed`, `modified`, `moved`.
 - [x] 5.5.3 For `modified`, include `old_text`, `new_text`, `old_spans`, `new_spans`.
 - [x] 5.5.4 For `moved`, include `old_parent_id`, `new_parent_id`, `old_index`, `new_index`.

### 5.6 Master push-back

 - [x] 5.6.1 Implement `apply_to_master(master_doc: DocNode, operation: Operation, vocab: VocabularyMap) -> DocNode`.
 - [x] 5.6.2 Match operation by semantic intent: for `modify`, find master node with same content fingerprint if ID differs; for `insert`, insert at analogous location.
 - [x] 5.6.3 Update `MasterResume.tex_source` and `document_model_json` after push-back.
 - [x] 5.6.4 Create `Patch` row tied to master resume for audit.

---

## 6. LLM Integration (Backend)

### 6.1 Provider CRUD

 - [x] 6.1.1 Create `backend/app/api/providers.py` router `/api/providers`.
 - [x] 6.1.2 Schemas:
  - `ProviderCreate`: `name`, `provider_type` (`openai`, `anthropic`, `ollama`, `custom`), `api_key` (optional), `base_url` (optional), `model`, `temperature`, `top_p`, `max_tokens`, `is_default`
  - `ProviderResponse`: same but with `api_key_last_four` instead of `api_key`
 - [x] 6.1.3 Endpoints: `GET /api/providers`, `POST /api/providers`, `GET /api/providers/{id}`, `PUT /api/providers/{id}`, `DELETE /api/providers/{id}`, `POST /api/providers/{id}/test`.
 - [x] 6.1.4 Encrypt `api_key` with AES-GCM before DB storage.
 - [x] 6.1.5 If `is_default=true`, unset default on all other providers for the user.

### 6.2 Provider adapters

 - [x] 6.2.1 Create `backend/app/services/llm/adapters/base.py` with abstract class `LLMAdapter` and method `async def chat(messages, stream=False, **kwargs) -> AsyncIterator[LLMChunk] | LLMResponse`.
 - [x] 6.2.2 Implement `OpenAIAdapter` in `backend/app/services/llm/adapters/openai.py` using `httpx.AsyncClient` hitting `https://api.openai.com/v1/chat/completions`.
 - [x] 6.2.3 Implement `AnthropicAdapter` in `backend/app/services/llm/adapters/anthropic.py` hitting `https://api.anthropic.com/v1/messages`.
 - [x] 6.2.4 Implement `OllamaAdapter` in `backend/app/services/llm/adapters/ollama.py` hitting `{base_url}/api/chat`.
 - [x] 6.2.5 Implement `CustomAdapter` reusing OpenAI-compatible request shape with configurable `base_url`.
 - [x] 6.2.6 Each adapter maps `temperature`, `max_tokens`, `top_p` to provider-specific fields.

### 6.3 Provider factory

 - [x] 6.3.1 Create `backend/app/services/llm/factory.py` with `get_adapter(provider: LLMProvider) -> LLMAdapter`.
 - [x] 6.3.2 Decrypt API key at request time; never log it.

### 6.4 Prompt assembler

 - [x] 6.4.1 Create `backend/app/services/llm/prompts.py`.
 - [x] 6.4.2 System prompt template must include:
  - Document model as JSON
  - JD text
  - User notes
  - Career context
  - Research summary
  - Tailoring mode instructions
  - Output format instruction: return only JSON patch array
 - [x] 6.4.3 Mode instructions:
  - Polish: "Make micro-edits only. Do not reorder sections."
  - Refine: "You may reorder sections and use `ask` if information is missing."
  - Rewrite: "Restructure aggressively while preserving facts."
 - [x] 6.4.4 Add function `build_tailor_prompt(session, document, research_summary) -> list[dict]`.

### 6.5 Response parser

 - [x] 6.5.1 Create `backend/app/services/llm/parser.py` with `extract_patch(text: str) -> Patch`.
 - [x] 6.5.2 Strip markdown fences, parse JSON, validate against `Patch` schema.
 - [x] 6.5.3 On parse failure, return `PatchError` so endpoint can send retry prompt.

### 6.6 SSE streaming endpoint

 - [x] 6.6.1 Create `backend/app/api/tailor.py` router `/api/sessions/{session_id}/chat`.
 - [x] 6.6.2 POST accepts `ChatMessageRequest` with `content: str` and `role="user"`.
 - [x] 6.6.3 Response is `StreamingResponse` with `media_type="text/event-stream"`.
 - [x] 6.6.4 Phases:
  1. `researching` event with company name if research missing.
  2. `research_progress` per source.
  3. `research_done` with summary.
  4. `thinking` event.
  5. Stream LLM response; emit `writing` events with partial JSON patch chunks.
  6. Validate patch; emit `done` with full patch, diff summary, new `document_id`.
 - [x] 6.6.5 On error, emit `error` event with `message` and close stream gracefully.
 - [x] 6.6.6 Save user `ChatMessage` at start; save assistant `ChatMessage` with metadata at end.

### 6.7 Retry on invalid patch

 - [x] 6.7.1 If patch validation fails, send a second LLM request with validation errors included.
 - [x] 6.7.2 Limit to one retry; if still invalid, emit `error` event and surface raw response for manual inspection.

---

## 7. Company Research Pipeline (Backend)

### 7.1 Company extraction

 - [x] 7.1.1 Create `backend/app/services/research/extractor.py` with `extract_company_name(jd_text: str) -> str | None`.
 - [x] 7.1.2 Use regex heuristics: "at Company Name", "Company Name is hiring", capitalize named entities; fallback to first capitalized word after "Join".

### 7.2 Web scraper utility

 - [x] 7.2.1 Create `backend/app/services/research/scraper.py` with `async def fetch_text(url: str, timeout: float) -> str`.
 - [x] 7.2.2 Use `httpx.AsyncClient` with `follow_redirects=True`.
 - [x] 7.2.3 Parse HTML with BeautifulSoup, extract visible text from `<p>`, `<li>`, `<h1-h6>`, join with newlines, truncate to 8000 chars.

### 7.3 Careers page scraper

 - [x] 7.3.1 Implement `scrape_careers(company: str)` trying URLs in order:
  - `https://careers.{company}.com`
  - `https://www.{company}.com/careers`
  - `https://www.{company}.com/jobs`
 - [x] 7.3.2 Replace spaces in company with empty string and lowercase for domain.

### 7.4 Engineering blog search

 - [x] 7.4.1 Use `duckduckgo-search` with query `"{company} engineering blog"`.
 - [x] 7.4.2 Fetch top 3 result URLs via scraper, concatenate text.

### 7.5 Subreddit search

 - [x] 7.5.1 Search DuckDuckGo: `site:reddit.com/r/ExperiencedDevs {company} hiring` and `site:reddit.com/r/cscareerquestions {company}`.
 - [x] 7.5.2 Fetch top 5 thread URLs, extract title + top comments.

### 7.6 Timeboxing

 - [x] 7.6.1 Use `asyncio.wait_for` or `anyio` with 5s per source, 15s total.
 - [x] 7.6.2 Return partial corpus if sources time out; never crash.

### 7.7 Research summarizer

 - [x] 7.7.1 Implement `summarize_research(corpus: str, provider: LLMProvider) -> ResearchSummary`.
 - [x] 7.7.2 Prompt returns JSON with keys: `values`, `hiring_signals`, `tone_guidance`.
 - [x] 7.7.3 Fallback to empty summary if LLM unavailable.

### 7.8 Storage

 - [x] 7.8.1 Store `research_summary_json` on `Session` row after first gather.
 - [x] 7.8.2 Reuse stored summary on subsequent messages in same session.

---

## 8. LaTeX Compilation & Export (Backend)

### 8.1 LaTeX container manager

 - [x] 8.1.1 Create `backend/app/services/latex/compiler.py` with class `LatexCompiler`.
 - [x] 8.1.2 Check container running via `docker ps`; if not, raise 503.
 - [x] 8.1.3 Write `.tex` to `{LATEX_WORK_DIR}/{document_id}/resume.tex`.

### 8.2 latexmk execution

 - [x] 8.2.1 Run `docker exec {container_id} latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=/work/{document_id} /work/{document_id}/resume.tex`.
 - [x] 8.2.2 Timeout 30 seconds; on timeout, kill process and raise 504.
 - [x] 8.2.3 Capture stdout/stderr.

### 8.3 Error parser

 - [x] 8.3.1 Implement regex to extract `! ...` error lines and line numbers (`l.42`).
 - [x] 8.3.2 Return structured error: `{ message, line, context }`.

### 8.4 Cheap LLM error suggestor

 - [x] 8.4.1 If a provider with tag `cheap` or `ollama` exists, send error + 5 surrounding lines to it.
 - [x] 8.4.2 Return `suggestion` string alongside raw error.

### 8.5 PDF caching

 - [x] 8.5.1 Compute cache key `sha256(tex_source)`.
 - [x] 8.5.2 Store PDF at `{LATEX_WORK_DIR}/cache/{key}.pdf`.
 - [x] 8.5.3 Before compile, return cached PDF if key exists.

### 8.6 Export endpoints

 - [x] 8.6.1 Create `backend/app/api/export.py` router `/api/sessions/{session_id}/export`.
 - [x] 8.6.2 Query param `format` ∈ `{tex, pdf, docx, txt}`.
 - [x] 8.6.3 For `.tex`: return `text/plain` with serialized source.
 - [x] 8.6.4 For `.pdf`: compile or use cache, return `application/pdf` with `Content-Disposition: attachment`.
 - [x] 8.6.5 For `.docx`: generate with `python-docx`, return `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
 - [x] 8.6.6 For `.txt`: render document model to plain text, return `text/plain`.

### 8.7 Generic .tex serializer

 - [x] 8.7.1 Implement `serialize_to_tex(document: DocNode, vocab: VocabularyMap | None) -> str`.
 - [x] 8.7.2 Use vocabulary map commands when available; fallback to `\section`, `\begin{itemize}`, `\item`, `\textbf`, `\textit`.

### 8.8 .docx serializer

 - [x] 8.8.1 Map `SectionNode` → heading paragraph; `BulletNode` → bullet paragraph; `TextNode` → normal paragraph with runs.
 - [x] 8.8.2 Apply bold/italic spans to runs.

### 8.9 .txt serializer

 - [x] 8.9.1 Sections as `SECTION NAME` uppercase line.
 - [x] 8.9.2 Bullets as `• {text}`.
 - [x] 8.9.3 Entries as `{title} — {dates}` line.

---

## 9. Tailoring Session Management (Backend)

### 9.1 Session CRUD endpoints

 - [x] 9.1.1 Create `backend/app/api/sessions.py` router `/api/sessions`.
 - [x] 9.1.2 `POST /api/sessions`: schema `SessionCreate` (`company_name`, `role_title`, `job_description` or `job_description_url`, `tailoring_mode`, `llm_provider_id`, `notes`). Fetch URL if provided. Copy master resume to `SessionDocument` version 0.
 - [x] 9.1.3 `GET /api/sessions`: return list with grouping fields.
 - [x] 9.1.4 `GET /api/sessions/{id}`: return session + latest document + research summary.
 - [x] 9.1.5 `PATCH /api/sessions/{id}`: update `company_name`, `role_title`, `notes`, `tags`, `llm_provider_id`, `is_archived`.
 - [x] 9.1.6 `DELETE /api/sessions/{id}`: cascade delete documents, patches, chat messages.

### 9.2 JD fetching

 - [x] 9.2.1 Implement `fetch_jd_text(url: str) -> str` in `backend/app/services/jd.py`.
 - [x] 9.2.2 Use `httpx` + BeautifulSoup; extract article/main body text; truncate to 20000 chars.

### 9.3 Session document initialization

 - [x] 9.3.1 On session create, insert `SessionDocument` row with `doc_type="resume"`, `version=0`, `document_model_json` copied from master, `tex_source` from master, `parent_doc_id=null`.

### 9.4 Chat message storage

 - [x] 9.4.1 `POST /api/sessions/{id}/chat` persists user message.
 - [x] 9.4.2 SSE handler appends system/assistant messages with `metadata_json` storing progress events and `patch_id`.
 - [x] 9.4.3 `GET /api/sessions/{id}/messages` returns messages ordered by `created_at` ASC.

### 9.5 Grouped session list

 - [x] 9.5.1 Implement `get_sessions_grouped(user_id)` returning `{ today: [...], yesterday: [...], previous_7_days: [...], older: [...] }`.
 - [x] 9.5.2 Use `date-fns` equivalent in Python (`datetime`, `timedelta`).

### 9.6 Company view

 - [x] 9.6.1 `GET /api/companies` returns distinct companies for the user with session counts: `[{ company_name, session_count, last_active_at }]`. Used by sidebar Projects section.
 - [x] 9.6.2 `GET /api/companies/{company_name}/sessions` returns sessions for that company grouped by `role_title`.
 - [x] 9.6.3 Return latest document version per session.

### 9.7 Tags

 - [x] 9.7.1 `GET /api/tags` returns distinct tags with counts across user's sessions.
 - [x] 9.7.2 `POST /api/sessions/{id}/tags` adds tags; `DELETE` removes.

### 9.8 Cover letter generation

 - [x] 9.8.1 `POST /api/sessions/{id}/cover-letter` creates cover letter prompt using tailored resume + research + JD.
 - [x] 9.8.2 Stores result as `SessionDocument` with `doc_type="cover_letter"`, `version=0`.
 - [x] 9.8.3 Allows chat-driven patches against cover letter by passing `doc_type` in chat metadata.

### 9.9 Master resume endpoints

 - [x] 9.9.1 `POST /api/master-resume`: upload endpoint accepting `.tex`, `.docx`, `.txt`; parse; store; return `MasterResumeResponse`.
 - [x] 9.9.2 `GET /api/master-resume`: return current master for user or 404.
 - [x] 9.9.3 `PUT /api/master-resume`: replace current master.

---

## 10. Frontend — Core Layout & Shell

### 10.1 Theme provider

 - [x] 10.1.1 Create `frontend/app/components/theme/ThemeProvider.tsx`.
 - [x] 10.1.2 Read initial theme from `localStorage` key `rt-theme` (`light` | `dark`); default to `light`.
 - [x] 10.1.3 Apply `.light` or `.dark` class on `<html>`.
 - [x] 10.1.4 Expose `useTheme()` hook returning `{ theme, setTheme, toggle }`.

### 10.2 Query client provider

 - [x] 10.2.1 Create `frontend/app/providers/QueryClientProvider.tsx` wrapping children in `QueryClientProvider` with `defaultOptions: { queries: { staleTime: 30000, retry: 1 } }`.

### 10.3 API client

 - [x] 10.3.1 Create `frontend/app/lib/api.ts` exporting:
  - `apiRequest<T>(method, path, body?, opts?): Promise<T>`
  - `getCsrfToken(): Promise<string>`
  - `refreshAccessToken(): Promise<void>`
 - [x] 10.3.2 On 401, call `refreshAccessToken()` once and retry original request; on failure redirect to `/login`.
 - [x] 10.3.3 Read `X-CSRF-Token` response header on GET and store in memory; send as `X-CSRF-Token` header on mutating methods.

### 10.4 Toaster

 - [x] 10.4.1 Create `frontend/app/components/ui/Toaster.tsx` using `react-hot-toast` with `toast.success`, `toast.error`, `toast.loading` wrappers styled with design tokens.

### 10.5 App shell

 - [x] 10.5.1 Create `frontend/app/components/layout/AppShell.tsx`.
 - [x] 10.5.2 State: `sidebarCollapsed` persisted to `localStorage`.
 - [x] 10.5.3 Render `<Sidebar />`, `<main className="flex-1 min-w-0 overflow-hidden">`, `<ChatRail />`.
 - [x] 10.5.4 Use Zustand store `useLayoutStore` (defined in `frontend/app/stores/layout.ts`) to share sidebar state globally.
 - [x] 10.5.5 AppShell is used ONLY inside the `(app)` route group; auth pages must not be wrapped by AppShell.

### 10.6 Root layout

 - [x] 10.6.1 Update `frontend/app/layout.tsx` to load fonts and render global providers only: `<ThemeProvider>`, `<QueryClientProvider>`, `<Toaster>`. Do NOT render `<AppShell>` here.
 - [x] 10.6.2 Metadata: title "Resume Tailor".

### 10.7 Authenticated app layout

 - [x] 10.7.1 Create `frontend/app/(app)/layout.tsx`.
 - [x] 10.7.2 Render `<ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>`.
 - [x] 10.7.3 All authenticated pages live under `(app)/`: `/`, `/session/[id]`, `/company/[name]`, `/tag/[tag]`, `/settings/*`.

### 10.8 Protected route wrapper

 - [x] 10.8.1 Create `frontend/app/components/auth/ProtectedRoute.tsx`.
 - [x] 10.8.2 Use `useCurrentUser()` query; show loading spinner; redirect to `/login` if 401.

### 10.9 Auth layout

 - [x] 10.9.1 Create `frontend/app/(auth)/layout.tsx`.
 - [x] 10.9.2 Render a centered card layout for login/register/verify/forgot/reset pages. No AppShell, no sidebar, no chat rail.

### 10.10 Loading states

 - [x] 10.10.1 Create `frontend/app/components/ui/Spinner.tsx` with `size: "sm" | "md" | "lg"` and color variants.
 - [x] 10.10.2 Create `frontend/app/components/ui/Skeleton.tsx` with pulse animation.

---

## 11. Frontend — Sidebar & Navigation (A-Z)

### 11.1 Sidebar container

 - [x] 11.1.1 Create `frontend/app/components/sidebar/Sidebar.tsx`.
 - [x] 11.1.2 Props: `collapsed: boolean`, `onToggle: () => void`.
 - [x] 11.1.3 Render outer container:
  - Expanded: `<aside className="flex flex-col h-screen w-[260px] border-r border-slate/20 bg-paper transition-[width] duration-200">`
  - Collapsed: `w-[50px]`
 - [x] 11.1.4 Children components (in order): `<SidebarHeader />`, `<SidebarNewChat />`, `<SidebarProjects />`, `<SidebarHistory />`, `<SidebarProfile />`.
 - [x] 11.1.5 Use `flex-1 overflow-hidden` on history/projects area and `flex-shrink-0` on header/new-chat/profile.

### 11.2 Sidebar header

 - [x] 11.2.1 Create `frontend/app/components/sidebar/SidebarHeader.tsx`.
 - [x] 11.2.2 Expanded state render:
  - Left: app logo mark (SVG, 24x24) + text "Resume Tailor" in `font-sans text-lg font-semibold text-ink`
  - Right: icon-only buttons `Search` (opens search modal), `PanelLeftClose` (collapse)
 - [x] 11.2.3 Collapsed state render: vertical stack of `Search` and `PanelRightOpen` icons only, centered.
 - [x] 11.2.4 Button class: `p-2 rounded-md hover:bg-slate/10 text-slate hover:text-ink transition-colors`.
 - [x] 11.2.5 Add `aria-label` to all icon buttons.

### 11.3 New Chat button

 - [x] 11.3.1 Create `frontend/app/components/sidebar/SidebarNewChat.tsx`.
 - [x] 11.3.2 Expanded: `<button className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-paper hover:bg-ink/90 transition-colors">` with `Pencil` icon + "New Chat".
 - [x] 11.3.3 Collapsed: icon-only `Plus` button centered, tooltip on hover.
 - [x] 11.3.4 On click: if user has no master resume, show toast "Upload a master resume first" and navigate to `/settings/master-resume`; else open session setup form in chat rail via `useSessionStore.setSetupOpen(true)`.

### 11.4 Sidebar projects (company grouping)

 - [x] 11.4.1 Create `frontend/app/components/sidebar/SidebarProjects.tsx`.
 - [x] 11.4.2 Fetch companies via `useCompanies()` query (endpoint `GET /api/companies` listing companies with counts; implement if missing).
 - [x] 11.4.3 Expanded: render section label "Projects" in `text-xs font-semibold uppercase tracking-wider text-slate px-4 py-2`; render collapsible list of companies.
 - [x] 11.4.4 Each company row: `Folder` icon + company name + session count badge (rounded pill, bg-slate/10 text-slate text-xs px-1.5 py-0.5).
 - [x] 11.4.5 Click navigates to `/company/{slug}`.
 - [x] 11.4.6 Collapsed: hide this section entirely.

### 11.5 Sidebar history

 - [x] 11.5.1 Create `frontend/app/components/sidebar/SidebarHistory.tsx`.
 - [x] 11.5.2 Fetch grouped sessions via `useGroupedSessions()` query (`GET /api/sessions/grouped`).
 - [x] 11.5.3 Render groups in order: Today, Yesterday, Previous 7 Days, Older. Each group is collapsible.
 - [x] 11.5.4 Group header: `text-xs font-semibold uppercase tracking-wider text-slate px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-slate/5`.
 - [x] 11.5.5 Session entry component: `SidebarHistoryItem`.

### 11.6 Sidebar history item

 - [x] 11.6.1 Create `frontend/app/components/sidebar/SidebarHistoryItem.tsx`.
 - [x] 11.6.2 Props: `session: Session`.
 - [x] 11.6.3 Layout: `px-3 py-2 mx-2 rounded-md hover:bg-slate/10 group cursor-pointer`.
 - [x] 11.6.4 Text lines:
  - Title: `font-sans text-sm font-medium text-ink truncate`
  - Subtitle: `text-xs text-slate truncate` showing `{company_name} · {role_title}`
 - [x] 11.6.5 Hover actions (only expanded): archive icon and delete icon appear on right; click stops propagation.
 - [x] 11.6.6 Archive click: PATCH `/api/sessions/{id}` with `{ is_archived: true }`, invalidate queries.
 - [x] 11.6.7 Delete click: confirm dialog, then DELETE, invalidate queries.
 - [x] 11.6.8 Active session highlight: if `session.id === activeSessionId`, add `bg-slate/10 border-l-2 border-brass`.

### 11.7 Sidebar profile

 - [x] 11.7.1 Create `frontend/app/components/sidebar/SidebarProfile.tsx`.
 - [x] 11.7.2 Fetch current user via `useCurrentUser()`.
 - [x] 11.7.3 Expanded render:
  - Avatar circle: `w-8 h-8 rounded-full bg-brass text-paper flex items-center justify-center font-sans text-sm font-medium` with first letter of email.
  - Email: `text-sm text-ink truncate max-w-[140px]`
  - Settings icon button (`User`) and logout icon button (`LogOut`)
 - [x] 11.7.4 Collapsed render: only avatar button; click opens a small popover menu with settings/logout.
 - [x] 11.7.5 Logout: call `POST /api/auth/logout`, clear query cache, redirect `/login`.

### 11.8 Collapsed tooltips

 - [x] 11.8.1 Create `frontend/app/components/ui/Tooltip.tsx` using Radix UI Tooltip or a custom CSS tooltip.
 - [x] 11.8.2 Wrap all collapsed-only icon buttons in tooltip showing label.

---

## 12. Frontend — Search Modal (A-Z)

### 12.1 Search modal container

 - [x] 12.1.1 Create `frontend/app/components/search/SearchModal.tsx`.
 - [x] 12.1.2 Controlled by Zustand store `useSearchStore` (`isOpen`, `open()`, `close()`).
 - [x] 12.1.3 Render with `createPortal` into `document.body`.
 - [x] 12.1.4 Backdrop: `fixed inset-0 bg-ink/40 backdrop-blur-sm z-50`.
 - [x] 12.1.5 Modal panel: `fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-2xl rounded-xl bg-paper shadow-2xl border border-slate/20 overflow-hidden z-50`.

### 12.2 Keyboard shortcut

 - [x] 12.2.1 Create `frontend/app/hooks/useKeyboardShortcut.ts`.
 - [x] 12.2.2 Register `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) on `window` to call `open()`.
 - [x] 12.2.3 Register `Escape` to call `close()` when modal is open.

### 12.3 Search input

 - [x] 12.3.1 Inside modal, render `<SearchModalInput />`.
 - [x] 12.3.2 Input: `<input autoFocus placeholder="Search chats, companies, tags..." className="w-full bg-transparent px-4 py-4 font-sans text-lg text-ink placeholder:text-slate/60 outline-none border-b border-slate/20" />`.
 - [x] 12.3.3 Use `useState` for query string; debounce 150ms before filtering.

### 12.4 Search indexing

 - [x] 12.4.1 Create `frontend/app/hooks/useSearchIndex.ts`.
 - [x] 12.4.2 Fetch all user sessions via `useSessions()` query; build client-side index in a `useMemo`.
 - [x] 12.4.3 Index entries:
  - Chats: `title`, `company_name`, `role_title`
  - Companies: distinct `company_name`
  - Tags: distinct tags from all sessions
 - [x] 12.4.4 Filter case-insensitively using `includes`.

### 12.5 Search results list

 - [x] 12.5.1 Create `frontend/app/components/search/SearchResults.tsx`.
 - [x] 12.5.2 Group results by category with headers: "Chats", "Companies", "Tags".
 - [x] 12.5.3 Chat result row: `MessageSquare` icon + session title + subtitle.
 - [x] 12.5.4 Company result row: `Building2` icon + company name + session count.
 - [x] 12.5.5 Tag result row: `Hash` icon + tag name + session count.
 - [x] 12.5.6 Highlight matched substring in bold brass color.
 - [x] 12.5.7 Empty state: "No results for '{query}'".

### 12.6 Navigation on select

 - [x] 12.6.1 Clicking a chat result navigates to `/session/{id}` and closes modal.
 - [x] 12.6.2 Clicking a company result navigates to `/company/{slug}` and closes modal.
 - [x] 12.6.3 Clicking a tag result navigates to `/tag/{tag}` and closes modal.
 - [x] 12.6.4 Support arrow keys + Enter to select (optional but recommended).

---

## 13. Frontend — Chat Rail (A-Z)

### 13.1 Chat rail container

 - [x] 13.1.1 Create `frontend/app/components/chat/ChatRail.tsx`.
 - [x] 13.1.2 Render container: `<section className="flex flex-col h-screen w-[320px] border-l border-slate/20 bg-paper">`.
 - [x] 13.1.3 If no active session (`useSessionStore.activeSessionId === null`), render `<ChatRailEmptyState />`.
 - [x] 13.1.4 If active session, render `<ChatRailHeader />`, `<ChatMessageList />`, `<ChatInput />`.

### 13.2 Chat rail empty state

 - [x] 13.2.1 Create `frontend/app/components/chat/ChatRailEmptyState.tsx`.
 - [x] 13.2.2 Render centered content:
  - `FileText` icon, size 48, color slate
  - Text: "No changes yet" (`font-serif text-xl text-ink`)
  - Subtext: "Paste a job description to begin tailoring." (`text-sm text-slate`)
  - Button: "Start a session" (`bg-brass text-paper px-4 py-2 rounded-md hover:bg-brass-hover`) → opens setup form.

### 13.3 Chat rail header

 - [x] 13.3.1 Create `frontend/app/components/chat/ChatRailHeader.tsx`.
 - [x] 13.3.2 Show session title (editable inline on click), company + role subtitle.
 - [x] 13.3.3 Show active provider/model badge.
 - [x] 13.3.4 Right side: menu button (`MoreVertical`) with dropdown: "Settings" (scroll to settings), "Export", "Archive".

### 13.4 Chat message list

 - [x] 13.4.1 Create `frontend/app/components/chat/ChatMessageList.tsx`.
 - [x] 13.4.2 Fetch messages via `useSessionMessages(sessionId)`.
 - [x] 13.4.3 Render `ChatMessage` for each message; auto-scroll to bottom on new messages using `useEffect` + `scrollIntoView`.
 - [x] 13.4.4 Container: `flex-1 overflow-y-auto px-4 py-4 space-y-4`.

### 13.5 Chat message component

 - [x] 13.5.1 Create `frontend/app/components/chat/ChatMessage.tsx`.
 - [x] 13.5.2 Props: `message: ChatMessage`.
 - [x] 13.5.3 User message: align right, bubble `bg-brass text-paper rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%]`.
 - [x] 13.5.4 Assistant/system message: align left, bubble `bg-slate/10 text-ink rounded-2xl rounded-tl-sm px-4 py-2 max-w-[90%]`.
 - [x] 13.5.5 Progress messages: render `<ProgressMessage />`.
 - [x] 13.5.6 Patch summary messages: render clickable summary badge that scrolls document canvas to first diff.

### 13.6 Progress message component

 - [x] 13.6.1 Create `frontend/app/components/chat/ProgressMessage.tsx`.
 - [x] 13.6.2 Map phase to icon + text:
  - `researching`: `Search` icon, text "Researching {company}..."
  - `research_progress`: nested list item under researching
  - `research_done`: `CheckCircle` icon, text "Research done"
  - `thinking`: `Sparkles` icon, text "Thinking..."
  - `writing`: `Pencil` icon, text "Writing changes..."
  - `done`: `Check` icon, text "Done"
 - [x] 13.6.3 Icon color: brass for active phase, slate for completed phases.
 - [x] 13.6.4 Animate active phase icon with subtle pulse.

### 13.7 Chat input

 - [x] 13.7.1 Create `frontend/app/components/chat/ChatInput.tsx`.
 - [x] 13.7.2 State: `text: string`, `rows: number`.
 - [x] 13.7.3 Render textarea:
  - Class: `w-full resize-none rounded-xl border border-slate/20 bg-paper px-4 py-3 pr-12 font-sans text-sm text-ink placeholder:text-slate/60 outline-none focus:border-brass focus:ring-1 focus:ring-brass`
  - Rows: min 1, max 6, auto-resize by measuring scrollHeight.
 - [x] 13.7.4 Send button (`Send` icon) absolutely positioned right side; disabled when text empty.
 - [x] 13.7.5 On Enter (without Shift), submit. On Shift+Enter, insert newline.
 - [x] 13.7.6 On submit: if setup form is open, validate and create session; else call `sendChatMessage(text)` from `useSessionStore`.
 - [x] 13.7.7 Clear input and disable while streaming (`isStreaming` from store).

### 13.8 Session setup form

 - [x] 13.8.1 Create `frontend/app/components/chat/SessionSetupForm.tsx`.
 - [x] 13.8.2 Render inline above chat input when `useSessionStore.setupOpen === true`.
 - [x] 13.8.3 Fields:
  - Company name input (`company_name`)
  - Role title input (`role_title`)
  - JD input: tabs "URL" / "Paste"; URL input or textarea
  - Tailoring mode selector: three buttons "Polish" / "Refine" / "Rewrite"
  - Provider/model selector: dropdown from `useProviders()`
  - Notes textarea
 - [x] 13.8.4 Submit button: "Create Session".
 - [x] 13.8.5 On submit: `POST /api/sessions`; on success set `activeSessionId`, close setup form, then immediately call `sendChatMessage` with a default user message like "Tailor this resume for the job description" to open the SSE stream and start the first tailoring pass.

### 13.9 SSE client hook

 - [x] 13.9.1 Create `frontend/app/hooks/useSessionSSE.ts`.
 - [x] 13.9.2 Use `fetchEventSource` from `@microsoft/fetch-event-source` to `POST /api/sessions/{id}/chat` with JSON body `{ content, role: "user" }` and `Accept: text/event-stream`.
 - [x] 13.9.3 Parse event types: `researching`, `research_progress`, `research_done`, `thinking`, `writing`, `done`, `error`.
 - [x] 13.9.4 Append progress messages to chat store in real time via `useSessionStore` actions.
 - [x] 13.9.5 On `done`: update document canvas via `useSessionStore.setLatestDocument(doc)` and invalidate `useSessionMessages` and `useSessionDocument` queries.
 - [x] 13.9.6 On `error`: show toast with error message and set `isStreaming=false`.
 - [x] 13.9.7 Abort the fetch request on unmount via `AbortController`.

---

## 14. Frontend — Document Canvas (A-Z)

### 14.1 Document canvas container

 - [x] 14.1.1 Create `frontend/app/components/document/DocumentCanvas.tsx`.
 - [x] 14.1.2 Render container: `<div className="flex-1 h-screen overflow-y-auto bg-paper/50">` (slightly different shade from chrome).
 - [x] 14.1.3 Inner wrapper: `<div className="mx-auto max-w-[820px] py-12 px-8 min-h-full">`.
 - [x] 14.1.4 If no active session: render `<DocumentEmptyState />`.
 - [x] 14.1.5 If active session: render `<DocumentToolbar />` + `<DocumentTabs />` + document content.

### 14.2 Document empty state

 - [x] 14.2.1 Create `frontend/app/components/document/DocumentEmptyState.tsx`.
 - [x] 14.2.2 Render centered illustration/text: "Upload your master resume to get started" with button to `/settings/master-resume`.

### 14.3 Document toolbar

 - [x] 14.3.1 Create `frontend/app/components/document/DocumentToolbar.tsx`.
 - [x] 14.3.2 Left: document title + version badge.
 - [x] 14.3.3 Center: diff/final toggle buttons (rendered only when a patch is pending).
 - [x] 14.3.4 Right: export dropdown (`.tex`, `.pdf`, `.docx`, `.txt`) and cover-letter-generation button (if on resume tab and no cover letter exists yet).

### 14.4 Document tabs

 - [x] 14.4.1 Create `frontend/app/components/document/DocumentTabs.tsx`.
 - [x] 14.4.2 Tabs: "Resume", "Cover Letter" (if exists).
 - [x] 14.4.3 Active tab underline in brass; inactive text in slate.
 - [x] 14.4.4 Switching tab updates `useSessionStore.activeDocType`.

### 14.5 Section renderer

 - [x] 14.5.1 Create `frontend/app/components/document/SectionRenderer.tsx`.
 - [x] 14.5.2 Props: `node: SectionNode`, `texSource: string`, `diffState?: DiffState`.
 - [x] 14.5.3 Render `<section className="mb-8">`.
 - [x] 14.5.4 Header row: heading left, `[tex]` toggle button right. Heading: `<h2 className="font-serif text-2xl font-semibold text-ink border-b border-slate/20 pb-1 mb-3">{node.label}</h2>`. Toggle button: small brass-outline button labeled "tex".
 - [x] 14.5.5 State: `showSource: boolean` per section instance.
 - [x] 14.5.6 When `showSource` is false, render children via `<NodeRenderer node={child} />` recursively.
 - [x] 14.5.7 When `showSource` is true, render `<RawTexPanel texSource={texSource} />` for that section only.

### 14.6 Entry renderer

 - [x] 14.6.1 Create `frontend/app/components/document/EntryRenderer.tsx`.
 - [x] 14.6.2 Props: `node: EntryNode`.
 - [x] 14.6.3 Layout: header line with title left (`font-sans font-semibold text-ink`) and dates right (`font-sans text-sm text-slate italic`), organization below.
 - [x] 14.6.4 Render children bullets.

### 14.7 Bullet renderer

 - [x] 14.7.1 Create `frontend/app/components/document/BulletRenderer.tsx`.
 - [x] 14.7.2 Props: `node: BulletNode`.
 - [x] 14.7.3 Render `<li className="font-serif text-base text-ink leading-relaxed ml-4 list-disc marker:text-slate">`.
 - [x] 14.7.4 Apply span formatting via `<FormattedText />`.

### 14.8 Text / formatted text renderer

 - [x] 14.8.1 Create `frontend/app/components/document/FormattedText.tsx`.
 - [x] 14.8.2 Props: `text: string`, `spans: SpanAnnotation[]`.
 - [x] 14.8.3 Split text by span boundaries; render each chunk in `<span>` with classes for formats:
  - bold: `font-bold`
  - italic: `italic`
  - underline: `underline`
  - code: `font-mono text-sm bg-slate/10 px-1 rounded`
 - [x] 14.8.4 If no spans, render plain text.

### 14.9 Raw .tex panel

 - [x] 14.9.1 Create `frontend/app/components/document/RawTexPanel.tsx`.
 - [x] 14.9.2 Props: `texSource: string`, `onChange?: (value: string) -> void`.
 - [x] 14.9.3 Use CodeMirror 6 with basic setup, font `font-mono`, height `auto`, read-only by default (editor visible, `onChange` optional).
 - [x] 14.9.4 If `onChange` is provided, debounce 500ms and send updated source back to parent for re-parsing.
 - [x] 14.9.5 The raw .tex view is per-section, toggled via the `[tex]` button in each `SectionRenderer` header.

### 14.10 Opaque node renderer

 - [x] 14.10.1 Create `frontend/app/components/document/OpaqueNodeRenderer.tsx`.
 - [x] 14.10.2 Render raw content in a faintly styled box with tooltip "Template-specific content — not editable by AI".

---

## 15. Frontend — Diff View (A-Z)

### 15.1 Diff view container

 - [x] 15.1.1 Create `frontend/app/components/diff/DiffView.tsx`.
 - [x] 15.1.2 Props: `document: DocNode`, `diff: DiffChangeSet`.
 - [x] 15.1.3 Render document tree with diff annotations passed down via context `DiffContext`.
 - [x] 15.1.4 Provide `useDiff(nodeId)` hook returning `added | removed | modified | moved | null`.

### 15.2 Proofreading mark styles

 - [x] 15.2.1 Create `frontend/app/components/diff/DiffMark.tsx`.
 - [x] 15.2.2 For additions: left border `border-l-2 border-proof-green pl-3` + green caret icon (`CaretRight` or custom SVG) in margin.
 - [x] 15.2.3 For deletions: `border-l-2 border-proof-red pl-3` + strikethrough text decoration.
 - [x] 15.2.4 For modifications: render old text as deletion and new text as addition stacked vertically.
 - [x] 15.2.5 For moves: dashed brass left border + move icon.
 - [x] 15.2.6 Apply `transition-all duration-200 ease-out` to all marked elements.

### 15.3 Diff/final toggle

 - [x] 15.3.1 In `DocumentToolbar`, add segmented control:
  - "Changes" (diff view)
  - "Final" (clean view)
 - [x] 15.3.2 Default after a new patch: "Changes".
 - [x] 15.3.3 Toggle updates `useSessionStore.viewMode` (`diff` | `final`).

### 15.4 Accept / reject actions

 - [x] 15.4.1 Create `frontend/app/components/diff/DiffActions.tsx`.
 - [x] 15.4.2 Render "Accept all" button (brass) and "Reject all" button (outline with proof-red text).
 - [x] 15.4.3 Accept all: finalize current document version (mark `is_final=true`), switch to final view.
 - [x] 15.4.4 Reject all: revert to previous document version by setting active document to `parent_doc_id`.

### 15.5 Hover reasoning tooltip

 - [x] 15.5.1 Create `frontend/app/components/diff/DiffTooltip.tsx`.
 - [x] 15.5.2 On hover of a marked element, show tooltip with `reasoning` text from patch operation.
 - [x] 15.5.3 Tooltip style: `absolute z-40 max-w-xs rounded-lg bg-ink text-paper px-3 py-2 text-xs shadow-lg`.

### 15.6 Apply to master button

 - [x] 15.6.1 Create `frontend/app/components/diff/ApplyToMasterButton.tsx`.
 - [x] 15.6.2 Render per-changed-element on hover near the mark.
 - [x] 15.6.3 On click: `POST /api/sessions/{id}/apply-to-master` with `operation_index`; show toast; invalidate master resume query.

### 15.7 Diff animation trigger

 - [x] 15.7.1 Use a `key` change on the diff wrapper or CSS animation class `animate-diff-in` to trigger transitions when `diff` changes.
 - [x] 15.7.2 Ensure transitions only apply to elements whose `diff` state changed; stable elements must not re-animate.

---

## 16. Frontend — Settings Pages (A-Z)

### 16.1 Settings layout

 - [x] 16.1.1 Create `frontend/app/settings/layout.tsx`.
 - [x] 16.1.2 Render two-column layout: left nav (200px), right content.
 - [x] 16.1.3 Nav items: Profile, Providers, Master Resume, Account.
 - [x] 16.1.4 Active nav item has brass left border and brass text.

### 16.2 Profile settings

 - [x] 16.2.1 Create `frontend/app/settings/profile/page.tsx`.
 - [x] 16.2.2 Render career context textarea with label "Career context" and help text "This is injected into every tailoring prompt."
 - [x] 16.2.3 Textarea class: `w-full min-h-[160px] rounded-lg border border-slate/20 px-3 py-2 font-sans text-sm focus:border-brass focus:ring-1 focus:ring-brass`.
 - [x] 16.2.4 Save button PATCH `/api/users/me` with `{ career_context }`.

### 16.3 Providers settings

 - [x] 16.3.1 Create `frontend/app/settings/providers/page.tsx`.
 - [x] 16.3.2 List configured providers in cards showing name, type, model, masked key, default badge.
 - [x] 16.3.3 Add provider button opens modal `<ProviderFormModal />`.
 - [x] 16.3.4 Each card has Edit, Test, Delete buttons.
 - [x] 16.3.5 Test triggers `POST /api/providers/{id}/test`; show toast result.

### 16.4 Provider form modal

 - [x] 16.4.1 Create `frontend/app/components/settings/ProviderFormModal.tsx`.
 - [x] 16.4.2 Fields: name, provider type dropdown, API key (optional for Ollama), base URL (shown for Ollama/custom), model, temperature (slider 0-1), top_p (slider 0-1), max_tokens (number), default checkbox.
 - [x] 16.4.3 Validate with Zod; submit POST or PUT.

### 16.5 Master resume settings

 - [x] 16.5.1 Create `frontend/app/settings/master-resume/page.tsx`.
 - [x] 16.5.2 Show current master info: filename, page count, last modified.
 - [x] 16.5.3 Upload button with hidden `<input type="file" accept=".tex,.docx,.txt" />`.
 - [x] 16.5.4 On file select, upload via `POST /api/master-resume`; show progress toast.
 - [x] 16.5.5 Show preview of parsed sections below upload.

### 16.6 Account settings

 - [x] 16.6.1 Create `frontend/app/settings/account/page.tsx`.
 - [x] 16.6.2 Change password form (current, new, confirm).
 - [x] 16.6.3 Linked OAuth accounts list.
 - [x] 16.6.4 Delete account button with destructive confirmation modal.

### 16.7 Form components

 - [x] 16.7.1 Create reusable `frontend/app/components/ui/Input.tsx`, `Textarea.tsx`, `Button.tsx`, `Select.tsx`, `Modal.tsx`.
 - [x] 16.7.2 Button variants: `primary` (brass), `secondary` (slate outline), `danger` (proof-red outline), `ghost`.
 - [x] 16.7.3 Modal: fixed backdrop, centered panel, title, close button, actions.

---

## 17. Frontend — Auth Pages (A-Z)

### 17.1 Auth layout

 - [x] 17.1.1 Auth layout is already created in task 10.9. Ensure it applies consistent card styling for all auth pages.
 - [x] 17.1.2 Centered card on paper background, max-width 420px.
 - [x] 17.1.3 No sidebar/chat rail.

### 17.2 Login page

 - [x] 17.2.1 Create `frontend/app/(auth)/login/page.tsx`.
 - [x] 17.2.2 Fields: email, password.
 - [x] 17.2.3 Submit `POST /api/auth/login`; on success navigate to `/`.
 - [x] 17.2.4 Show error toast on failure.
 - [x] 17.2.5 OAuth buttons: "Continue with GitHub", "Continue with Google".

### 17.3 Register page

 - [x] 17.3.1 Create `frontend/app/(auth)/register/page.tsx`.
 - [x] 17.3.2 Fields: email, password, confirm password.
 - [x] 17.3.3 Client-side validate password length ≥ 10 and match.
 - [x] 17.3.4 On success show message "Check your inbox to verify your email."

### 17.4 Verify email page

 - [x] 17.4.1 Create `frontend/app/(auth)/verify/page.tsx`.
 - [x] 17.4.2 Read `?token=` from URL, call `GET /api/auth/verify-email?token=...`.
 - [x] 17.4.3 Show loading/success/error states.

### 17.5 Forgot / reset password pages

 - [x] 17.5.1 Create `frontend/app/(auth)/forgot-password/page.tsx` and `reset-password/page.tsx`.
 - [x] 17.5.2 Forgot: email input, always show success message.
 - [x] 17.5.3 Reset: new password + confirm, call `POST /api/auth/reset-password`, redirect to login.

---

## 18. Frontend — State Management & Routing

### 18.1 Zustand stores

 - [x] 18.1.1 Create `frontend/app/stores/sessionStore.ts` with:
  - `activeSessionId: string | null`
  - `activeDocType: "resume" | "cover_letter"`
  - `viewMode: "diff" | "final"`
  - `setupOpen: boolean`
  - `isStreaming: boolean`
  - `latestDocument: SessionDocument | null`
  - actions: `setActiveSession`, `setDocType`, `setViewMode`, `setSetupOpen`, `setStreaming`, `setLatestDocument`, `sendChatMessage`
 - [x] 18.1.2 Create `frontend/app/stores/layoutStore.ts` with `sidebarCollapsed`.
 - [x] 18.1.3 Create `frontend/app/stores/searchStore.ts` with `isOpen`, `open`, `close`.

### 18.2 TanStack Query hooks

 - [x] 18.2.1 Create `frontend/app/hooks/queries.ts` exporting:
  - `useCurrentUser()`
  - `useProviders()`
  - `useMasterResume()`
  - `useSessions()`
  - `useGroupedSessions()`
  - `useSession(id)`
  - `useSessionMessages(id)`
  - `useSessionDocument(sessionId, docType)`
  - `useCompanies()`
  - `useTags()`
 - [x] 18.2.2 Each hook uses `useQuery` with appropriate keys and `apiRequest`.

### 18.3 App routes

 - [x] 18.3.1 Define routes in Next.js App Router:
  - `(app)/` — home / active session canvas
  - `(app)/session/[id]` — load session
  - `(app)/company/[name]` — company sessions list
  - `(app)/tag/[tag]` — tag sessions list
  - `(app)/settings/*` — settings pages
  - `(auth)/login`, `(auth)/register`, etc. — auth pages
 - [x] 18.3.2 Create `frontend/app/(app)/page.tsx`: if user has sessions, redirect to `/session/{most_recent_session_id}`; otherwise render `DocumentEmptyState`.
 - [x] 18.3.3 Create `frontend/app/(app)/session/[id]/page.tsx` that sets `activeSessionId` on mount and renders `DocumentCanvas`.
 - [x] 18.3.4 Create `frontend/app/(app)/company/[name]/page.tsx` showing sessions grouped by role.
 - [x] 18.3.5 Create `frontend/app/(app)/tag/[tag]/page.tsx` showing sessions with that tag.

---

## 19. Backend Tests

### 19.1 Test setup

 - [x] 19.1.1 Configure `backend/pyproject.toml` pytest with `asyncio_mode = "auto"`, `testpaths = ["tests"]`.
 - [x] 19.1.2 Create `backend/tests/conftest.py` with async DB session fixture, transaction rollback, and async test client.
 - [x] 19.1.3 Create `backend/tests/factories.py` for user/session/document fixtures.

### 19.2 Auth tests

 - [x] 19.2.1 Test register, verify, login, refresh, logout, forgot/reset password.
 - [x] 19.2.2 Test refresh token reuse detection revokes all tokens.
 - [x] 19.2.3 Test OAuth callback upsert/link.

### 19.3 Parsing tests

 - [x] 19.3.1 Test token tree round-trip for sample `.tex` files.
 - [x] 19.3.2 Test document model extraction for known commands.
 - [x] 19.3.3 Test unknown macros become opaque nodes.
 - [x] 19.3.4 Test .docx and .txt import produce document models.

### 19.4 Patch tests

 - [x] 19.4.1 Test valid modify/insert/delete/move operations.
 - [x] 19.4.2 Test invalid target IDs rejected.
 - [x] 19.4.3 Test cycle detection.
 - [x] 19.4.4 Test required metadata protection.
 - [x] 19.4.5 Test version chain and diff computation.
 - [x] 19.4.6 Test master push-back.

### 19.5 LLM tests

 - [x] 19.5.1 Mock httpx responses for OpenAI/Anthropic/Ollama adapters.
 - [x] 19.5.2 Test response parser extracts patch and handles malformed JSON.
 - [x] 19.5.3 Test API key encryption/decryption.

### 19.6 Research tests

 - [x] 19.6.1 Test timeboxing with mocked slow source.
 - [x] 19.6.2 Test graceful degradation when all sources fail.

### 19.7 Compile tests

 - [x] 19.7.1 Test valid compile returns PDF.
 - [x] 19.7.2 Test timeout error.
 - [x] 19.7.3 Test error parser extracts line numbers.

### 19.8 Session tests

 - [x] 19.8.1 Test CRUD, grouped list, company view, tags.
 - [x] 19.8.2 Test cover letter generation.

---

## 20. Frontend Tests

### 20.1 Test setup

 - [x] 20.1.1 Configure Vitest with `setupFiles: ["./tests/setup.ts"]` importing `@testing-library/jest-dom`.
 - [x] 20.1.2 Configure MSW v2 server in `frontend/tests/msw/server.ts`.
 - [x] 20.1.3 Create test utilities `renderWithProviders(ui)` wrapping React Query + router + stores.

### 20.2 Component tests

 - [x] 20.2.1 Test `Sidebar` expanded/collapsed states render correct icons.
 - [x] 20.2.2 Test `SidebarHistory` groups sessions by date.
 - [x] 20.2.3 Test `SearchModal` opens on Cmd+K, filters results, closes on Escape.
 - [x] 20.2.4 Test `ChatRail` renders user/system messages with correct alignment.
 - [x] 20.2.5 Test `ProgressMessage` renders correct Lucide icons per phase.
 - [x] 20.2.6 Test `ChatInput` submits on Enter and newlines on Shift+Enter.
 - [x] 20.2.7 Test `DocumentCanvas` renders sections with serif font.
 - [x] 20.2.8 Test `DiffView` renders proof-green additions and proof-red deletions.
 - [x] 20.2.9 Test `DiffTooltip` shows on hover.
 - [x] 20.2.10 Test `SettingsProviders` add/edit/test/delete actions.

### 20.3 Hook tests

 - [x] 20.3.1 Test `useSessionSSE` parses events and updates store.
 - [x] 20.3.2 Test `useKeyboardShortcut` registers and cleans up listeners.

### 20.4 Integration tests

 - [x] 20.4.1 Test full flow: login → create session → send message → receive SSE → diff view visible.

---

## 21. Integration & Polish

### 21.1 Theme toggle

 - [x] 21.1.1 Add theme toggle button in settings and sidebar profile menu.
 - [x] 21.1.2 Persist theme to `localStorage`.
 - [x] 21.1.3 Ensure all components respond to `.dark` class.

### 21.2 Error boundaries

 - [x] 21.2.1 Create `frontend/app/components/layout/ErrorBoundary.tsx`.
 - [x] 21.2.2 Wrap main app shell and settings routes.
 - [x] 21.2.3 Show fallback UI with reload button.

### 21.3 Loading states

 - [x] 21.3.1 Add skeleton loaders for sidebar history, document canvas, settings lists.
 - [x] 21.3.2 Disable interactive controls while mutations are pending.

### 21.4 Manual QA checklist

 - [x] 21.4.1 Test LaTeX parsing with moderncv, Awesome-CV, AltaCV, and a custom template.
 - [x] 21.4.2 Test .docx and .txt import/export round-trips.
 - [x] 21.4.3 Test OpenAI, Anthropic, and Ollama providers end-to-end.
 - [x] 21.4.4 Test error paths: invalid .tex compile, network failures, LLM errors, patch validation failures.

### 21.5 Final validation

 - [x] 21.5.1 Run `ruff check .` and `ruff format` in backend; zero issues.
 - [x] 21.5.2 Run `npm run lint` and `npx prettier --check .` in frontend; zero issues.
 - [x] 21.5.3 Run `pytest` in backend; all pass.
 - [x] 21.5.4 Run `npm test` in frontend; all pass.
 - [x] 21.5.5 Run `docker compose up --build` and verify full flow.
