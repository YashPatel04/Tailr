## ADDED Requirements

### Requirement: Text is edited inline on the canvas

The system SHALL allow users to edit text directly inside the element that renders it, without swapping to a separate `<input>`, `<textarea>`, modal, or floating text box.

#### Scenario: Click enters selection mode

- **WHEN** the user single-clicks an editable text element
- **THEN** the element enters `Selected` state and shows a brass outline and the floating formatting toolbar
- **AND** the text itself remains read-only

#### Scenario: Second click enters editing mode

- **WHEN** the user clicks the same element while it is already `Selected`
- **THEN** the element enters `Editing` state with a blinking caret placed at the click position
- **AND** the text remains in the same position and retains the same typography

### Requirement: Caret placement follows pointer

The system SHALL place the text cursor at the exact character position where the user clicked, and support double-click and drag selection.

#### Scenario: Click places caret

- **WHEN** the user clicks inside an element that is in `Editing` state
- **THEN** the caret moves to the clicked character position

#### Scenario: Double-click selects a word

- **WHEN** the user double-clicks a word while the element is in `Selected` or `Editing` state
- **THEN** the element enters `Editing` state
- **AND** the entire word under the pointer is selected

#### Scenario: Drag selects a range

- **WHEN** the user clicks and drags across text while in `Editing` state
- **THEN** the dragged-over characters are highlighted

### Requirement: Editing interactions behave like a native text field

The system SHALL support copy, cut, paste, undo, redo, and select-all while a field is in `Editing` state.

#### Scenario: Select all within a field

- **WHEN** the user presses `Ctrl+A` (or `Cmd+A`) while editing
- **THEN** all text within that field is selected
- **AND** the selection does not extend to other page elements

#### Scenario: Undo and redo text edits

- **WHEN** the user presses `Ctrl+Z` (or `Cmd+Z`) to undo, or `Ctrl+Shift+Z` (or `Cmd+Shift+Z`) to redo
- **THEN** the text change is undone or redone within the editing session

#### Scenario: Copy, cut, and paste

- **WHEN** the user copies, cuts, or pastes while editing
- **THEN** the native clipboard behavior applies to the current selection

### Requirement: Exit editing saves changes

The system SHALL commit text changes and leave `Editing` state when the user presses `Escape`, clicks outside the field, or presses `Enter` on a single-line field.

#### Scenario: Escape exits and saves

- **WHEN** the user presses `Escape` while editing
- **THEN** the current text is committed
- **AND** the element returns to `Normal` state

#### Scenario: Click outside exits and saves

- **WHEN** the user clicks outside the active field and outside the formatting toolbar
- **THEN** the current text is committed
- **AND** the element returns to `Normal` state

#### Scenario: Enter exits single-line fields

- **WHEN** the user presses `Enter` while editing a non-bullet field
- **THEN** the current text is committed
- **AND** the element returns to `Normal` state
- **AND** no newline is inserted

### Requirement: Canvas remains stable while editing

The system SHALL keep the canvas layout stable while typing; there MUST be no re-renders, layout shifts, or flickering caused by state changes during text input.

#### Scenario: Typing does not shift the page

- **WHEN** the user types into a field in `Editing` state
- **THEN** surrounding elements remain stationary
- **AND** the editable element itself does not change size, font, or line height

### Requirement: Drag-and-drop is disabled while editing

The system SHALL disable drag-and-drop reordering of sections, entries, bullets, and skill rows whenever any field is in `Editing` state.

#### Scenario: Drag handle inactive while editing

- **WHEN** a field is in `Editing` state
- **THEN** drag handles are not visible or do not respond to drag gestures
- **AND** sortable contexts do not initiate reordering

### Requirement: Editing is visually identical to read mode

The system SHALL render editable text with the same font, size, weight, color, and spacing in `Editing` state as in `Normal` state, except for the caret and selection highlight.

#### Scenario: WYSIWYG appearance

- **WHEN** a field enters `Editing` state
- **THEN** its computed typography matches the rendered text exactly
- **AND** only a brass caret and a brass selection highlight are added
