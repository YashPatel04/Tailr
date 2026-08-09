## Why

The document-model-overlay backend work introduced a v2 Region tree pipeline that correctly parses LaTeX into typed entries with populated fields. However, the old tailor endpoint still converts v2 trees to the legacy DocNode format via `doc_node_from_dict()`, which strips all entry-level fields (title, dates, organization). Every session immediately breaks on auto-tailor: the canvas renders bullets without entry headers, entry titles render as empty strings, and five other UX bugs compound the broken experience.

## What Changes

- **Fix tailor degradation.** After the LLM applies ops via the old applier and produces new `tex_source`, re-parse the result through the v2 `parse_resume()` pipeline before storing. This restores entry fields (title, dates, organization, role, location) in the persisted document model.
- **Fix duplicate auto-tailor submission.** Remove the reactive `useEffect` in `ChatRail.tsx`; instead, `SessionSetupForm` directly sends the initial tailor message after successful session creation. One create = one tailor message.
- **Fix export docx/txt.** Both exporters currently dump raw LaTeX source lines as paragraphs. Rewrite them to walk the document model tree and emit formatted content (headings, bold text, bullet formatting).
- **Wire the changes/final diff view.** The `viewMode` store value is set but never consumed by the canvas. Store the diff from the SSE `done` event and conditionally render `DiffView` when `viewMode === "diff"`.
- **Fix empty state message.** `DocumentEmptyState` unconditionally prompts to upload a master resume. Check `useMasterResume()` and show a welcome-back variant when a master resume exists.
- **Fix dark mode user message bubble.** User message background `dark:bg-[#212121]` matches the chat panel background `dark:bg-[#212121]`, making the bubble invisible. Change to a contrasting shade.

## Capabilities

### Modified Capabilities

- `llm-integration`: Tailor endpoint now re-parses the LLM-modified tex through the v2 pipeline before persisting, ensuring stored document models always hold a valid Region tree with populated entry fields.
- `doc-compilation`: DOCX and TXT exporters now emit from the typed Region tree instead of dumping raw LaTeX source lines.

### New Capabilities

None — this is purely a bugfix change.

## Impact

- **Backend (2 files):** `api/tailor.py` (re-parse after LLM apply), `api/export.py` (tree-walk for docx/txt)
- **Frontend (5 files):** `ChatRail.tsx` (remove autoTailor useEffect), `SessionSetupForm.tsx` (direct send after create), `DocumentCanvas.tsx` (wire diff view), `ChatMessage.tsx` (dark bubble color), `DocumentEmptyState.tsx` (check master resume)
- No database migrations needed
- No new dependencies
- No breaking changes to APIs or stores
