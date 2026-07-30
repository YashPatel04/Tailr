## ADDED Requirements

### Requirement: Save status indicator in canvas
The system SHALL display a persistent save status indicator in the canvas header area that reflects the current state of queued edits.

#### Scenario: Edits queued but not yet sent
- **WHEN** user makes an edit that gets queued for batch save
- **THEN** the indicator shows "Saving..." with a spinner animation

#### Scenario: Edits successfully saved
- **WHEN** the PATCH request returns a successful (2xx) response
- **THEN** the indicator shows "Saved" with a checkmark icon for 3 seconds, then fades

#### Scenario: Save fails
- **WHEN** the PATCH request returns an error (4xx/5xx) or network failure
- **THEN** the indicator shows "Error saving" in red with a retry button
- **THEN** clicking retry re-flushes the queued edits

#### Scenario: No pending edits
- **WHEN** the edit queue is empty and last save was successful
- **THEN** the indicator shows "Saved" in muted text

### Requirement: Save state tracking in edit queue
The system SHALL track save status (idle/queued/saving/saved/error) within the edit queue module.

#### Scenario: Status transitions
- **WHEN** edit is queued via `queueEdit()`, status SHALL transition from `idle` to `queued`
- **WHEN** flush timer fires and PATCH request begins, status SHALL transition to `saving`
- **WHEN** PATCH response arrives with 2xx, status SHALL transition to `saved`
- **WHEN** PATCH response arrives with error, status SHALL transition to `error`

### Requirement: Edit queue must scope edits to session
The system SHALL attach the active session ID to each queued edit operation.

#### Scenario: Switching sessions during debounce window
- **WHEN** user queues edits in session A, then switches to session B within the 2s debounce window
- **THEN** only edits scoped to session A are sent to session A's endpoint
- **THEN** edits scoped to session B are sent to session B's endpoint on their own debounce timer
