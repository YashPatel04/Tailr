## MODIFIED Requirements

### Requirement: Chat endpoint accepts request_id for deduplication
The `POST /api/sessions/{id}/chat` endpoint SHALL accept an optional `request_id` field in the request body. When provided, the endpoint SHALL check for duplicates before processing.

#### Scenario: Request with new request_id
- **WHEN** a POST request includes a `request_id` not seen in the last 60 seconds
- **THEN** the endpoint processes the request normally
- **AND** the `request_id` is stored in the dedup set

#### Scenario: Request with duplicate request_id
- **WHEN** a POST request includes a `request_id` seen in the last 60 seconds
- **THEN** the endpoint returns HTTP 409 Conflict
- **AND** the response body is `{"detail": "Duplicate request"}`

#### Scenario: Request without request_id
- **WHEN** a POST request omits `request_id`
- **THEN** the endpoint processes the request normally (no dedup check)

### Requirement: Chat endpoint returns consistent error status codes
The `POST /api/sessions/{id}/chat` endpoint SHALL return appropriate HTTP status codes for error conditions: 404 for missing session, 409 for duplicate request, 422 for missing LLM provider, 500 for internal errors. Error responses SHALL be JSON with a `detail` field.

#### Scenario: Session not found
- **WHEN** the session_id does not match any session for the current user
- **THEN** the endpoint returns HTTP 404 with `{"detail": "Session not found"}`

#### Scenario: No LLM provider configured
- **WHEN** no LLM provider or model can be resolved for the session
- **THEN** the endpoint returns HTTP 422 with `{"detail": "Select a model from the dropdown before sending."}`
- **AND** no user message is persisted to the database

#### Scenario: Internal error during processing
- **WHEN** an unhandled exception occurs during request processing
- **THEN** the endpoint returns HTTP 500 with `{"detail": "<error message>"}`
- **AND** the error is logged with exc_info

### Requirement: Error events are sent as SSE error type
When an error occurs during SSE event streaming (after the response has started), the system SHALL emit an `error` SSE event with a `message` field before closing the stream.

#### Scenario: Error during LLM processing
- **WHEN** the LLM call fails after the SSE stream has started
- **THEN** an SSE event `event: error\ndata: {"message":"<error details>"}\n\n` is emitted
- **AND** the stream is closed after the error event

#### Scenario: Error during research phase
- **WHEN** the company research call fails after the SSE stream has started
- **THEN** an SSE event `event: error\ndata: {"message":"<error details>"}\n\n` is emitted
- **AND** the stream is closed after the error event
