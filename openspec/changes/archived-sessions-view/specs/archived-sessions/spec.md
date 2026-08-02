## ADDED Requirements

### Requirement: Archived sessions endpoint

The system SHALL provide a `GET /api/sessions/archived` endpoint that returns all archived sessions for the authenticated user, ordered by `updated_at` descending.

#### Scenario: Fetch archived sessions

- **WHEN** an authenticated user requests `GET /api/sessions/archived`
- **THEN** the system returns only sessions where `is_archived` is `true`, ordered by `updated_at` desc

#### Scenario: No archived sessions

- **WHEN** an authenticated user requests `GET /api/sessions/archived` and has no archived sessions
- **THEN** the system returns an empty array

### Requirement: Archived group in sidebar

The sidebar history section SHALL display a collapsible "Archived" group at the bottom, collapsed by default, that shows archived sessions when expanded.

#### Scenario: Archived section appears when archived sessions exist

- **WHEN** the user has at least one archived session
- **THEN** the sidebar shows a collapsible "Archived" group below the "Older" group

#### Scenario: Archived section hidden when empty

- **WHEN** the user has no archived sessions
- **THEN** the "Archived" group is not displayed

#### Scenario: Archived section is collapsed by default

- **WHEN** the sidebar loads
- **THEN** the "Archived" group is collapsed and does not fetch data

#### Scenario: Archived sessions load on expand

- **WHEN** the user clicks the "Archived" group to expand it
- **THEN** the system fetches archived sessions from `GET /api/sessions/archived` and displays them

### Requirement: Unarchive action

The system SHALL allow users to unarchive a session, toggling `is_archived` from `true` to `false`.

#### Scenario: Unarchive from sidebar

- **WHEN** the user hovers an archived session in the sidebar and clicks the unarchive (↩) button
- **THEN** the session is removed from the archived list and appears in the active session groups

#### Scenario: Unarchive from chat header

- **WHEN** the user is viewing an archived session and clicks "Unarchive" in the chat header menu
- **THEN** the session becomes active and the header menu shows "Archive" instead

#### Scenario: Cache invalidation after unarchive

- **WHEN** a session is unarchived
- **THEN** the `["sessions", "grouped"]`, `["sessions", "archived"]`, and `["sessions"]` query caches are invalidated

### Requirement: Search badge for archived sessions

The search modal SHALL visually distinguish archived sessions from active ones.

#### Scenario: Archived session in search results

- **WHEN** the user searches and an archived session matches
- **THEN** the result displays an "(archived)" badge or label next to the session name
