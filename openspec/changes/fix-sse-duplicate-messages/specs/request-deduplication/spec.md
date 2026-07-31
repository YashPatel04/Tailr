## ADDED Requirements

### Requirement: Backend accepts optional request_id field
The `ChatMessageRequest` model SHALL accept an optional `request_id` field of type `str | None`, defaulting to `None`.

#### Scenario: Request with request_id
- **WHEN** a POST request includes `"request_id": "abc-123"` in the body
- **THEN** the backend accepts the request and processes it normally

#### Scenario: Request without request_id
- **WHEN** a POST request omits `request_id` from the body
- **THEN** the backend accepts the request and processes it normally
- **AND** no deduplication check is performed

### Requirement: Duplicate requests are rejected
The system SHALL maintain an in-memory set of recently seen `request_id` values with a TTL of 60 seconds. When a request arrives with a `request_id` that is already in the set, the system SHALL return HTTP 409 Conflict without processing the message.

#### Scenario: Duplicate request within window
- **WHEN** a request with `request_id` "abc-123" is processed
- **AND** a second request with `request_id` "abc-123" arrives within 60 seconds
- **THEN** the second request returns HTTP 409 with `{"detail": "Duplicate request"}`

#### Scenario: Same request_id after window expires
- **WHEN** a request with `request_id` "abc-123" is processed
- **AND** a second request with `request_id` "abc-123" arrives after 60 seconds
- **THEN** the second request is processed normally

#### Scenario: Different request_ids are independent
- **WHEN** a request with `request_id` "abc-123" is processed
- **AND** a request with `request_id` "def-456" arrives
- **THEN** the second request is processed normally

### Requirement: Dedup check occurs before message persistence
The system SHALL check for duplicate `request_id` before saving the user message to the database. This ensures that duplicate requests do not create duplicate `ChatMessage` records.

#### Scenario: Duplicate does not persist user message
- **WHEN** a duplicate request arrives (same `request_id` within window)
- **THEN** no new `ChatMessage` record is created
- **AND** no LLM call is made
- **AND** the response is HTTP 409

### Requirement: Dedup set is cleaned of expired entries
The system SHALL remove expired entries from the dedup set on each incoming request. Expired entries are those older than 60 seconds.

#### Scenario: Expired entries are removed
- **WHEN** a new request arrives
- **THEN** all entries in the dedup set older than 60 seconds are removed
- **AND** the dedup set contains only entries within the current window
