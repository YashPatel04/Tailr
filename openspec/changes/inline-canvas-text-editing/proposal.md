## Why

The current Resume Canvas Editor swaps text elements for a `<textarea>` or `<input>` when a user wants to edit. This disconnects the editing experience from the rendered document, breaks visual context, and forces the user to type in a separate box that doesn't match the final typography. We want the canvas to feel like the document itself: click any text and type directly, like Notion.

## What Changes

- Replace the popup/textarea swap in `RichEditableField` and `EditableField` with a true inline editing surface.
- Introduce a three-state interaction model for editable text: **Normal**, **Selected**, and **Editing**.
- Add a floating, dark formatting toolbar that appears above the active field and supports Bold, Italic, Underline, and Link.
- Wire keyboard shortcuts directly to the inline editing surface: click-to-place-caret, double-click-to-select-word, drag-to-select, copy/cut/paste, undo/redo, select-all, and Escape-to-exit.
- Disable drag-and-drop (dnd-kit) while any field is in Editing mode so drag handles don't fight with text selection.
- Keep text visually identical between read and edit modes (WYSIWYG) and avoid layout shifts or re-renders while typing.
- Preserve the existing span-based formatting data model (`Span[]`) and the `editQueue` debounced save pipeline.
- Remove the `code` format option from the formatting toolbar.
- Align selection/hover accents with the existing codebase palette using the `brass` (`#10a37f`) primary accent.

## Capabilities

### New Capabilities

- `inline-canvas-text-editing`: Direct, inline text editing on the Resume Canvas with a Normal → Selected → Editing state machine, caret positioning, click/double-click/drag selection, and keyboard-driven exit/save.
- `rich-text-formatting`: Inline formatting toolbar and keyboard shortcuts for Bold, Italic, Underline, and Link, applied to selections within the editing surface.

### Modified Capabilities

- None. No existing specs are modified because this is a new UI behavior in the frontend; the underlying document model and API contract remain unchanged.

## Impact

- **Frontend components**: `RichEditableField`, `EditableField`, `FloatingToolbar`, `formatTarget.ts`, and all document renderers (`SectionRenderer`, `EntryRenderer`, `BulletRenderer`, `SkillRowRenderer`).
- **Drag-and-drop**: dnd-kit wrappers must consult an `isEditing` state to disable dragging.
- **State management**: `sessionStore` may need a global "active editing field" flag to coordinate the toolbar and drag contexts.
- **Backend/API**: No backend changes. Existing `PATCH /api/sessions/{id}/document` and `Span`/`Bullet` schema are unchanged.
- **Testing**: Frontend Vitest tests for editing interactions and formatting behavior; backend unaffected.
- **Design artifacts**: OpenDesign mockups at `opendesign/mockups/inline-editing/` are the reference for this change.
