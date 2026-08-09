## 1. Fix editQueue foundation (blocker for undo/redo + save indicator)

- [x] 1.1 Attach sessionId to each queued edit op; flush only ops matching current session
- [x] 1.2 Add save status tracking (idle/queued/saving/saved/error) to editQueue
- [x] 1.3 Expose `saveStatus` and `setSaveStatus` in sessionStore.ts

## 2. Fix drag-and-drop (optimistic updates + animation)

- [x] 2.1 Add optimistic cache update for section reorder in DocumentCanvas handleDragEnd
- [x] 2.2 Add optimistic cache update for entry reorder in SectionRenderer handleDragEnd
- [x] 2.3 Add smooth CSS transition to SortableSection/SortableEntry/SortableBullet wrappers

## 3. Implement undo/redo

- [x] 3.1 Add command history (past/future stacks, max 50) to editQueue.ts
- [x] 3.2 Implement `undo()` and `redo()` functions that send inverse/forward ops via PATCH
- [x] 3.3 Add global Ctrl+Z / Ctrl+Shift+Z keyboard listener in DocumentCanvas
- [x] 3.4 Wire FloatingToolbar undo/redo buttons with onClick and disabled states
- [x] 3.5 Clear redo stack when new edit is queued (not undo/redo)

## 4. Remove dead/residual UI elements

- [x] 4.1 Remove "Resume Version —" header from DocumentTopBar
- [x] 4.2 Remove DocumentTabs component and its import from DocumentCanvas
- [x] 4.3 Delete unused DocumentToolbar.tsx file

## 5. Fix Add Section/Subsection/Bullet buttons

- [x] 5.1 Wire FloatingToolbar insert button to show dropdown with Add Section/Add Subsection/Add Bullet
- [x] 5.2 Implement addSection/addEntry/addBullet operations in editQueue (or direct API calls)
- [x] 5.3 Rename labels: "Add Section", "Add Subsection", "Add Bullet" (not "entry")
- [x] 5.4 Make BottomInsert component functional with same three options

## 6. Standardize delete buttons

- [x] 6.1 Create shared `DeleteButton.tsx` component (red Trash2 icon, 16px, opacity-0 group-hover:opacity-100)
- [x] 6.2 Replace section delete `× Delete` with `<DeleteButton>`
- [x] 6.3 Replace entry delete `×` with `<DeleteButton>`
- [x] 6.4 Replace bullet delete `×` with `<DeleteButton>`
- [x] 6.5 Add delete button to SkillRowRenderer

## 7. Replace title-attribute tooltips with custom Tooltip

- [x] 7.1 Fix Tooltip.tsx to support configurable position (top/bottom/left/right)
- [x] 7.2 Replace all `title="..."` attributes on buttons with `<Tooltip>` wrappers
- [x] 7.3 Add tooltips to: delete buttons, undo/redo, format buttons, add buttons, export buttons
- [x] 7.4 Style tooltips consistently: bg-[#2b2b2b], white text, 12px, rounded, no animation

## 8. In-place text editing (Notion-style)

- [x] 8.1 Add hidden measurement span to EditableField for width-matching input
- [x] 8.2 Replace input/textarea swap with absolutely-positioned input overlaid on display text
- [x] 8.3 Apply same pattern to RichEditableField for title/dates/role/location fields
- [x] 8.4 Ensure cursor positioning and text alignment match display text exactly
- [x] 8.5 Preserve formatting toolbar behavior (Ctrl+B/I/U/K) during inline editing

## 9. Fix link editing in header/name area

- [x] 9.1 In ResumeHeader, prevent default navigation on link click; open in edit mode instead
- [x] 9.2 In EntryRenderer URL field, prevent navigation on click; open for editing

## 10. Make Technical Skills rows editable

- [x] 10.1 Add RichEditableField for `category` in SkillRowRenderer
- [x] 10.2 Add RichEditableField for `items` in SkillRowRenderer
- [x] 10.3 Add delete button to SkillRowRenderer
- [x] 10.4 Add drag handle and reorder support for skill rows within section

## 11. Add "+ Add" controls for missing subheading fields

- [x] 11.1 Create `AddFieldButton` component (small "+ Add date", "+ Add location", "+ Add title" buttons)
- [x] 11.2 Render AddFieldButton for missing `dates` in EntryRenderer
- [x] 11.3 Render AddFieldButton for missing `location` in EntryRenderer
- [x] 11.4 Render AddFieldButton for missing `role`/`organization` in EntryRenderer
- [x] 11.5 On click, insert empty string as field value and enter edit mode
- [x] 11.6 Apply to all section types: Experience, Research, Projects, custom sections

## 12. Save status indicator

- [x] 12.1 Create `SaveIndicator.tsx` component reading `saveStatus` from sessionStore
- [x] 12.2 Render "Saving..." with spinner when status is `queued` or `saving`
- [x] 12.3 Render "Saved" with checkmark when status is `saved` (fade after 3s to muted)
- [x] 12.4 Render "Error saving" in red with retry button when status is `error`
- [x] 12.5 Place SaveIndicator in DocumentTopBar, aligned right

## 13. Cover letter generation

- [x] 13.1 Backend: Add `POST /api/sessions/{id}/generate-cover-letter` endpoint
- [x] 13.2 Backend: Build cover letter prompt from master resume + job description
- [x] 13.3 Backend: Stream cover letter via SSE using existing LLM provider
- [x] 13.4 Frontend: Add "Generate Cover Letter" button when cover_letter tab is active
- [x] 13.5 Frontend: Display generated cover letter in read-only text view in canvas

## 14. Fix sidebar stickiness

- [x] 14.1 Change sidebar from `flex h-screen` to `sticky top-0 h-screen`
- [x] 14.2 Ensure main content area scrolls naturally, sidebar stays fixed in viewport
- [x] 14.3 Test with long content (many sections/entries) that sidebar doesn't scroll off screen

## 15. Wire changes/diff view

- [x] 15.1 Wire `ChangesSummary` into DocumentCanvas diff mode (show added/removed/modified counts)
- [x] 15.2 Wire `DiffMark` wrappers into SectionRenderer, EntryRenderer, BulletRenderer
- [x] 15.3 Wire `DiffActions` (Accept all / Reject all) into diff mode toolbar
- [x] 15.4 Wire `ApplyToMasterButton` for individual change application
- [x] 15.5 Render git-style +green/-red inline diffs using existing wordDiff utility

## 16. Scrollbar styling

- [x] 16.1 Add `scrollbar-thin` class to DocumentCanvas scroll container
- [x] 16.2 Add global `* { scrollbar-width: thin }` fallback in globals.css
- [x] 16.3 Ensure all scrollbars have the dark, thin, no-arrows appearance across the app

## 17. Verification

- [x] 17.1 Run `npm run lint` in frontend/ — fix any ESLint/Prettier errors
- [x] 17.2 Run `npm test` in frontend/ — fix any broken tests
- [x] 17.3 Run `poetry run ruff check . && poetry run ruff format --check .` in backend/
- [x] 17.4 Run `poetry run pytest` in backend/ — ensure no regressions
