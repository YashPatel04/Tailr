## Context

This is a greenfield application. No existing codebase to integrate with. The system consists of a Python FastAPI backend, React Next.js frontend, PostgreSQL database, and Redis cache — all orchestrated via Docker Compose for local development. The core technical challenge is building a LaTeX-native document pipeline that can be safely edited by LLMs while preserving exact formatting fidelity.

## Goals / Non-Goals

**Goals:**

- Parse `.tex` files into a lossless syntactic token tree that survives round-trip serialization
- Extract a structured document model from the token tree that LLMs can safely edit
- Define a JSON patch protocol for LLM-driven document mutations with server-side validation
- Support multi-provider LLM integration (OpenAI, Anthropic, Ollama) with encrypted API key storage
- Compile `.tex` to `.pdf` via Dockerized texlive-full + latexmk
- Render document sections interactively in the browser (not PDF) with a diff view using margin proofreading marks
- Organize tailoring sessions by company with global tag support
- Provide email + OAuth authentication with JWT in httpOnly cookies and standard security middleware

**Non-Goals:**

- Real-time collaboration between multiple users
- WYSIWYG document editing (the LLM is the editor; the user gives instructions)
- TOTP two-factor authentication (deferred)
- PDF-based diff rendering (replaced by interactive section diffs)
- Mobile-optimized layout (desktop-first)

## Decisions

### Decision 1: Syntactic token tree, not semantic AST

A full semantic AST that understands what every macro "means" breaks against exotic user templates (`\customcvsection`, custom `.cls` files). Instead, parse LaTeX into a lossless syntactic tree — commands, environments, groups, text spans — with source ranges for every token. Serialization produces byte-identical `.tex`.

A **document model extractor** layer sits on top, mapping known resume commands to semantic types (`\section` → section, `itemize` → bullet list) and treating unknown macros as opaque spans. This is what the LLM sees and edits.

A **template vocabulary map** records which commands the user's template uses for each semantic type (`\cvsection`, not `\section`). When the LLM adds new content, the serializer uses this map to produce idiomatic `.tex` matching the user's template.

**Alternatives considered:**

- **Raw .tex throughout**: LLMs break LaTeX syntax; text-based diffs are noisy.
- **Intermediate format (markdown/JSON)**: Round-tripping back to the user's original `.tex` template is lossy.

### Decision 2: JSON patch protocol for LLM edits

The LLM receives the structured document model (not raw .tex) and returns a JSON patch with operations: `modify`, `insert`, `delete`, `move`, `ask`. Each operation carries a `reasoning` field for quality control and UI tooltips. The `ask` operation pauses the patch and surfaces a question to the user (for Refine/Rewrite proactive queries).

Server-side validation before applying: ID existence, no cycle creation on moves, no deletion of required metadata, format types must exist in vocabulary map, text length limits.

**Alternatives considered:**

- **Full text regeneration**: Cannot compute precise diffs; loses edit history.
- **Structured XML patches**: More verbose than JSON; LLMs handle JSON well.

### Decision 3: SSE-based progress pipeline

The backend streams progress events via Server-Sent Events: `researching` → `research_progress` → `research_done` → `thinking` → `writing` → `done`. Each event carries structured data the frontend renders as chat messages. This is not fake — each state maps to an actual backend phase.

The frontend chat rail subscribes to the SSE stream for the active session. The document canvas also listens and updates incrementally as `writing` events stream partial patches.

**Alternatives considered:**

- **Polling**: Unnecessary latency; worse UX.
- **WebSocket**: Overkill for unidirectional server→client streaming; SSE is simpler.

### Decision 4: Dockerized LaTeX compilation

A separate Docker container running `texlive-full` + `latexmk`, kept alive with `sleep infinity`. The FastAPI backend writes `.tex` to a shared volume and `docker exec`s `latexmk -pdf` commands. Errors are caught, parsed for line numbers, and optionally sent to a cheap LLM for fix suggestions.

This avoids installing texlive on the host and guarantees reproducible compilations. The container is built once as part of `docker compose build`.

**Alternatives considered:**

- **tectonic**: Limited engine support (no XeLaTeX, limited fontspec). Cannot handle exotic preambles. Dropped.
- **Hosted compilation API**: Adds cost and network dependency. Rejected per zero-paid-services constraint.

### Decision 5: Interactive section rendering replaces PDF diffs

Instead of rendering diffed PDFs (computationally expensive, poor UX), the frontend renders the document model as styled interactive sections using the design system's serif font. Changes are highlighted with margin proofreading marks: Vertical rules in Proof Green/Red beside changed lines, caret for insertions, strikethrough for deletions. 150-200ms transitions make changes legible.

This saves compute (no per-change compilation), gives users an interactive editing surface, and keeps the raw `.tex` accessible via a toggle.

**Alternatives considered:**

- **PDF diff with pixel-level comparison**: Expensive, ugly output, not interactive.
- **Plain text diff**: Loses formatting context entirely.

### Decision 6: Icon pack (Lucide or similar free SVG pack)

All UI icons use a free icon pack (Lucide / Tabler Icons / Phosphor Icons) rendered as inline SVGs. No emojis in the product chrome. Icons serve functional roles: sidebar toggle, search, new chat, export, settings, profile.

**Alternatives considered:**

- **Emojis**: Look unprofessional in a precision tool; inconsistent cross-platform rendering.
- **Custom icon design**: Unnecessary upfront cost; free packs are mature and extensive.

### Decision 7: ChatGPT-style three-pane layout

Three zones: **Sidebar** (logo, search toggle, collapse icon, New Chat, Projects, scrollable history by date, fixed profile at bottom), **Document Canvas** (dominant width, rendered resume/cover letter/diff with serif type), **Chat Rail** (right side, 320px, chat messages + input). Search is a modal overlay triggered from the sidebar search icon or `Cmd/Ctrl+K`.

The document canvas is the star. The chat rail is the assistant beside it, not the other way around.

**Alternatives considered:**

- **Chat-dominant layout**: Subordinates the document, which is the product's primary artifact.
- **Chat rail on the left**: Feels like a chatbot with a document preview; the design brief explicitly wants document-first.

### Decision 8: Master resume push-back is opt-in and selective

Tailored versions are isolated from the master resume by default. Each patch operation carries a stable document ID. When the user sees a change they want in their master (e.g., a universally better bullet phrasing), they click "Apply to master" on that specific operation. Only that operation is pushed back — not the entire tailoring session. This prevents role-specific edits from contaminating the base resume.

## Risks / Trade-offs

- **[Risk] LaTeX parsing fails on exotic templates** — Custom macros, catcode tricks, or conditional compilation could break the token tree parser. Mitigation: Test against a corpus of real resume templates (moderncv, Awesome-CV, AltaCV, etc.). Fail gracefully with line-specific error messages. Offer the user the option to send the `.tex` as raw text to the LLM without token tree parsing (degraded mode — no structured diffs, higher risk of syntax breakage).

- **[Risk] LLM produces invalid patches** — Even with JSON format constraints, the LLM may reference nonexistent IDs or produce nonsensical structures. Mitigation: Server-side validation rejects invalid patches before application. The chat rail surfaces validation errors to the LLM for self-correction (a second pass).

- **[Risk] Compilation timeout on large documents** — 5-page limit helps, but complex preambles with many packages can still be slow. Mitigation: 30-second timeout on latexmk. Cache compiled PDFs per document version. Use latexmk's `-pvc-` flag to avoid continuous mode overhead.

- **[Risk] Web scraping reliability** — Reddit blocks programmatic access; company websites change structure. Mitigation: 15-second total timebox with per-source timeouts. Degrade gracefully — whatever research was gathered is used. The spec states JD requirements take priority over research when they conflict, so incomplete research is not fatal.

- **[Risk] LLM API key exposure** — If the database is compromised, plaintext API keys are exposed. Mitigation: AES-GCM encryption at rest using the app's SECRET_KEY. Keys are decrypted only at request time and never returned to the client in full (last 4 chars only for display).

## Frontend Architecture Decisions

### Decision 9: Custom React component tree for document rendering

The document canvas SHALL use a custom React component tree that maps directly to the backend document model. Each semantic node type (`section`, `entry`, `bullet`, `text`, `opaque`) has a dedicated renderer component. This gives full control over margin proofreading marks, transitions, and raw .tex toggles, and avoids pulling in heavy rich-text editor dependencies.

- SectionRenderer → renders `<section>` with serif heading
- EntryRenderer → renders title/dates/organization lines
- BulletRenderer → renders `<li>` with formatted text
- FormattedText → splits text by span annotations and applies bold/italic/underline/code
- OpaqueNodeRenderer → renders non-editable template-specific content

### Decision 10: Client-side search index for MVP

The search modal SHALL build a client-side index from already-loaded session data. It filters chats, companies, and tags in memory using case-insensitive substring matching. A server-side search endpoint is deferred; the sidebar loads all user sessions on app open (expected to be modest for MVP), so client-side search is fast and simple.

## Open Questions

None remaining — all architecture decisions required for the MVP build are resolved above.
