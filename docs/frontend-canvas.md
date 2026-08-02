# Frontend Canvas — How the Resume is Displayed

## Component Tree

```
SessionPage (app/(app)/session/[id]/page.tsx)
  └── DocumentCanvas
        ├── InlineFormatToolbar           (global, positioned over the active editable field)
        ├── DocumentTopBar
        │     ├── DocumentTabs            (Resume | Cover Letter segmented control)
        │     ├── view-mode toggle        (Changes | Current) — resume only
        │     └── Export dropdown         (.pdf .docx .txt .tex for resume; .pdf .docx for cover letter)
        ├── [viewMode === "changes"] DiffProvider
        │     └── DiffOverlay             (Accept all / Reject all — shown only if snapshot && changeCount > 0)
        ├── ResumeHeader                  (name, location, phone, email, profiles — double-click to edit)
        ├── DndContext (sections) > SortableContext
        │     └── SortableSection ×n
        │           └── SectionRenderer   (label h2, entries list, skill rows list)
        │                 ├── DndContext (entries) > SortableContext
        │                 │     └── SortableEntry ×n
        │                 │           └── EntryRenderer
        │                 │                 ├── RichEditableField (title / dates / role-or-org / location)
        │                 │                 ├── AddFieldButton (Date / Role / Location / URL)
        │                 │                 ├── DeleteButton
        │                 │                 ├── DndContext (bullets) > SortableContext
        │                 │                 │     └── SortableBullet ×n → BulletRenderer
        │                 │                 └── + Bullet button (visible on hover)
        │                 └── DndContext (skill rows) > SortableContext
        │                       └── SortableSkillRow ×n
        │                             └── SkillRowRenderer (RichEditableField ×2 + DeleteButton)
        └── BottomInsert                  (local function inside DocumentCanvas.tsx — + Insert)
        └── [cover letter] CoverLetterCanvas (salutation, paragraphs, closing; generate button)
```

The session screen is composed by `AppShell`: `Sidebar` on the left, the page (`SessionPage`
→ `DocumentCanvas`) in the middle, and `ChatRail` on the right (see Session Page & Chat Rail).

## Key Components

- **SessionPage** — Client page for `/session/[id]`. Calls `setActiveSession(id)` on mount and
  `setActiveSession(null)` on unmount (which also resets `pendingProposal`, `snapshot`, and
  `viewMode`). Redirects to `/dashboard` when `useSession` reports an error. Renders `DocumentCanvas`.

- **DocumentCanvas** — Top-level orchestrator. Reads `activeSessionId`, `activeDocType`, and
  `viewMode` from the Zustand session store. Fetches the document via `useSessionDocument`, the
  session via `useSession`, and the master resume via `useMasterResume` (all React Query). In
  `viewMode === "changes"` it computes a diff `Map` between the master resume and the session
  content with `computeFieldDiffs`. Clears undo/redo history (`clearHistory()`) on session change
  and registers the global Ctrl+Z / Ctrl+Shift+Z undo/redo handler. Handles section-level
  drag-and-drop via `@dnd-kit`. Renders `InlineFormatToolbar`, `DocumentTopBar`, then either
  `CoverLetterCanvas` (when `activeDocType === "cover_letter"`), the section tree wrapped in
  `DiffProvider` + `DiffOverlay` (resume in `viewMode === "changes"`), or an empty-state message
  when the resume has no sections. `BottomInsert` is a local component defined in this file
  (there is no separate `BottomInsert.tsx`).

- **DocumentTopBar** — Sticky bar above the document. Left side: `DocumentTabs`. Right side: a
  view-mode toggle ("Changes" / "Current") that is only rendered for the resume doc type (it
  collapses to zero width for cover letters), and an "Export" dropdown. The "Changes" button shows
  a brass count badge when `changeCount > 0`. Export downloads the blob from
  `GET /api/sessions/:id/export?format=...&doc_type=...` and saves it as `resume.<format>` or
  `cover_letter.<format>`. Formats: `pdf`, `docx`, `txt`, `tex` for resume; `pdf`, `docx` for
  cover letter. It does **not** render a save-status indicator or a "Resume" heading/version.

- **DocumentTabs** — Segmented pill control switching `activeDocType` between `"resume"` and
  `"cover_letter"` with an animated highlight. Both tabs are always rendered; the Cover Letter tab
  shows a small amber dot when `session.has_cover_letter` is falsy.

- **CoverLetterCanvas** — Renders the cover letter document. Normalizes `content` into
  `{ type, salutation, paragraphs: [{id, text}], closing }`, folding a legacy `{ text, type }`
  payload into a single `paragraphs` entry with id `"legacy"`. With no content it shows a
  "Generate Cover Letter" button that POSTs to `/api/sessions/:id/generate-cover-letter`. With
  content it renders salutation, paragraphs, and closing as `EditableField`s; "Paragraph" divider
  buttons queue `add_paragraph`. Edits queue `update_salutation` / `update_paragraph` /
  `update_closing`. No diff view and no drag-and-drop.

- **ResumeHeader** — Renders `basics.name` as a centered `<h1>` and location, phone, email, and
  profiles in a wrapping row. Name, location, phone, and email use the local `LinkableField`
  (double-click to edit, commits on Enter/blur, cancels on Escape; email is styled as a blue
  link-like span, not a `mailto:`). Profiles are `<a>` links that open in a new tab; double-clicking
  one prompts for a new username and queues an `update_basics_field` for the profiles array. In
  `viewMode === "changes"` each field shows a colored gutter glyph (`+` / `–` / `~`) from
  `useFieldChanges("basics:name")` etc.

- **SectionRenderer** — Renders a single new-model `Section` (returns `null` without one; there is
  no legacy node rendering and no "tex" toggle). Editable `<h2>` section label via `EditableField`,
  a `DeleteButton` when not in changes view, an entries `DndContext` (each entry in `SortableEntry`)
  and a skill-rows `DndContext` (each row in `SortableSkillRow`), plus a hover-only "+ Add skill row"
  button. Drag handlers queue `move_entry` / `move_skill_row`. Section label and metadata diffs are
  surfaced through `useFieldChanges(section.id)`.

- **EntryRenderer** — Renders a work/education entry. Row 1: **bold title** (rich-text) to the
  left; _italic dates_ (rich-text, right-aligned) with a `DeleteButton` beside them. Row 2
  (justify-between): role _or_ organization (when role is null) as rich-text on the left; location
  (rich-text) and the entry URL on the right. The URL is a button that swaps into an inline editor
  with two inputs (URL key and display label) and queues `update_entry_urls`. An `AddFieldButton`
  ("Date", "Role", "Location", "URL") appears for missing fields. Bullets render inside their own
  `DndContext` with `SortableBullet` wrappers, and a hover-only "+ Bullet" button appends a new
  bullet. Drag handlers queue `reorder_bullets` (a permuted index array). Field edits queue
  `update_field`; delete queues `delete_entry`.

- **BulletRenderer** — Renders a `<li>` with `list-disc` styling. In edit mode the text is editable
  via `RichEditableField` (spans preserved); a `DeleteButton` (Trash2) appears on hover. In
  `viewMode === "changes"` a modified bullet renders a word-level diff via `wordDiff` (removed words
  red with strikethrough, added words green). Added/removed/modified bullets get a 3px colored left
  border and a gutter glyph.

- **FormattedText** — Splits text at span boundaries and applies `font-bold`, `italic`, `underline`,
  or `font-mono text-sm bg-slate/10 px-1 rounded` (code) classes. With no spans it renders the raw
  text directly.

- **SkillRowRenderer** — Renders `category:` then `items`, both via `RichEditableField`, with a
  `DeleteButton` on hover. Edits update the React Query cache optimistically and queue
  `update_skill_row`; delete queues `delete_skill_row`.

- **SortableSection / SortableEntry / SortableBullet / SortableSkillRow** — Thin `@dnd-kit/sortable`
  wrappers. Each renders a `GripVertical` handle hidden by default and faded in on group hover, and
  drops to `opacity-50` while dragging. Sorting is disabled when `viewMode === "changes"` or while
  an editable field is active (`editingFieldId !== null`).

- **DeleteButton** — Shared `Trash2` icon button (lucide-react) used across sections, entries,
  bullets, and skill rows. It fades in on group hover; parents only render it outside the changes view.

- **AddFieldButton** — "+ <label>" button that sets a placeholder field value (" "), updates the
  cache, and queues an `update_field` so the field becomes editable.

- **BottomInsert** — "+ Insert" button at the bottom of the resume, visible on page hover, with a
  dropdown: Add Section / Add Subsection / Add Skill Row. It sends direct `PATCH` operations
  (`add_section`, `add_entry`, `add_skill_row`) rather than queued edits, then invalidates the
  document query. Rendered only when the resume has content and `viewMode !== "changes"`; not
  rendered for cover letters.

## Rich Text Editing

- **RichEditableField** — Click-to-edit contentEditable element (used for titles, roles, dates,
  locations, bullets, and skill rows). On entering edit mode it registers itself as the format
  target via `registerFormatTarget` and the global `InlineFormatToolbar` is positioned above it.
  Keyboard shortcuts: Ctrl+B / Ctrl+I / Ctrl+U toggle format, Ctrl+K adds a link (via `prompt`).
  Enter commits (unless Shift or `isBullet`), Escape cancels. Formats are tracked as span
  annotations `{ start, end, formats, link_url }`. Committing calls `onSave(text, spans)`.

- **EditableField** — Plain-text contentEditable used for simple fields (section labels, cover
  letter salutation/paragraphs/closing). Click or double-click to edit; commits on Enter or blur
  (including click-outside, ignoring clicks inside the inline toolbar), cancels on Escape. Editing
  is disabled in `viewMode === "changes"`.

- **InlineFormatToolbar** — Single global toolbar (rendered once by `DocumentCanvas`) that appears
  above whichever field is active (`editingFieldId` in the session store). Provides Bold / Italic /
  Underline buttons plus a Link button with a URL input. It applies formatting via
  `document.execCommand` to the active contentEditable field.

- **Span tracking** — When a format shortcut fires, `RichEditableField` reads the selection offsets
  via `getSelectionOffsets` and toggles a span at those offsets with `toggleInlineFormat`
  (`setLinkUrl` for links); overlapping spans are merged/removed.

## Edit Queue

All manual edits go through a debounced queue (`lib/editQueue.ts`):

- React Query cache is updated **optimistically** (instant visual feedback).
- Operations are queued locally with session scoping; `saveStatus` becomes `"queued"`.
- After **2 seconds of inactivity**, `flushEdits` sends all queued ops for the active session in a
  single `PATCH` to `/api/sessions/:id/document` (with `doc_type`), then sets `saveStatus` to
  `"saved"` (auto-clears to `"idle"` after 3s). On failure it re-queues and sets `"error"`;
  `retrySave()` forces a flush.
- Undo/redo: a command stack (max 50) records flushed ops; `undo()`/`redo()` PATCH the recorded
  inverse/forward ops. Keyboard shortcuts Ctrl+Z (undo) and Ctrl+Shift+Z (redo) are registered
  globally by `DocumentCanvas`. History is cleared via `clearHistory()` on session change.
  `getUndoCount` / `getRedoCount` exist but are not consumed by any component (no toolbar buttons).

## Drag-and-Drop

- Library: `@dnd-kit/core` + `@dnd-kit/sortable` (with `@dnd-kit/utilities`).
- Four levels, each with its own `<DndContext>` using `closestCenter` collision detection and
  `verticalListSortingStrategy`: sections (DocumentCanvas), entries (SectionRenderer), skill rows
  (SectionRenderer), and bullets (EntryRenderer).
- Drag handlers update the React Query cache optimistically and queue an operation immediately:
  `move_section`, `move_entry`, `move_skill_row`, `reorder_bullets`.
- Smooth CSS transitions via `transition-transform duration-200 ease-in-out` on the sortable
  wrappers; the dragged item renders at `opacity-50`.
- All DnD is disabled when `viewMode === "changes"` or while a field is being edited.

## Diff / Changes View

- **View mode** is `"changes"` or `"final"` (not "diff"). The toggle lives in `DocumentTopBar` and
  only exists for the resume doc type. Diff data is a `Map<string, DiffChange>` built by
  `computeFieldDiffs(masterContent, content)` keyed by stable IDs, e.g. `basics:name`,
  `s:<sectionId>`, `e:<entryId>`, `b:<bulletId>`, and field keys such as
  `s:<sectionId>:e:<entryId>:f:title`.
- **DiffProvider** (`components/diff/DiffContext.tsx`) supplies the changes map and the
  `getFieldChange` lookup. Hooks: `useFieldChanges(key)`, `useFieldChangesAny(...keys)`, and
  `useAllChanges()`. `DocumentCanvas` wraps the resume tree in `DiffProvider` when
  `viewMode === "changes"` and content exists.
- **DiffOverlay** (`components/diff/DiffOverlay.tsx`) renders the "Accept all" / "Reject all"
  buttons above the document, but only when a `snapshot` exists in the session store and
  `changeCount > 0`. Accept-all calls `clearSnapshot()` locally (no API call) and toasts "Changes
  accepted". Reject-all PATCHes `{ operations: [{ op: "set_content", content: snapshot }] }` —
  `set_content` is not a backend operation, so this request does not succeed; the flow is broken.
- The **snapshot** is the pre-proposal document: it is captured by the session store when an SSE
  `proposal` event arrives and the current document exists, and is cleared by accept-all, by
  proposal accept/decline, and whenever a new session is activated.
- **Inline diff highlighting**: added/removed/modified nodes get a 3px colored left border (green /
  red / amber) plus a monospace gutter glyph (`+` / `–` / `~`). Modified entry fields get a
  background tint (`bg-[#fef7e0]` / `bg-[#e6f4ea]`). Modified bullets render a word-level diff with
  red strikethrough for removed words and green highlights for added words.
- **Proposal flow**: the SSE `proposal` event also stores a `pendingProposal` in the session store;
  `EnhancedProposal` in the chat rail can accept (POST `/proposal/accept`, clears snapshot, returns
  to `final` view), decline (POST `/proposal/decline`), or jump to the changes view.

## Session Page & Chat Rail

The chat rail (right side of the session screen) is rendered by `AppShell` and composed in
`components/chat/ChatRail.tsx`:

- **ChatRail** — Shows `JDSetupForm` while `setupOpen` (new-session onboarding: paste JD or URL,
  analyze, then create a session and route to `/session/:id`), `ChatRailEmptyState` when no session
  is active, otherwise the full chat. Supports collapsing to a thin strip with a hover "peek"
  overlay of the last few messages. Intercepts cover-letter generation requests in the cover
  letter view before sending to chat.
- **ChatRailHeader** — Session company/role, `ModelPicker` (searchable provider/model dropdown;
  selection PATCHes `current_provider_id`/`current_model`), collapse button, and an archive /
  unarchive menu.
- **ChatMessageList** — Scrollable list of `ChatMessage`s, a live `ProgressMessage` while
  streaming, and `EnhancedProposal` when a proposal is pending (resume view only).
- **ChatMessage** — User messages as plain text; assistant messages rendered with `react-markdown`.
  Messages whose `metadata_json.phase` matches `ProgressMessage`'s phases render as progress pills.
- **ModeBar** — Plan / Edit toggle plus polish / refine / rewrite tailoring pills; these are sent
  with each message (`mode`, `tailoring_mode`).
- **ChatInput** — Auto-growing textarea; Enter sends, Shift+Enter newline; disabled while
  streaming. Sending goes through `sendMessage` in the session store, which POSTs to
  `/api/sessions/:id/chat` and consumes the SSE stream (`researching` → `thinking` → `writing` →
  `proposal` → `done`).

## Removed / Dead Code

- **DiffView / DiffActions / ChangesSummary / FloatingToolbar** no longer exist. The diff UI is
  `DiffProvider` + `DiffOverlay` rendered by `DocumentCanvas` in `viewMode === "changes"`; there is
  no collapsible change list, no humanized path panel, and no floating undo/redo toolbar.
- **SaveIndicator** (`components/document/SaveIndicator.tsx`) is dead — nothing imports it, and
  `DocumentTopBar` does not render a save-status indicator. Save status (`saveStatus` from the
  session store) is only consumed indirectly through `retrySave`.
- **ImportReview** (`components/import/ImportReview.tsx`) is dead — nothing imports it. Its intended
  behavior is a full-screen review of an imported resume: toggle between original and generated TeX
  source, show section/entry/skill-row counts, and `onAccept(content)` or `onReject()`. It is not
  wired into any route or flow.
