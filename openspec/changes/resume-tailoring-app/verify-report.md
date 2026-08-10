# Verification Report — `resume-tailoring-app`

**Date:** 2026-08-02
**Method:** Static review of all 10 delta specs, `design.md`, `tasks.md`, and ~30 backend/frontend source files, plus live execution of the full test + lint suites inside the running Docker containers.

---

## 1. Completeness

| Artifact | Status |
|---|---|
| `proposal.md` | present |
| `design.md` | present |
| `specs/{10 specs}/spec.md` | present |
| `tasks.md` — checkboxes | **555/555 complete, 0 unchecked** |

All tasks are marked done. Completeness gate: **PASS**.

## 2. Quality gates (run live, not assumed)

| Gate | Command | Result |
|---|---|---|
| Backend tests | `poetry run pytest` (in container) | **182 passed, 2 skipped** |
| Backend lint | `poetry run ruff check .` | pass (0 errors) |
| Backend format | `poetry run ruff format --check .` | pass (69 files) |
| Frontend tests | `npm test` (Vitest, in container) | **41 passed** |
| Frontend lint | `npm run lint` (next lint) | pass (0 warnings/errors) |
| Frontend format | `npx prettier --check .` | pass |
| CI workflow | `.github/workflows/ci.yml` | runs backend+frontend tests, ruff, ESLint, Prettier |
| Pre-commit | `.pre-commit-config.yaml` | ruff + eslint + prettier hooks |

All quality gates: **PASS**.

## 3. Requirement-level conformance

Verified against each delta spec requirement. `PASS` = implemented and matches; `PARTIAL` = implemented with a deviation; `MISS` = not implemented.

### user-auth

| Requirement | Verdict | Evidence |
|---|---|---|
| Email registration, verification, password reset, bcrypt | **MISS** | No `/register`, `/verify-email`, `/forgot-password`, `/reset-password` or email-login route. `auth.py` exposes only `/refresh`, `/logout`, GitHub/Google OAuth. No password field on `User`. `oauth2_scheme.tokenUrl="/api/auth/login"` points at a nonexistent route. |
| OAuth (GitHub, Google), auto-create verified account, email-conflict linking | **PARTIAL** | Both OAuth flows implemented and auto-create `is_verified` users. No email registration exists, so the "link OAuth to existing email account" scenario is unreachable. |
| JWT access (15m) / refresh (7d) httpOnly cookies | **PASS** | `set_auth_cookies`, 900s/604800s max-age. |
| Refresh rotation + reuse detection | **PASS** | `auth.py:79-95` revokes all user tokens on reuse ("Token reuse detected"); rotation on each use. |
| Logout invalidates refresh token | **PASS** | `auth.py:121`. |
| CSRF double-submit | **PASS** | `CsrfMiddleware` in `main.py`, enforced in tests. |
| Rate limiting (auth, 20/min → 429) | **MISS** | `slowapi.Limiter` + 429 handler exist, but **no `@limiter.limit` decorator exists anywhere**; the limiter never triggers. |
| CORS allowlist | **PASS** | `FRONTEND_ORIGIN` allowlist. |
| Oversized upload → 413 | **PARTIAL** | `PayloadLimitMiddleware` enforces **10MB**, not the spec's 1MB threshold. |

### doc-parsing

| Requirement | Verdict | Evidence |
|---|---|---|
| Lossless syntactic token tree, byte-identical round-trip | **PARTIAL** | `parser.py` implements a `Token` tree with byte ranges + serialize. It is **not used in any import path**; master upload calls the LLM importer (`sessions.py:510`, `import_from_tex`). Token-tree round-trip is untested by the suite. |
| Extract document model from token tree; stable IDs across re-extraction | **MISS (mechanism)** | Model extraction is delegated to an LLM (`tex_llm_importer.py`). IDs are `uuid4` generated per node (`resume_schema.py`), so they do not persist across re-extractions of the same document (spec: `sec-1`/`ent-1`/`bul-1`). |
| Unknown macros as opaque non-editable spans | **MISS** | No opaque-span concept in the model or renderer. |
| Template vocabulary map (`\cvsection` vs `\section`) | **MISS** | Renderer emits generic `\section`/`\textbf` via Jinja (`renderer.py`); no vocabulary map is recorded or used on export. |
| Normalize `.docx` / `.txt` inputs | **MISS** | Master upload accepts `.tex` text only (`sessions.py:464-476`). No python-docx/txt import path. |
| Reject oversized (>5 pages) | **MISS** | `page_count` column exists but is never computed or enforced. |

### doc-editing

| Requirement | Verdict | Evidence |
|---|---|---|
| JSON patch protocol `modify/insert/delete/move/ask` on node IDs | **PARTIAL** | Implementation uses a *richer path-based* op set (`update_bullet`, `add_entry`, `move_section`, `update_basics_field`, …) addressed by `section_label` + indices, not node IDs (`content_ops.py`, prompts). Coherent internally and validated, but a deliberate protocol divergence from the spec. |
| `ask` pauses patch and surfaces question in chat rail | **MISS** | `AskOp` is a **silent no-op** (`content_ops.py:459` returns); nothing is surfaced to the user. |
| Reject nonexistent target | **PARTIAL** | Raises `IndexError` for out-of-range indices; message identifies the index/label, not a node ID. |
| Reject cycle-creating move | **MISS** | Moves are intra-section only; no reparenting, no cycle detection. |
| Reject delete of required metadata (contact info) | **MISS** | `delete_section` / `update_basics_field` can remove/blank contact info without restriction. |
| Version chain (`parent_doc_id`) | **PASS** | `SessionDocument.parent_doc_id` set on every patch; version increments. |
| Diff between any two versions in chain | **MISS** | No diff endpoint. Diff is computed client-side (`fieldDiff.ts`) between the user's **master resume and the current session doc**, not arbitrary versions. |
| Branch from any version | **MISS** | Not implemented. |
| Selective "Apply to master" | **MISS** | Design Decision 8 + spec requirement not implemented (no endpoint/UI). |
| Store patches with metadata (applied flag, ops, trigger msg) | **PARTIAL** | `Patch` rows stored on accept/user-edit with ops + `applied`; `raw_llm_response` never populated; decline path stores only a chat message, not an `applied:false` patch record. |

### llm-integration

| Requirement | Verdict | Evidence |
|---|---|---|
| Multi-provider CRUD + test + per-session selection | **PASS** | `providers.py` full CRUD + `/test` + `/models` (Redis-cached); per-session `current_provider_id`/`current_model`, mid-session switchable. |
| AES-GCM key encryption, masked response | **PASS** | `crypto.py` (AESGCM, nonce+ct, base64); `api_key_last_four` returned. |
| Default provider pre-selection | **PARTIAL** | No `is_default` flag; falls back to the first provider created. |
| Prompt context: doc model, JD, notes, career context, research, mode | **PASS** | `prompts.py` includes all; delimited blocks. Mode instructions match spec semantics (polish/refine/rewrite). |
| `ask` op authorized in Refine mode | **PARTIAL** | Prompt mentions `ask`; the server ignores it (see doc-editing). |
| SSE phases researching/research_done/thinking/writing/done + partial patches | **PARTIAL** | Events emitted: `researching`, `research_done`, `thinking`, `writing`, then **`proposal`** (whole patch) or `error`. The `done` event is only used in edge paths; `writing` does **not** stream partial patches. |

### company-research

| Requirement | Verdict | Evidence |
|---|---|---|
| Scrape careers page, engineering blog, subreddits; 5s/source, 15s total | **PARTIAL** | `research_company` gathers careers/blog/reddit concurrently with 5s timeouts each. No explicit 15s total budget (concurrency makes it ~5s). |
| Summarize via LLM into values/hiring-signals/tone | **MISS** | `summarizer.py` uses **keyword heuristics**, ignores the `provider` argument, and hardcodes fallback values/signals/tone. |
| JD requirements take priority over research | **MISS** | No prompt instruction asserts JD priority over research. |
| Research stored per-session, gathered once | **PASS** | `Session.research_summary_json`, cached across messages (`tailor.py:231-241`). |

### doc-compilation

| Requirement | Verdict | Evidence |
|---|---|---|
| Dockerized latexmk compile, on demand | **PASS** | `compile_server.py` runs `latexmk -pdf -halt-on-error`, 30s timeout; `compiler.py` client. |
| Cache compiled PDF per version | **MISS** | `export.py` recompiles on every request; no cache. |
| Parse errors → line number + context | **PARTIAL** | `CompileError.line/context` never populated; raw stdout tail (last 500 chars) is returned. |
| Cheap-LLM fix suggestions | **MISS** | Not implemented; graceful raw-error fallback works. |
| Export tex/pdf/docx/txt (+html) | **PASS** | `export.py` covers all formats; `.tex` uses generic commands (no vocabulary map). |

### diff-view

| Requirement | Verdict | Evidence |
|---|---|---|
| Margin proof marks in Proof Green/Proof Red, only in canvas | **PARTIAL** | Canvas gutter marks use **hardcoded hex** (`#137333`/`#c5221f`/`#e37400`), not the `proof-green`/`proof-red` tokens; a third "modified" color is added. `proof-red` token **is** used on the "Reject all" button (`DiffOverlay.tsx`) — chrome, violating the only-in-canvas rule. |
| Modified bullet: old (red strikethrough) + new (green caret) | **PARTIAL** | Implemented as inline word-level strikethrough/insert within one line, not side-by-side. |
| 150-200ms transition on changed elements | **MISS** | `animate-diff-in` (200ms) is defined in `globals.css` but **never applied** to any element. |
| Toggle diff / final; default diff after tailoring | **PASS** | `viewMode` "changes"↔"final"; proposal sets `viewMode("changes")`; Accept → `"final"`. |
| Accept all / Reject all | **PASS** | `EnhancedProposal.accept` → `/proposal/accept`; `DiffOverlay` reject → `set_content` revert. |
| Live diff while chatting | **PASS** | `sessionStore.sendMessage` updates document via SSE; diffs recompute from React Query state. |
| Hover-to-see-reasoning tooltip | **MISS** | `reasoning` is shown in `EnhancedProposal` but no per-element hover tooltip; `DiffChange` carries no reasoning. |

### tailoring-session / ui-layout

| Requirement | Verdict | Evidence |
|---|---|---|
| Create session from master, JD URL fetch, mode, provider/model, notes | **PASS** | `sessions.py` create/analyze; requires master resume. |
| Lifecycle: view/resume/archive/delete; date grouping | **PASS** | grouped endpoint, archive flag, delete cascade, sidebar `SidebarHistory`. |
| Chat messages stored w/ role+metadata; role styling | **PASS** | `ChatMessage`, `ProgressMessage` with Lucide icons per phase. |
| Patch reference + summary in chat | **PASS** | Proposal card shows explanation/reasoning/op count. |
| Company routes + global tags | **PASS** | `/company/{name}`, `/tags`, tag filters. |
| Cover letter: generate / share context / chat-edit / export | **PASS** | `generate-cover-letter`, cover-letter edit branch in `tailor.py`, pdf/docx export. |
| Three-pane layout, collapsible sidebar (260→~50px) | **PASS** | `Sidebar.tsx`, `AppShell`, `layoutStore`. |
| Search modal via icon or Cmd/Ctrl+K | **PASS** | `SearchModal`, `useKeyboardShortcut`. |
| Canvas serif rendering (Newsreader) | **PASS** | Document components; canvas dominant width. |
| `[tex]` raw-view toggle w/ CodeMirror | **MISS** | CodeMirror is an unused dependency; no raw `.tex` editor toggle. |

## 4. Coherence vs `design.md`

- Decision 1 (token tree + vocabulary map) — **not implemented as designed**; LLM importer replaced the token-tree extractor.
- Decision 2 (JSON patch protocol `modify/insert/delete/move/ask`) — **diverged** to a path-based protocol; `ask` inert.
- Decision 3 (SSE pipeline) — implemented with a `proposal` event in place of spec'd `done`/partial `writing` events.
- Decision 4 (Dockerized LaTeX) — implemented (HTTP service instead of `docker exec`, acceptable).
- Decision 5 (interactive section rendering + margin marks) — implemented, but proof colors/animations deviate.
- Decision 6 (Lucide icons) — **PASS**.
- Decision 7 (three-pane layout, canvas-first) — **PASS**.
- Decision 8 (selective opt-in master push-back) — **not implemented**.

## 5. Overall verdict

**NOT READY to archive.**

- **Completeness: PASS** (555/555 tasks ticked) and **quality gates: PASS** (all suites/linters green when run live).
- **But** task completion is overstated relative to the delta specs: 4 of 10 specs contain MISS-level requirements (user-auth email flows, doc-parsing token-tree pipeline + docx/txt import, doc-editing `ask`/branch/diff/apply-to-master, diff-view transitions/colors/reasoning tooltip), plus several PARTIALs (rate limiting, LLM research summarization, PDF caching, 1MB limit).

Highest-priority gaps before archive:

1. **Authentication is OAuth-only** — email registration/verification/password reset and the `/login` route are missing despite being a hard spec requirement.
2. **Rate limiting is wired but inert** — no endpoint has a limit decorator.
3. **Doc pipeline diverged** — the LLM importer replaced the specified token-tree → document-model → vocabulary-map pipeline; `.docx`/`.txt` import absent.
4. **`ask` operation does nothing** — the interaction the Refine mode relies on is a no-op.
5. **"Apply to master" / branch / server-side diff** — Decision 8 and two doc-editing requirements unimplemented.
6. **PDF caching and compile-error line extraction** missing.
