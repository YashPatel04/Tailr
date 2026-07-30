## Why

The resume canvas has significant UX regressions (drag-drop broken, undo non-functional, add buttons dead, link editing broken, skill rows uneditable) and lacks productivity features that make manual editing viable. Users get no value from the canvas without AI — it needs to feel like a Notion-style document editor with smooth in-place editing, consistent controls, and real-time save feedback.

## What Changes

**Bug fixes:**
- Fix drag-and-drop: add optimistic cache updates for section/entry reorder, smooth animation
- Fix Add Section/Subsection/Bullet buttons: wire click handlers, rename to consistent labels
- Implement undo/redo: command history stack with Ctrl+Z / Ctrl+Shift+Z support
- Fix link editing: prevent navigation when clicking links in editable fields
- Make Technical Skills rows editable (category, items), deletable, and reorderable
- Add "+ Add date", "+ Add location", "+ Add title" controls for missing subheading fields across all section types

**New features:**
- Save status indicator (Saved/Saving.../Error) persisted after every change, with backend save-state tracking
- Remove "Resume Version —" header and "Resume" label entirely from canvas
- Cover letter generation: backend endpoint + frontend UI for AI-generated cover letters
- In-place text editing: replace popup input/textarea with true inline editing (contenteditable or overlay input matching text size)
- Remove top tab bar (Resume/Cover Letter tab strip above canvas)
- Standardize delete buttons: red trash/bin icon, consistent size everywhere
- Custom-styled tooltips replacing browser default title attributes
- Sidebar: proper sticky scrolling behavior within page scroll
- Changes/diff view: render git-style +green/-red diffs instead of just final content
- Scrollbar styling: modern, minimal, dark, curved scrollbars globally

## Capabilities

### New Capabilities
- `cover-letter-generation`: Backend endpoint and frontend UI for generating cover letters from session context
- `save-state-indicator`: Save/Saving/Error status tracking in edit queue with UI indicator
- `undo-redo`: Command history stack for canvas edits with keyboard shortcuts

### Modified Capabilities
None — existing specs are empty; this is a net-new capability set.

## Impact

- **Frontend** (~20 files): DocumentCanvas, all renderers (Section, Entry, Bullet, SkillRow), FloatingToolbar, EditableField/RichEditableField, ResumeHeader, Sidebar, DocumentTopBar, editQueue, sessionStore, globals.css, Tooltip
- **Backend** (2-3 files): New cover letter endpoint, save-state endpoint, potentially export endpoint updates
- No database migrations needed
- No new npm/poetry dependencies
