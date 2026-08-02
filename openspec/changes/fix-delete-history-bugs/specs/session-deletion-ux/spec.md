## ADDED Requirements

### Requirement: Session deletion updates all dependent caches

When a user deletes a chat session, the system SHALL invalidate the `["sessions"]`, `["sessions", "grouped"]`, and `["companies"]` React Query cache keys so that all UI components reflecting session counts and company data refetch immediately.

#### Scenario: Company badge updates after session deletion

- **WHEN** a user deletes a chat session belonging to Company X
- **THEN** the company count badge for Company X in the sidebar SHALL decrease by 1 within the same render cycle

#### Scenario: Company vanishes when session count reaches 0

- **WHEN** a user deletes the last remaining session for Company X
- **THEN** Company X SHALL disappear from the sidebar company list within the same render cycle

#### Scenario: Grouped history updates after session deletion

- **WHEN** a user deletes a chat session
- **THEN** the grouped history section (Today/Yesterday/etc.) SHALL no longer display the deleted session within the same render cycle

### Requirement: Session archive updates all dependent caches

When a user archives a chat session, the system SHALL invalidate the `["sessions"]`, `["sessions", "grouped"]`, and `["companies"]` React Query cache keys.

#### Scenario: Company badge updates after session archive

- **WHEN** a user archives a chat session belonging to Company X
- **THEN** the company count badge for Company X in the sidebar SHALL decrease by 1 within the same render cycle

#### Scenario: Grouped history updates after session archive

- **WHEN** a user archives a chat session
- **THEN** the grouped history section SHALL no longer display the archived session within the same render cycle

### Requirement: Deleting active session redirects to home

When a user deletes the chat session they are currently viewing, the system SHALL clear the active session from the Zustand store and navigate the user to `/`.

#### Scenario: Redirect after deleting active session

- **WHEN** a user deletes a session and `session.id === activeSessionId`
- **THEN** the system SHALL clear `activeSessionId` in the session store
- **AND** the system SHALL navigate to `/`

#### Scenario: No redirect when deleting non-active session

- **WHEN** a user deletes a session that is not currently active
- **THEN** the system SHALL NOT navigate away from the current page
