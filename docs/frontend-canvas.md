# Frontend Canvas — How the Resume is Displayed

## Component Tree

```
DocumentCanvas
  ├── DocumentToolbar          (export, view toggle controls)
  ├── DocumentTabs             (resume / cover letter switching)
  ├── DiffView [conditional]   (wraps content when viewMode === "diff")
  │   └── ChangesSummary       (collapsible change list: added/removed/modified)
  ├── ResumeHeader             (basics: name, contact, profiles)
  ├── SortableSection          (DnD wrapper, grip handle on hover)
  │   └── SectionRenderer
  │       ├── Section label    (h2, editable via EditableField)
  │       ├── SortableEntry    (DnD wrapper, grip handle on hover)
  │       │   └── EntryRenderer
  │       │       ├── Title    (bold, rich-text editable)
  │       │       ├── Dates    (right-aligned, italic, plain-text editable)
  │       │       ├── Role + Location   (justify-between, italic row)
  │       │       ├── Organization + URL link
  │       │       ├── URL inline editor (plain text, shown as link)
  │       │       ├── SortableBullet    (DnD wrapper)
  │       │       │   └── BulletRenderer  (rich text with spans)
  │       │       └── + Bullet button   (visible on hover)
  │       └── SkillRowRenderer  (bold category : items)
  └── OpaqueNodeRenderer        (fallback for unparsed TEX blocks)
```

## Key Components

- **DocumentCanvas** — Top-level orchestrator. Reads `activeSessionId`, `activeDocType`, and `viewMode` from the Zustand session store. Fetches document data via `useSessionDocument` (React Query). Decides whether to render new `ResumeContent` (sections/entries/bullets) or legacy `documentModel` (tree nodes). Handles section-level drag-and-drop via `@dnd-kit`.

- **ResumeHeader** — Renders `basics.name` as a centered `<h1>` and contact details (location, phone, email, profiles) in a single `space-x-2` paragraph. Email and profile links use `mailto:` and `target="_blank"` respectively, styled with `text-blue-600` and `hover:underline`.

- **SectionRenderer** — Dual-mode component. For the new data model (`Section` type), it renders an editable `<h2>` heading, then dispatches to `EntryRenderer` per entry (wrapped in `SortableEntry` DnD) and `SkillRowRenderer` per skill row. For legacy document model nodes, it renders children by `type` (`entry`, `bullet`, `text`, `section`, `opaque`) and offers a "tex" toggle button to show raw LaTeX source.

- **EntryRenderer** — Renders work/education experience entries. Line 1: **bold title** (rich-text) \| right-aligned *italic dates* (plain-text). Line 2 (optional): *italic role* (rich-text) \| right-aligned *italic location* (plain-text). Line 3 (optional): organization name (plain-text) \| URL as a truncated clickable link. Below: bullet list with DnD reordering and an "Add Bullet" button that appears on hover. Each field queues optimistic edits immediately on save.

- **BulletRenderer** — Renders a `<li>` with `list-disc` styling. In the new model, the bullet text is editable via `RichEditableField` (click-to-edit with formatting toolbar). Each bullet has a delete ("×") button that appears on hover. Diff highlights use green/red backgrounds for added/removed items.

- **FormattedText** — Splits raw text into segments at span boundaries, then applies CSS classes: `font-bold`, `italic`, `underline`, or `font-mono text-sm bg-slate/10 px-1 rounded` for code. When there are no spans, it renders the text directly without wrapping `<span>` elements.

- **SkillRowRenderer** — Dead-simple renderer: `<div>` with bold category name followed by a colon and the items string.

- **SortableSection / SortableEntry / SortableBullet** — Thin DnD wrappers around their respective renderers using `@dnd-kit/sortable`. Each renders a `GripVertical` icon that is hidden by default and fades in on group hover. DnD is disabled when `viewMode === "diff"`. Dragging items shows reduced opacity. Section-level drag reordering is handled in `DocumentCanvas`; entry-level in `SectionRenderer`; bullet-level in `EntryRenderer`.

## Rich Text Editing

- **RichEditableField** — Click-to-edit that replaces the display text with a `<textarea>` and a formatting toolbar above it (Bold / Italic / Underline / Code, using `lucide-react` icons). Supports keyboard shortcuts: `Ctrl+B`, `Ctrl+I`, `Ctrl+U`. Enter commits, Escape cancels. Span annotations are tracked as `{ start, end, formats, link_url }` objects.

- **EditableField** — Plain-text fallback for simple fields like dates, section labels, locations, and organization names. Renders an `<input>` on click, commits on Enter or blur, cancels on Escape. Editing is disabled when `viewMode === "diff"`.

- **Span tracking**: When the user selects text in the textarea and clicks a format button, the component reads `selectionStart`/`selectionEnd` from the textarea ref and creates or toggles a span at those offsets. Existing overlapping spans are merged or removed.

## Drag-and-Drop

- Library: `@dnd-kit/core` + `@dnd-kit/sortable`
- Three levels: sections (top-level), entries (within a section), bullets (within an entry)
- Each level uses its own `<DndContext>` with `closestCenter` collision detection and `verticalListSortingStrategy`
- Drag handlers call `queueEdit()` immediately with the operation (`move_section`, `move_entry`, `reorder_bullets`) and update React Query cache optimistically
- All DnD is disabled when `viewMode === "diff"`

## Diff / Changes View

- The `DiffView` component provides a React Context (`DiffContext`) with a `getDiffState(nodeId)` function. Any child component can call `useDiff(id)` to check if its node is added, removed, or modified.
- The `ChangesSummary` panel is a collapsible section with color-coded counts: green for additions, red for removals, blue for modifications.
- Modified changes show old and new values side-by-side in a two-column grid (old with red background + strikethrough, new with green background).
- Paths are humanized: `sections[0].entries[2].bullets[1].text` becomes "Section 0 > Entry 2 > Bullet 1.text".
- Inline diff highlighting: added nodes get `bg-green-50` with rounded corners; removed nodes get `bg-red-50` with rounded corners.
