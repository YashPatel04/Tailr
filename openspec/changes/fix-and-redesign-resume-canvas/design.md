## Context

The canvas currently uses `@dnd-kit` for drag-and-drop but only bullet-level reorder has optimistic cache updates. Section and entry drags lag due to waiting for the server round-trip. The undo/redo buttons are decorative stubs. Editing uses popup-style `<input>`/`<textarea>` replacements rather than true inline editing. Tooltips are raw `title` attributes. Scrollbar styling is inconsistent. Delete buttons use raw `×` text characters.

The `editQueue.ts` has a critical bug: no session ID on queued edits means switching sessions within the 2s debounce can send edits to the wrong session.

## Goals / Non-Goals

**Goals:**

- Fix drag-and-drop with optimistic updates at all levels (section, entry, bullet)
- Implement undo/redo with command history and keyboard shortcuts
- Fix all non-functional buttons (Add Section/Subsection/Bullet, undo, redo)
- Make Technical Skills rows fully editable and deletable
- Add "+ Add date/location/title" controls for missing subheading fields
- Implement save status indicator (Saved/Saving.../Error)
- Remove "Resume Version —" header and top tab bar
- Implement cover letter generation backend + frontend
- Convert text editing from popup to true inline style
- Standardize delete buttons to red trash icon
- Replace title-attribute tooltips with custom styled tooltips
- Fix sidebar to proper sticky/scroll behavior
- Wire changes/diff view with git-style -/+ diffs
- Apply modern scrollbar styling globally

**Non-Goals:**

- Full CRDT-based collaboration
- Rich text formatting beyond current bold/italic/underline/link
- Mobile responsive design
- Changing the document model or backend API shape (except cover letter + save-state endpoints)

## Decisions

### D1: Undo/redo via command pattern with editQueue integration

**Chosen:** Add a history stack (`past`/`future` arrays) to `editQueue.ts`. Each queued operation batch gets wrapped as a reversible command (stores forward op + inverse op). On undo, send the inverse op via PATCH. On redo, replay the forward op. Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z handled via a global `useEffect` keydown listener.

**Alternatives considered:**

- _Snapshot-based undo (store full document before/after)._ Simpler to implement but memory-intensive for large documents.
- _Full command pattern in individual components._ Would require refactoring every renderer. Centralized in editQueue keeps scope manageable.

### D2: In-place editing via contenteditable overlay

**Chosen:** Replace the current input/textarea swap with a hidden text measurement element that matches font/size/weight, then position an absolutely-positioned input/textarea over the text display. When focused, the displayed text becomes invisible (opacity-0) and the input takes its exact space. On blur/Enter, save and restore display.

**Alternatives considered:**

- _contenteditable div._ Browser behavior varies wildly across platforms; cursor positioning and formatting are notoriously buggy.
- _Full textarea replacement (current approach)._ UX is poor — clicking doesn't feel like editing where you read.

### D3: Save state indicator via editQueue lifecycle hooks

**Chosen:** Add status tracking to `editQueue.ts`: `idle` → `queued` (on queueEdit) → `saving` (on flush start) → `saved` (on response OK) / `error` (on failure). Expose via zustand store (`saveStatus`). A `<SaveIndicator>` component reads this and renders "Saved" with checkmark, "Saving..." with spinner, or "Error saving" with retry.

**No backend changes needed** — the existing PATCH endpoint already handles the save. The indicator is purely a frontend UX overlay on the existing queue→flush→response flow.

### D4: Cover letter generation as a new LLM prompt path

**Chosen:** Add `POST /api/sessions/{id}/generate-cover-letter` endpoint. Takes job description context from the session. Builds a prompt from the user's master resume + job description. Runs through the selected LLM provider. Stores the result as a `cover_letter` document type on the session. Frontend: add a "Generate Cover Letter" button in the Cover Letter tab area, show the result in a read-only canvas view.

### D5: Consistent delete buttons

**Chosen:** Replace all `×` text and `× Delete` labels with a single `<Trash2>` lucide icon in red, 16px, with a consistent `opacity-0 group-hover:opacity-100` pattern. Use a shared `<DeleteButton>` component.

### D6: Custom tooltips via the existing Tooltip component

**Chosen:** Import and use the existing `Tooltip.tsx` component (already defined but unused) across all interactive elements. Replace `title` attributes with `<Tooltip>` wrappers. The component uses `onMouseEnter`/`onMouseLeave` with a 100ms hide delay, positioned to the right of the element.

### D7: Sidebar stickiness via position sticky

**Chosen:** Change the sidebar from `flex flex-col h-screen` to `sticky top-0 h-screen` within the main layout container. The main content area scrolls naturally with the page, and the sidebar stays in view.

### D8: Diff view wiring

**Chosen:** The `DiffView` context provider and `useDiff` hook are already implemented and functional. The missing piece is that `DiffActions`, `DiffMark`, and `ApplyToMasterButton` are dead code. Wire them into `DocumentCanvas` when `viewMode === "diff"`:

- `ChangesSummary` already shows counts
- `DiffMark` wraps each changed node with colored left-border indicators
- `DiffActions` provides Accept/Reject controls
- `ApplyToMasterButton` allows pushing individual changes to master resume

## Risks / Trade-offs

- **[Risk] Undo/redo command stack grows unbounded.** Mitigation: Cap history at 50 entries, discard oldest.
- **[Risk] In-place editing cursor positioning may be off for certain fonts.** Mitigation: Use a hidden span with matching computed styles for measurement.
- **[Risk] Cover letter generation may produce poor quality with untuned prompts.** Mitigation: Use the same LLM provider configuration as tailoring; prompt quality iterated in follow-up.
- **[Risk] Edits sent to wrong session if session switching within debounce window.** Mitigation: Attach sessionId to each queued op; only flush ops matching current session.
