## ADDED Requirements

### Requirement: Master resume deletion clears UI immediately

When a user deletes their master resume, the system SHALL set the `["master-resume"]` React Query cache data to `null` so the UI renders the empty state without requiring a page reload.

#### Scenario: Settings page shows empty state after deletion

- **WHEN** a user clicks "Remove" on the master resume settings page and confirms
- **THEN** the settings page SHALL display "No master resume uploaded yet." within the same render cycle

#### Scenario: Settings modal shows empty state after deletion

- **WHEN** a user clicks "Remove" in the master resume settings modal and confirms
- **THEN** the modal SHALL display the upload prompt (no resume card) within the same render cycle

#### Scenario: Sidebar new chat button reflects empty state

- **WHEN** a user deletes their master resume
- **THEN** clicking "New Chat" in the sidebar SHALL show the toast "Upload a master resume first" and redirect to the master resume settings page
