## Context

The resume builder has a working canvas + chat system where the LLM proposes structured operations that the user accepts/declines. A cover letter feature exists but is broken: a one-shot generate button that produces read-only text with no editing, no chat integration, and a hardcoded model. The `ChatMessageRequest` already accepts `doc_type` but the frontend never sends it. The `ContentApplier` only handles resume operations.

The goal is to add a full cover letter editing experience: an editable canvas, chat-driven LLM editing (auto-apply, no proposals), and separate chat threads per session per document type.

## Goals / Non-Goals

**Goals:**

- Editable cover letter canvas with salutation, paragraphs, closing
- Chat-driven cover letter editing with auto-apply (no proposal/accept step)
- Two separate chat threads per session (resume + cover letter)
- Cover letter generation via button and via chat command
- Use session's selected model for generation (not hardcoded gpt-4o)
- Pass research context to cover letter generation

**Non-Goals:**

- Rich text / formatting for cover letters (plain text only)
- Drag-and-drop reordering of paragraphs
- Proposal/accept pattern for cover letters (LLM edits directly)
- Diff view for cover letter changes
- Separate session or routing — cover letters live inside existing sessions

## Decisions

### D1: Two chats via `doc_type` column on `chat_messages`

**Decision**: Add a `doc_type` column to the `chat_messages` table. Filter messages by `doc_type` when fetching.

**Alternatives considered**:

- Separate `cover_letter_messages` table — rejected: duplicates schema, more joins, harder to extend
- Partition via `metadata_json` — rejected: not queryable, no index, fragile

**Rationale**: `doc_type` is already a first-class concept on `SessionDocument`. Making it a column on `ChatMessage` keeps the model consistent and enables indexed queries.

### D2: Auto-apply for cover letter operations (no proposals)

**Decision**: When `doc_type === "cover_letter"` in the tailor endpoint, parse operations from the LLM response, apply them immediately to the cover letter document, create a new version, and emit a `done` SSE event. No `pending_operations_json`, no `proposal` event.

**Alternatives considered**:

- Reuse proposal pattern — rejected by user: cover letters are lower-stakes, faster iteration preferred
- Direct text replacement (no structured ops) — rejected: structured ops enable paragraph-level targeting and future undo

**Rationale**: The cover letter is short (250-400 words). The user can undo by editing directly. Speed of iteration matters more than review granularity.

### D3: Cover letter content model as structured JSON

**Decision**: Store cover letter as `{ type: "cover_letter", salutation: string, paragraphs: [{id, text}], closing: string }` in `SessionDocument.content_json`.

**Alternatives considered**:

- Flat `{ text: string }` (current) — rejected: can't target individual paragraphs with operations
- Markdown string — rejected: parsing unreliable, no structured operations possible

**Rationale**: Structured JSON enables paragraph-level operations (update, add, delete, reorder) via the same `ContentApplier` pattern the resume uses.

### D4: Streaming indicator tracks `streamingDocType`

**Decision**: Store `streamingDocType` in the session store. Set it when `sendMessage()` starts, clear when SSE completes. The `ChatRail` only shows streaming indicators when `streamingDocType === activeDocType`.

**Rationale**: SSE continues in the background if the user switches tabs. The store processes all events regardless. The UI only shows activity for the currently viewed chat.

### D5: Generate intent detection in frontend

**Decision**: When the user sends a message in the cover letter chat with no existing cover letter, the frontend pattern-matches common phrases ("write a cover letter", "generate", "draft") and calls the generate endpoint. Otherwise, shows a system prompt to generate first.

**Alternatives considered**:

- Backend detects intent — rejected: adds latency, LLM call just to detect "generate"
- Always auto-generate on first cover letter chat message — rejected: user may want to ask questions first

**Rationale**: Simple regex on the frontend avoids an unnecessary LLM call and gives instant feedback.

### D6: Cover letter operations in `ContentApplier`

**Decision**: Add a `CoverLetterContent` Pydantic model and six operations: `update_salutation`, `update_paragraph`, `add_paragraph`, `delete_paragraph`, `reorder_paragraphs`, `update_closing`. The `ContentApplier.apply()` method branches on content type.

**Rationale**: Mirrors the existing resume operation pattern. The applier already deep-clones and applies sequentially.

## Risks / Trade-offs

**[Race condition: user edits + LLM edits same paragraph]** → Last write wins. The editQueue flushes (2s debounce) before the LLM response arrives in most cases. Acceptable for cover letters (short document, user can re-edit).

**[Two chats increase UI complexity]** → Minimal. `ChatMessageList` already renders from a query. Adding a `doc_type` filter is a one-line change. The `ChatRail` component doesn't change structure.

**[Auto-apply means no undo for LLM edits]** → Mitigated by: (1) cover letters are short, (2) user can edit directly to fix, (3) document versioning means old versions exist in the DB. Future work could add an undo button.

**[Existing cover letter documents use flat `{text, type}` format]** → Migration needed. On first access, if `content_json` has the old format, convert to new structured format. Or regenerate.

## Migration Plan

1. Add `doc_type` column to `chat_messages` with default `"resume"` (Alembic migration)
2. Add index on `(session_id, doc_type)` for message queries
3. Existing cover letter documents with `{text, type}` format: handled in application code — if `paragraphs` key is missing, parse the `text` into paragraphs on first load

## Open Questions

- Should the mode bar (plan/edit + polish/refine/rewrite) be hidden or disabled for cover letters? Currently the user said "preserve existing functionality" — so keep it, but the cover letter edit prompt maps these modes to aggressiveness levels.
- Should export work for cover letters? The existing export endpoint exports the latest `SessionDocument` regardless of type. Cover letter JSON would need a different renderer (plain text, not LaTeX).
