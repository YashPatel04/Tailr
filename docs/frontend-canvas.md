# Frontend Canvas — How the Resume is Displayed

## Component Tree

```
DocumentCanvas
  ├── DocumentTopBar           (cover letter, save indicator)
  ├── DiffView [conditional]   (wraps content when viewMode === "diff")
  │   └── DiffActions          (accept/reject proposal)
  │   └── ChangesSummary       (collapsible change list: added/removed/modified)
  ├── ResumeHeader             (basics: name, contact, profiles — all double-click-to-edit)
  ├── SortableSection          (DnD wrapper, grip handle on hover)
  │   └── SectionRenderer
  │       ├── Section label    (h2, editable via EditableField)
  │       ├── SortableEntry    (DnD wrapper, grip handle on hover)
  │       │   └── EntryRenderer
  │       │       ├── Title    (bold, rich-text editable)
  │       │       ├── Dates    (right-aligned, italic, plain-text editable)
  │       │       ├── Role + Location   (justify-between, italic row)
  │       │       ├── Organization + URL link
  │       │       ├── URL inline editor (plain text, shown as link, double-click-to-edit)
  │       │       ├── AddFieldButton   (for missing dates/role/location/organization)
  │       │       ├── SortableBullet    (DnD wrapper)
  │       │       │   └── BulletRenderer  (rich text with spans + DeleteButton)
  │       │       └── + Bullet button   (visible on hover)
  │       └── SkillRowRenderer  (category + items, both editable via RichEditableField)
  ├── BottomInsert             (add section / subsection / skill row at document end)
  └── FloatingToolbar          (undo, redo, add buttons — scrolls with content)
```

## Key Components

- **DocumentCanvas** — Top-level orchestrator. Reads `activeSessionId`, `activeDocType`, and `viewMode` from the Zustand session store. Fetches document data via `useSessionDocument` (React Query). Decides whether to render new `ResumeContent` (sections/entries/bullets) or legacy `documentModel` (tree nodes). Handles section-level drag-and-drop via `@dnd-kit`. Initializes edit queue history on session change.

- **ResumeHeader** — Renders `basics.name` as a centered `<h1>` and contact details (location, phone, email, profiles) in a single `space-x-2` paragraph. All fields use `LinkableField` (double-click to edit, no navigation) — emails no longer render as `mailto:` links. Profiles are editable inline.

- **SectionRenderer** — Dual-mode component. For the new data model (`Section` type), it renders an editable `<h2>` heading, then dispatches to `EntryRenderer` per entry (wrapped in `SortableEntry` DnD) and `SkillRowRenderer` per skill row. For legacy document model nodes, it renders children by `type` (`entry`, `bullet`, `text`, `section`, `opaque`) and offers a "tex" toggle button to show raw LaTeX source.

- **EntryRenderer** — Renders work/education experience entries. Line 1: **bold title** (rich-text) \| right-aligned *italic dates* (plain-text). Line 2 (optional): *italic role* (rich-text) \| right-aligned *italic location* (plain-text). Line 3 (optional): organization name (plain-text) \| URL as a truncated clickable link. An `AddFieldButton` appears for empty fields (dates, role, location, organization). Below: bullet list with DnD reordering, `DeleteButton` (Trash2 icon) on each bullet, and an "Add Bullet" button that appears on hover.

- **BulletRenderer** — Renders a `<li>` with `list-disc` styling. In the new model, the bullet text is editable via `RichEditableField` (click-to-edit with formatting toolbar). Each bullet has a `DeleteButton` (Trash2 icon) that appears on hover. Diff highlights use green/red backgrounds for added/removed items.

- **FormattedText** — Splits raw text into segments at span boundaries, then applies CSS classes: `font-bold`, `italic`, `underline`, or `font-mono text-sm bg-slate/10 px-1 rounded` for code. When there are no spans, it renders the text directly without wrapping `<span>` elements.

- **SkillRowRenderer** — Renders a skill row with `RichEditableField` for both the category label and items list, with a `DeleteButton` on hover. Edits queue optimistic updates via `editQueue` using `update_skill_row` / `delete_skill_row` operations.

- **SortableSection / SortableEntry / SortableBullet** — Thin DnD wrappers around their respective renderers using `@dnd-kit/sortable`. Each renders a `GripVertical` icon that is hidden by default and fades in on group hover. DnD is disabled when `viewMode === "diff"`. Dragging items shows reduced opacity.

- **DeleteButton** — Shared `Trash2` icon button (lucide-react) used uniformly across sections, entries, bullets, and skill rows. Hidden in diff view.

- **AddFieldButton** — "+ Add ..." button for missing entry fields (dates, role, location, organization). Visible on hover, hidden in diff view.

- **DocumentTopBar** — Top bar area. Contains the save status indicator (`SaveIndicator`) and the "Cover Letter" generate button. No "Resume" heading or version number.

- **FloatingToolbar** — Vertical toolbar with undo/redo buttons and add-section/entry/bullet dropdown. Polls `canUndo`/`canRedo` to disable buttons appropriately. Positioned beside the resume content, scrolls with the document.

- **SaveIndicator** — Shows save status: idle (nothing), queued/saving (animated spinner), saved (checkmark fades after 3s), error (retry button). Reads `saveStatus` from session store.

- **BottomInsert** — "+ Insert" button at the bottom of the document with a dropdown to add a section, subsection, or skill row. Sends direct `PATCH` calls (not queued). Hidden in diff view.

## Rich Text Editing

- **RichEditableField** — Click-to-edit that replaces the display text with a `<textarea>` and a formatting toolbar above it (Bold / Italic / Underline / Code, using `lucide-react` icons). Supports keyboard shortcuts: `Ctrl+B`, `Ctrl+I`, `Ctrl+U`. Enter commits, Escape cancels. Span annotations are tracked as `{ start, end, formats, link_url }` objects.

- **EditableField** — Plain-text fallback for simple fields like dates, section labels, locations, and organization names. Renders an `<input>` on click, commits on Enter or blur, cancels on Escape. Editing is disabled when `viewMode === "diff"`.

- **Span tracking**: When the user selects text in the textarea and clicks a format button, the component reads `selectionStart`/`selectionEnd` from the textarea ref and creates or toggles a span at those offsets. Existing overlapping spans are merged or removed.

## Edit Queue

All manual edits go through a debounced queue (`editQueue.ts`):

- React Query cache is updated **optimistically** (instant visual feedback).
- Operations are queued locally with session scoping.
- After **2 seconds of inactivity**, the queue flushes all pending ops in a single `PATCH` request.
- `saveStatus` tracks: `idle` → `saving` → `saved` (auto-clears after 3s) / `error`.
- Undo/redo history: command stack (max 50), Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts, toolbar buttons.

## Drag-and-Drop

- Library: `@dnd-kit/core` + `@dnd-kit/sortable`
- Three levels: sections (top-level in DocumentCanvas), entries (within a section in SectionRenderer), bullets (within an entry in EntryRenderer)
- Each level uses its own `<DndContext>` with `closestCenter` collision detection and `verticalListSortingStrategy`
- Drag handlers call `queueEdit()` immediately with the operation (`move_section`, `move_entry`, `reorder_bullets`) and update React Query cache optimistically
- Smooth CSS transitions via `transition-transform duration-200 ease-in-out` on Sortable wrappers
- All DnD is disabled when `viewMode === "diff"`

## Diff / Changes View

- The `DiffView` component provides a React Context (`DiffContext`) with a `getDiffState(nodeId)` function. Any child component can call `useDiff(id)` to check if its node is added, removed, or modified.
- The `ChangesSummary` panel is a collapsible section with color-coded counts: green for additions, red for removals, blue for modifications.
- Modified changes show old and new values side-by-side in a two-column grid (old with red background + strikethrough, new with green background).
- Paths are humanized: `sections[0].entries[2].bullets[1].text` becomes "Section 0 > Entry 2 > Bullet 1.text".
- Inline diff highlighting: added nodes get `bg-green-50` with rounded corners; removed nodes get `bg-red-50` with rounded corners.
