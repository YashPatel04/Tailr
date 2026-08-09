## ADDED Requirements

### Requirement: Invalid session redirects to home

When a user navigates to a session URL with a non-existent session ID, the system SHALL redirect to `/` instead of rendering a broken page.

#### Scenario: Fake session ID in URL

- **WHEN** a user navigates to `/session/<invalid-id>` where the session does not exist
- **THEN** the system SHALL redirect to `/`

#### Scenario: Deleted session ID in URL

- **WHEN** a user navigates to `/session/<id>` for a session that was deleted
- **THEN** the system SHALL redirect to `/`

#### Scenario: Valid session loads normally

- **WHEN** a user navigates to `/session/<id>` for a session that exists
- **THEN** the system SHALL render the session page normally
