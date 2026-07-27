## 1. Foundation

- [x] 1.1 Add `editingFieldId: string | null` and `setEditingFieldId(id: string | null)` to `sessionStore`
- [x] 1.2 Create `frontend/app/lib/textSelection.ts` with helpers to map a DOM `Range` to character offsets inside a `contentEditable` element
- [x] 1.3 Create `frontend/app/lib/inlineFormat.ts` to toggle `bold`, `italic`, `underline`, and `link_url` on `Span[]` using offset ranges
- [x] 1.4 Remove `code` from `FormatAction` and `FormatTarget` types in `frontend/app/lib/formatTarget.ts`

## 2. Inline EditableField (section labels)

- [x] 2.1 Refactor `frontend/app/components/document/EditableField.tsx` to render a `contentEditable` element instead of an `<input>`
- [x] 2.2 Implement `Normal`, `Selected`, and `Editing` states in `EditableField`
- [x] 2.3 Wire single-click to `Selected`, second click to `Editing`, and place the caret at the click position
- [x] 2.4 Wire `Escape`, `Enter`, and click-outside to commit changes and return to `Normal`
- [x] 2.5 Apply brass hover/selection styling using Tailwind tokens

## 3. Inline RichEditableField (titles, roles, bullets, skills)

- [x] 3.1 Refactor `frontend/app/components/document/RichEditableField.tsx` to render a `contentEditable` element instead of a `<textarea>`
- [x] 3.2 Preserve the `Span[]` rendering so read mode looks identical to edit mode
- [x] 3.3 Implement `Normal`, `Selected`, and `Editing` states with the same interaction rules as `EditableField`
- [x] 3.4 Support double-click to select a word and drag to select a range
- [x] 3.5 Handle `Ctrl+A` to select all text within the field
- [x] 3.6 Commit changes via the existing `onSave(newText, newSpans)` callback and queue through `editQueue`

## 4. Floating Formatting Toolbar

- [x] 4.1 Create a new anchored toolbar component (`frontend/app/components/document/InlineFormatToolbar.tsx`) that positions above the active field using `getBoundingClientRect`
- [x] 4.2 Add Bold, Italic, Underline, and Link buttons to the toolbar
- [x] 4.3 Wire `Ctrl+B`, `Ctrl+I`, `Ctrl+U`, and `Ctrl+K` shortcuts in the active editable field
- [x] 4.4 Implement a link input popover with Apply and Cancel behavior
- [x] 4.5 Remove the inline mini toolbar from `RichEditableField` and any `code` formatting button from `FloatingToolbar`
- [x] 4.6 Highlight the active format buttons based on the current selection's spans

## 5. Drag-and-Drop Coordination

- [x] 5.1 Update `SortableSection`, `SortableEntry`, `SortableBullet`, and `SortableSkillRow` to disable drag activation while `editingFieldId` is non-null
- [x] 5.2 Hide drag handles when any field is in `Editing` state
- [x] 5.3 Ensure drag handles remain visible and usable in `Normal` and `Selected` states

## 6. Interaction Polish

- [x] 6.1 Set `caret-color` and selection background to brass tokens
- [x] 6.2 Prevent canvas-level re-renders during typing (batch state updates, avoid resetting `contentEditable` content on every keystroke)
- [x] 6.3 Strip unexpected HTML from pasted content and re-apply current spans
- [x] 6.4 Preserve placeholder behavior (auto-enter `Editing` when value is a placeholder " ")
- [x] 6.5 Add a click-outside handler that commits the active field when clicking anywhere except the field or toolbar

## 7. Tests & Validation

- [x] 7.1 Add Vitest tests for the selection-offset helpers in `frontend/app/lib/textSelection.ts`
- [x] 7.2 Add Vitest tests for inline format toggling in `frontend/app/lib/inlineFormat.ts`
- [x] 7.3 Add component tests for `EditableField` and `RichEditableField` state transitions
- [x] 7.4 Run `npm run lint && npm run format -- --check` in the `frontend/` directory
- [x] 7.5 Run `npm test` and fix any regressions
- [x] 7.6 Compare the running UI against the OpenDesign mockups at `opendesign/mockups/inline-editing/`
