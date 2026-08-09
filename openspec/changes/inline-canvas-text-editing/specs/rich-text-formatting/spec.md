## ADDED Requirements

### Requirement: Floating formatting toolbar appears for active text

The system SHALL display a floating formatting toolbar above the active editable field or selection whenever a field is in `Selected` or `Editing` state.

#### Scenario: Toolbar appears on selection

- **WHEN** the user selects an editable field
- **THEN** a dark, rounded toolbar appears above the field
- **AND** the toolbar contains Bold, Italic, Underline, and Link controls

#### Scenario: Toolbar disappears on exit

- **WHEN** the field exits `Selected` or `Editing` state
- **THEN** the toolbar is hidden

### Requirement: Bold, italic, and underline apply to the current selection

The system SHALL allow users to toggle Bold, Italic, and Underline formatting on the currently selected text.

#### Scenario: Toggle bold via toolbar

- **WHEN** the user selects text and clicks the Bold button in the toolbar
- **THEN** the selected text becomes bold
- **AND** the formatting is persisted as a `Span` annotation

#### Scenario: Toggle italic via keyboard

- **WHEN** the user selects text and presses `Ctrl+I` (or `Cmd+I`)
- **THEN** the selected text becomes italic
- **AND** the formatting is persisted as a `Span` annotation

#### Scenario: Toggle underline via keyboard

- **WHEN** the user selects text and presses `Ctrl+U` (or `Cmd+U`)
- **THEN** the selected text becomes underlined
- **AND** the formatting is persisted as a `Span` annotation

#### Scenario: Toggle off existing formatting

- **WHEN** the user selects text that already has bold formatting and clicks the Bold button
- **THEN** the bold formatting is removed from the selected text
- **AND** the corresponding `Span` annotation is updated

### Requirement: Links can be added to selected text

The system SHALL allow users to add a hyperlink to the currently selected text.

#### Scenario: Add link via toolbar

- **WHEN** the user selects text and clicks the Link button
- **THEN** a small link input popover appears above the selection
- **AND** the popover accepts a URL
- **AND** the selected text is rendered as a link after the URL is applied

#### Scenario: Add link via keyboard

- **WHEN** the user selects text and presses `Ctrl+K` (or `Cmd+K`)
- **THEN** the link input popover appears

#### Scenario: Cancel link input

- **WHEN** the link input popover is visible and the user presses `Escape` or clicks Cancel
- **THEN** the popover closes
- **AND** the existing selection and formatting remain unchanged

### Requirement: Code formatting is not offered

The system SHALL NOT display a Code formatting button or expose a Code formatting shortcut in the inline editing toolbar.

#### Scenario: Code option absent

- **WHEN** the user opens the formatting toolbar
- **THEN** no Code or inline-code button is shown
- **AND** pressing `Ctrl+E` does not apply code formatting

### Requirement: Formatting persists through the document model

The system SHALL translate inline formatting changes into the existing `Span[]` data model and route them through the same `onSave` callback and `editQueue` pipeline as the previous textarea-based editor.

#### Scenario: Format change is saved

- **WHEN** the user toggles bold formatting on selected text
- **THEN** the parent component receives updated `Span[]` annotations
- **AND** the change is queued for the next `editQueue` flush
- **AND** the rendered text is updated in the same position
