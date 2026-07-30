## ADDED Requirements

### Requirement: Undo last edit operation
The system SHALL support undoing the last batch of canvas edits via Ctrl+Z (Cmd+Z on macOS) or a toolbar button.

#### Scenario: Undo after editing a section label
- **WHEN** user changes a section label from "Experience" to "Work History" and the edit is persisted
- **THEN** pressing Ctrl+Z SHALL revert the label to "Experience"
- **THEN** the undo SHALL send the inverse edit operation to the server

#### Scenario: Undo after deleting a bullet
- **WHEN** user deletes a bullet point and the edit is persisted
- **THEN** pressing Ctrl+Z SHALL restore the bullet with its original text at its original position

#### Scenario: Undo stack is empty
- **WHEN** user presses Ctrl+Z with no prior edits to undo
- **THEN** nothing happens (no-op)

### Requirement: Redo last undone operation
The system SHALL support redoing the last undone batch of canvas edits via Ctrl+Shift+Z (Cmd+Shift+Z on macOS) or a toolbar button.

#### Scenario: Redo after undo
- **WHEN** user undoes an edit, then presses Ctrl+Shift+Z
- **THEN** the undone edit SHALL be reapplied

#### Scenario: Redo stack cleared on new edit
- **WHEN** user undoes an edit, then makes a new edit
- **THEN** the redo stack SHALL be cleared (no redo available)

### Requirement: Undo/redo history cap
The system SHALL limit the undo history to the most recent 50 operations.

#### Scenario: History exceeds cap
- **WHEN** user performs 51 edits
- **THEN** the oldest edit SHALL be removed from the undo stack
- **THEN** only the most recent 50 edits are undoable

### Requirement: Undo/redo toolbar buttons reflect state
The system SHALL disable the Undo button when the undo stack is empty, and disable the Redo button when the redo stack is empty.

#### Scenario: No history available
- **WHEN** no edits have been made
- **THEN** the Undo button SHALL appear disabled (greyed out)
- **THEN** the Redo button SHALL appear disabled (greyed out)
