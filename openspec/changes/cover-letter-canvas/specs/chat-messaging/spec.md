## MODIFIED Requirements

### Requirement: Chat messages include document type

Chat messages SHALL include a `doc_type` field that partitions them into resume and cover letter threads. The `sendMessage()` function SHALL pass `activeDocType` as `doc_type` in the request body.

#### Scenario: Send message with doc_type
- **WHEN** the user sends a message while `activeDocType` is "cover_letter"
- **THEN** the `POST /api/sessions/{id}/chat` request body includes `doc_type: "cover_letter"`

#### Scenario: Default doc_type for existing messages
- **WHEN** existing chat messages are loaded that predate this feature
- **THEN** they default to `doc_type: "resume"`

### Requirement: Message list filters by document type

The `useSessionMessages` hook SHALL accept a `doc_type` parameter. The API endpoint `GET /api/sessions/{id}/messages` SHALL filter messages by `doc_type`.

#### Scenario: Fetch resume messages
- **WHEN** the query `["sessions", sessionId, "messages", "resume"]` is active
- **THEN** only messages with `doc_type="resume"` are returned

#### Scenario: Fetch cover letter messages
- **WHEN** the query `["sessions", sessionId, "messages", "cover_letter"]` is active
- **THEN** only messages with `doc_type="cover_letter"` are returned

### Requirement: Streaming state tracks active document type

The session store SHALL track which document type is currently streaming via `streamingDocType`. The streaming indicator SHALL only display when `streamingDocType` matches the active tab.

#### Scenario: Streaming indicator shows for active tab
- **WHEN** a cover letter chat message is streaming and the user is on the Cover Letter tab
- **THEN** the streaming progress indicator (thinking/writing) is visible in the chat

#### Scenario: Streaming indicator hidden for inactive tab
- **WHEN** a cover letter chat message is streaming and the user switches to the Resume tab
- **THEN** the streaming progress indicator is not visible, but streaming continues in the background

#### Scenario: Streaming completes while on different tab
- **WHEN** cover letter streaming completes while the user is on the Resume tab
- **THEN** the cover letter chat messages are invalidated in the cache, and when the user switches back, the new messages appear
