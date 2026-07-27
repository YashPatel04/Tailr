## Context

The Resume Canvas renders resume content as styled React components. Today, editable text is handled by two components:

- `EditableField` — a single-line `<input>` swap for section labels.
- `RichEditableField` — a `<textarea>` swap for entry titles, roles, dates, locations, bullets, and skill rows.

`RichEditableField` also renders a mini formatting bar above the textarea and stores formatting as `Span[]` annotations (start/end offsets with `bold`, `italic`, `underline`, `code`). `FloatingToolbar` can send format commands to whichever `RichEditableField` currently owns focus via `formatTarget.ts`. `editQueue.ts` batches edits into `PATCH /api/sessions/{id}/document` calls.

The new design (in `opendesign/mockups/inline-editing/`) replaces the swap pattern with a single element that stays in place and becomes editable via `contentEditable`.

## Goals / Non-Goals

**Goals:**
- Clicking any editable text on the canvas immediately places a caret in the same element.
- Editing happens directly on the canvas without a popup, modal, or separate text box.
- Text remains visually identical (WYSIWYG) and in the same position while editing.
- Support standard text interactions: click-to-place-caret, double-click-to-select-word, drag-to-select, copy/cut/paste, undo/redo, select-all, Escape-to-exit.
- Provide a floating formatting toolbar with Bold, Italic, Underline, and Link.
- Disable drag-and-drop while editing so text selection does not trigger sorting.
- Keep the existing span-based formatting data model and save pipeline.
- Align selection/hover accents with the existing `brass` color token.

**Non-Goals:**
- No backend API or data model changes.
- No new document formats (e.g., Markdown, HTML export).
- No cover-letter editing changes.
- No mobile-specific touch interactions.
- No code format option (removed per design).
- No syntax highlighting or code block support.

## Decisions

### Use `contentEditable` on the rendered element

**Decision:** Replace the `<textarea>`/`<input>` swap with `contentEditable` on the element that already renders the text.

**Rationale:** This is the only way to keep the text at exactly the same screen position and typography. It also gives us native caret behavior, selection, and clipboard handling for free.

**Alternatives considered:**
- Absolutely position a floating input over the text — rejected because it would still feel like a separate box and requires perfect font/line-height matching.
- Use a headless editor like Tiptap/ProseMirror — kept in mind for a future iteration, but overkill for this change and adds a dependency.

### Three-state interaction model

**Decision:** Every editable text element has three states: `Normal`, `Selected`, and `Editing`.

- `Normal`: rendered text, no outline, subtle hover highlight.
- `Selected`: a single click shows a brass outline and the floating toolbar; drag handles are visible.
- `Editing`: a second click (or double-click) enters edit mode with a blinking caret; drag handles are hidden and drag is disabled.

**Rationale:** Separating selection from editing prevents accidental typing when the user only wants to select an element, and gives the toolbar a clear lifecycle.

**Alternatives considered:**
- Single-click directly into editing — rejected because it would make selecting a field for drag/reorder harder.

### Central editing state in `sessionStore`

**Decision:** Track the active field ID in `sessionStore` so both the canvas renderers and the `FloatingToolbar` can react.

**Rationale:** Drag wrappers (`SortableSection`, `SortableEntry`, `SortableBullet`, `SortableSkillRow`) and the toolbar need to know whether any field is currently editing. A global store avoids prop drilling through many layers.

**Shape:**
```ts
{
  editingFieldId: string | null
  setEditingFieldId: (id: string | null) => void
}
```

### Formatting via span offsets

**Decision:** Compute the current selection's start/end offsets within the `contentEditable` text and mutate the existing `Span[]` array.

**Rationale:** The backend already understands `Span` annotations. Keeping the same model avoids data migration and keeps the document rendering path unchanged.

**Implementation note:** A helper will walk the text nodes of the editable element and map the DOM `Range` to character offsets, then push the updated `Span[]` to the parent `onSave` callback.

**Alternatives considered:**
- `document.execCommand` for formatting — rejected because it produces unreliable HTML and makes it hard to keep the `Span` model in sync.

### Floating toolbar anchored to the active field

**Decision:** Render the toolbar fixed to the top of the active field (or selection) using `getBoundingClientRect` and `position: fixed`.

**Rationale:** Avoids layout reflow inside the canvas and keeps the toolbar visible when the field is near the top of the viewport.

**Toolbar contents:** Bold, Italic, Underline, Link. Code is removed.

### Drag disabled while editing

**Decision:** All `dnd-kit` sortable contexts read `editingFieldId` from `sessionStore` and disable drag activation when it is non-null.

**Rationale:** Prevents the drag handle from intercepting text selection and prevents accidental section/entry reordering while the user is typing.

### Undo/redo strategy

**Decision:** Rely on the browser's native undo/redo stack while the field is in `Editing` mode. Global structural undo/redo remains via `editQueue`.

**Rationale:** `contentEditable` provides native undo for text mutations, which is the simplest way to satisfy the editing requirement. The existing `FloatingToolbar` undo/redo buttons send operations to `editQueue` and will be disabled while a field is in editing mode.

**Risk:** Users may expect a single undo history that spans both text and structural edits. This is deferred.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `contentEditable` behaves differently across browsers (especially selection and paste). | Test in the project's Vitest + jsdom suite; add one manual cross-browser check before release. |
| Converting DOM selection to span offsets is error-prone with nested formatting tags. | Use a small, well-tested helper that flattens text nodes; normalize the DOM after each edit. |
| Pasting HTML can introduce unexpected tags. | Strip pasted content to plain text, then re-apply spans from the current model. |
| Global editing state makes it harder to compose fields. | Keep the store value minimal (`string | null`) and clear it on any `blur`/Escape/document click. |
| Existing `formatTarget.ts` assumes a `textarea` selection. | Replace with a new API that accepts `Range` or offset pairs. |
| Users may confuse field selection with text selection. | Visual states (brass outline, dark toolbar) and the second-click-to-edit rule make the distinction clear. |

## Migration Plan

1. Replace `RichEditableField` and `EditableField` internals to use `contentEditable` while keeping the same props.
2. Update `FloatingToolbar` to work with the new inline editing state and format API.
3. Add `editingFieldId` to `sessionStore` and disable drag in all sortable wrappers.
4. Remove the `code` format option from the toolbar and `formatTarget` type.
5. Run frontend tests (`npm test`) and lint.
6. Validate the OpenDesign mockup behavior against the implementation.

There is no database or backend migration.

## Open Questions

1. Should we adopt Tiptap/ProseMirror in a later phase if the hand-rolled `contentEditable` approach becomes too complex?
2. How should placeholders (e.g., `+ Add date`) behave? Should they auto-enter editing mode like the current code does?
3. Should the existing URL editor in `EntryRenderer` also move inline, or stay as the separate inline input it is today?
4. Do we want to keep the mini toolbar that currently appears inside `RichEditableField`, or replace it entirely with the `FloatingToolbar`?
