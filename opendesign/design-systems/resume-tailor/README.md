# Resume Tailor — UI System & Features

A greenfield web application that tailors LaTeX resumes to job descriptions using LLMs. Three-column desktop layout with a document-centric workflow and real-time SSE-driven chat.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v3, custom tokens |
| State | Zustand (session, layout, search), TanStack Query (server state) |
| Backend | FastAPI (Python 3.11), SQLAlchemy async, PostgreSQL 16 |
| Auth | JWT httpOnly cookies + CSRF double-submit pattern |
| Real-time | Server-Sent Events (SSE) for chat/LLM pipeline |
| PDF | pypdf (parsing), texlive-full via Docker (compilation) |
| Email | MailHog (dev), SMTP (prod) |
| Infra | Docker Compose (6 services: db, redis, latex, backend, frontend, mailhog) |

---

## Color System

**Temperature**: neutral-warm. Paper and Ink carry chroma ≤ 0.02. Brass is the sole accent.

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `paper` | `#F1F2EE` | `#171B22` | Primary surface background |
| `ink` | `#171B22` | `#F1F2EE` | Primary text |
| `slate` | `#5B6472` | `#9CA3AF` | Secondary text, muted UI |
| `brass` | `#B8863A` | `#B8863A` | Accent — buttons, active states, focus rings |
| `brass-hover` | `#9A6F2D` | `#9A6F2D` | Accent hover |
| `proof-green` | `#2E7D5B` | `#2E7D5B` | Diff additions, success states |
| `proof-red` | `#B23B3B` | `#B23B3B` | Diff removals, dangerous actions |
| `danger` | `#B23B3B` | `#B23B3B` | Delete buttons, error borders |

No gradients. No shadows on cards. No colored left-border accent strips. Flat, editorial palette.

---

## Typography

| Role | Font | Weight | Size | Usage |
|------|------|--------|------|-------|
| Headings (h1, h2) | Newsreader (serif) | 600 | 24px / 20px | Page titles, section headings |
| Body / UI | Public Sans (sans) | 400–500 | 14px / 16px | Labels, inputs, buttons, sidebar items |
| Captions / meta | Public Sans | 400 | 12px | Secondary info, timestamps, version numbers |
| Code | JetBrains Mono | 400 | 12px | LaTeX source preview, code blocks |

**Casing**: Sentence case for headings and labels. Title case only for brand name ("Resume Tailor"). No all-caps except sidebar group headers (12px, semibold, tracking-wider).

---

## Dark Mode

Class-based toggle via `.dark` on `<html>`. Theme preference persisted in `localStorage` key `rt-theme`.

- Surface colors invert: `paper` ↔ `ink`
- Slate shifts from `#5B6472` to `#9CA3AF` (higher luminance for readability)
- Form inputs get explicit dark backgrounds (`#1E2430`) to override browser defaults
- Focus rings remain brass in both modes
- Hover opacity increases in dark mode (`0.05` → `0.12`, `0.10` → `0.20`) for visible feedback
- Toast notifications use fixed dark pill style regardless of mode

---

## Layout Architecture

### App Shell (`AppShell`)
```
┌──────────┬──────────────────────┬──────────┐
│ Sidebar  │     Main Canvas      │ Chat Rail│
│ 260px    │     flex-1           │ 320px    │
│ (50px    │                      │ (hidden  │
│ collaps) │                      │  when no │
│          │                      │  session)│
└──────────┴──────────────────────┴──────────┘
```

- **Sidebar** (left): collapsible via button, persists in localStorage (`rt-sidebar-collapsed`). Contains header/logo, New Chat button, project groups, history items, user profile.
- **Main Canvas** (center): document view with toolbar (view mode toggle + export), document tabs (Resume/Cover Letter), and rendered sections.
- **Chat Rail** (right): session header, message list with progress indicators, text input. Only visible when a session is active.

### Route Structure
```
/                          → Home (redirects to most recent session or shows empty state)
/session/[id]              → Active session page (document + chat rail)
/settings/profile          → User profile settings (modal overlay)
/settings/providers        → LLM provider management (modal overlay)
/settings/master-resume    → Master resume upload/view/remove (modal overlay)
/settings/account          → Account deletion (modal overlay)
/login                     → Login form
/register                  → Registration form
/verify?token=             → Email verification
/forgot-password           → Password reset request
/company/[name]            → Sessions grouped by company
/tag/[tag]                 → Sessions filtered by tag
```

### Settings (Modal)
All settings pages render as a full-screen portal overlay (`createPortal` to `document.body`). Left sidebar nav (Profile, Providers, Master Resume, Account) with highlight on active route. Close (X) button navigates to `/`. Theme toggle in the nav footer.

---

## Component Inventory

### Sidebar (`260px` / `50px` collapsed)
- **SidebarHeader**: Logo/app name + Search button (opens SearchModal) + collapse toggle
- **SidebarNewChat**: Button that opens SessionSetupForm slide-over
- **SidebarProjects**: Flat list grouped by company, shows session count per company
- **SidebarHistory**: Time-grouped session list (Today / Yesterday / Previous 7 Days / Older) with collapsible groups. Each item shows company + role. Active item has subtle `bg-slate/10` highlight. Archive/Delete actions on hover.
- **SidebarProfile**: User avatar (first letter), email, theme toggle, Settings link, Logout button. Collapsed variant shows popover menu.

### Document Canvas
- **DocumentToolbar**: Document title + version, Changes/Final view toggle (segmented button), Export dropdown (click-to-open, .tex/.pdf/.docx/.txt).
- **DocumentTabs**: Resume / Cover Letter tab switcher. Cover letter tab hidden when no cover letter exists.
- **SectionRenderer**: Renders document model nodes (sections, entries, bullets, text) with LaTeX source or plain text.
- **DiffView**: Side-by-side diff view. Changes marked with colored left borders (green=added, red=removed, brass=modified, dashed=moved).
- **DiffActions**: Accept All / Reject All buttons (visible only in diff mode).

### Chat Rail
- **ChatRailHeader**: Company + role title, archive button.
- **ChatMessageList**: Scrollable message list with auto-scroll to bottom. Shows progress banner during streaming with animated phase icons (researching, thinking, writing).
- **ChatInput**: Auto-resizing textarea, Enter to send, Shift+Enter for newline. Disabled during streaming.
- **ChatRailEmptyState**: Shown when no session is selected. "Start a session" button opens SessionSetupForm.
- **SessionSetupForm**: Slide-over panel (mounted in AppShell). Fields: company, role, JD text/URL toggle, tailoring mode (polish/refine/rewrite), provider selector, notes. Auto-triggers first LLM message after creation.

### Auth Pages
- **Login**: Email + password form, OAuth buttons (GitHub, Google), link to register/forgot-password.
- **Register**: Email + password + confirm form, password length validation.
- **Verify**: Success/error state based on token.
- **ForgotPassword**: Email input, success state.

### Settings Pages
- **Profile**: Career context textarea (injected into every prompt), Save button.
- **Providers**: List of configured LLM providers with test/delete actions. Add form with provider type, API key, base URL, model, temperature.
- **Master Resume**: Upload (hidden file input, .tex/.docx/.txt/.pdf), View modal (shows parsed text), Remove button (with confirmation), Replace button.
- **Account**: Delete account with confirmation.

### Shared / UI
- **SearchModal**: Cmd+K style search overlay (portal). Searches sessions, companies, tags. Arrow key navigation, Enter to navigate.
- **Spinner**: Centered loading indicator, sizes: sm/md/lg.
- **ProgressMessage**: Phase indicator with icon, displayed in chat during LLM pipeline.
- **Toaster**: react-hot-toast, bottom-right, dark pill with icon themes for success/error.
- **ErrorBoundary**: Class component (exported but not yet mounted anywhere).

---

## State Management

### Zustand Stores

| Store | Key State | Purpose |
|-------|-----------|---------|
| `sessionStore` | activeSessionId, activeDocType, viewMode, isStreaming, shouldAutoTailor, progressPhase | Central session state, SSE progress tracking |
| `layoutStore` | sidebarCollapsed | Sidebar collapse state, persisted to localStorage |
| `searchStore` | isOpen | Search modal visibility |

### Server State (TanStack Query)
| Query | Endpoint | Cache Key |
|-------|----------|-----------|
| `useCurrentUser` | `GET /api/users/me` | `["user", "me"]` |
| `useProviders` | `GET /api/providers` | `["providers"]` |
| `useMasterResume` | `GET /api/master-resume` | `["master-resume"]` |
| `useSessions` | `GET /api/sessions` | `["sessions"]` |
| `useGroupedSessions` | `GET /api/sessions/grouped` | `["sessions", "grouped"]` |
| `useSession` | `GET /api/sessions/:id` | `["sessions", id]` |
| `useSessionMessages` | `GET /api/sessions/:id/messages` | `["sessions", id, "messages"]` |
| `useSessionDocument` | `GET /api/sessions/:id` + docType filter | `["sessions", id, "document", docType]` |
| `useCompanies` | `GET /api/companies` | `["companies"]` |
| `useTags` | `GET /api/tags` | `["tags"]` |

---

## API Client (`lib/api.ts`)

- Wraps `fetch` with automatic CSRF token injection and 401 token refresh.
- `ensureCsrfToken()`: lazy-fetches CSRF from `/api/health` (shared promise to prevent races).
- `refreshAccessToken()`: calls `/api/auth/refresh`, redirects to `/login` on failure.
- `apiRequest<T>(method, path, body?, opts?)`: generic typed request helper.
- Supports `opts.rawResponse: true` for binary/blob downloads (used by export).

---

## SSE Pipeline (`useSessionSSE`)

```
User Message → POST /api/sessions/:id/chat (SSE)
  ├─ event: researching   → "Researching {company}..."
  ├─ event: research_done → {summary}
  ├─ event: thinking      → "Thinking..."
  ├─ event: writing       → "Writing changes..."
  ├─ event: done          → {document_id} → setViewMode("diff")
  └─ event: error         → toast error
```

Progress shown in chat as an animated banner with phase-specific icons (FileSearch, Brain, PenLine).

---

## Auth Flow

1. **Register** → `POST /api/auth/register` → verify email
2. **Verify** → `GET /api/auth/verify-email?token=` → login
3. **Login** → `POST /api/auth/login` → httpOnly `access_token` (15min) + `refresh_token` (7d) cookies
4. **CSRF**: `csrf_token` cookie (httponly=False) set on every GET. Header `X-CSRF-Token` must match cookie on state-changing requests. Exempt paths: `/api/auth/`, `/api/health`.
5. **Refresh**: Frontend auto-refreshes on 401. Backend rotates refresh tokens (old token revoked, new token issued). Token reuse detection revokes all user tokens.
6. **Logout**: Clears cookies, clears query cache, redirects to `/login`.

---

## Master Resume Pipeline

1. Upload .tex / .docx / .txt / .pdf via form POST
2. Backend parses file into document model (structured tree):
   - **.tex**: `LatexParser` → token tree → `DocumentModelExtractor` (sections, entries, bullets, vocab)
   - **.docx**: `DocxImporter` (python-docx, paragraph style detection)
   - **.txt**: `TxtImporter` (heuristic: ALL CAPS → section, bullet chars → bullet)
   - **.pdf**: `PdfImporter` (pypdf, line merging, section keyword detection, entry date parsing)
3. Document stored as `tex_source` + `document_model_json` + `vocabulary_map_json` in PostgreSQL
4. Tailoring session copies master document as version 0, applies LLM patches to create new versions

---

## Session & Tailoring Flow

1. User opens SessionSetupForm (from "New Chat" button or empty state)
2. Enters company, role, JD (paste or URL), selects mode (polish/refine/rewrite)
3. On create: backend fetches JD (if URL), creates `Session` + `SessionDocument` v0
4. Frontend auto-sends initial prompt: "Tailor my resume for this role..."
5. LLM pipeline (via SSE):
   - Research company (web scraping, DuckDuckGo)
   - Build tailoring prompt (combines master resume + JD + research + career context)
   - LLM generates patch (JSON diff operations)
   - Patch validated against document model
   - Patch applied → new `SessionDocument` version
   - Diff computed between old and new documents
6. User sees diff view (Changes tab) with colored annotations
7. User can accept changes (view final) or continue chatting for more iterations

---

## Export

`GET /api/sessions/:id/export?format=` supports `.tex`, `.pdf`, `.docx`, `.txt`.
- **tex**: raw LaTeX source as plain text download
- **pdf**: compiled via texlive-full in Docker (pdflatex)
- **docx**: converted from document model (python-docx)
- **txt**: plain text extraction
Frontend downloads via `URL.createObjectURL(blob)` + programmatic `<a>` click.

---

## Hover / Press / Focus States

| Element | Default | Hover | Focus | Active/Pressed |
|---------|---------|-------|-------|----------------|
| Primary button (brass) | `bg-brass text-paper` | `bg-brass-hover` | brass ring | same as hover |
| Secondary/ghost button | transparent | `bg-slate/5` | brass ring | `bg-slate/10` |
| Text input | `bg-paper border-slate/20` | same | `border-brass ring-1 ring-brass` | same |
| Sidebar item | transparent | `bg-slate/5` | — | `bg-slate/10` (active) |
| Export dropdown | `bg-paper shadow-lg` | `bg-slate/5` per item | — | — |
| Tab (view mode) | transparent | `bg-slate/5` | — | `bg-brass text-paper` (selected) |

---

## Known Gaps / TODOs

- Cover letter generation not yet implemented (tab hidden, docType filter stub)
- Accept/Reject patch operations are view-mode toggles only (no backend apply/revert endpoints)
- ErrorBoundary exported but not mounted in component tree
- Reusable UI component files (Button, Input, Modal, etc.) exist but are unused — all pages build inline
- `useSessionMessages` queries a GET endpoint that was just added; message history display needs testing with real SSE responses
- Keyboard shortcut hook (`useKeyboardShortcut`) defined but unused
- No edit-session-details UI after creation
- No view/restore archived sessions UI
- Tags UI is read-only (no add/edit/remove on sessions)
- DiffMark component unused in current diff rendering
- SectionRenderer does not integrate with diff view context (`diffState` prop accepted but ignored)

---

## Sources

- `frontend/` — Next.js app source (components, hooks, stores, types, config)
- `backend/` — FastAPI source (API routes, services, models)
- `frontend/tailwind.config.ts` — color tokens and font families
- `frontend/app/globals.css` — dark mode overrides, animations
- `frontend/next.config.js` — Next.js configuration
- `backend/pyproject.toml` — Python dependencies
