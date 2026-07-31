## ADDED Requirements

### Requirement: SSE client uses plain fetch with no automatic retries
The system SHALL use the native `fetch` API to establish SSE connections via POST. The system SHALL NOT use any library that implements automatic retry behavior. Each call to `sendMessage` SHALL result in exactly one HTTP request.

#### Scenario: Single request per message
- **WHEN** the user sends a chat message
- **THEN** exactly one POST request is made to `/api/sessions/{id}/chat`
- **AND** no retry requests are made regardless of response status

#### Scenario: Network error handling
- **WHEN** the POST request fails with a network error
- **THEN** the streaming state is set to false
- **AND** an error toast is displayed
- **AND** no retry request is made

#### Scenario: Non-2xx response handling
- **WHEN** the POST request returns a non-2xx status code
- **THEN** the streaming state is set to false
- **AND** an error toast is displayed with the status code
- **AND** no retry request is made

### Requirement: SSE stream is parsed manually from ReadableStream
The system SHALL read the response body as a `ReadableStream` and parse SSE messages by splitting on `\n\n` delimiters. The system SHALL extract `event:` and `data:` fields from each message.

#### Scenario: Complete SSE message parsing
- **WHEN** the server sends `event: thinking\ndata: {"message":"Thinking..."}\n\n`
- **THEN** the `onmessage` handler is called with `event.event === "thinking"` and `event.data === '{"message":"Thinking..."}'`

#### Scenario: Partial SSE messages are buffered
- **WHEN** the server sends a chunk containing a partial SSE message (no trailing `\n\n`)
- **THEN** the partial content is buffered
- **AND** the message is completed and dispatched when the remaining data arrives

#### Scenario: Multiple SSE messages in one chunk
- **WHEN** the server sends a chunk containing two complete SSE messages
- **THEN** both messages are parsed and dispatched to `onmessage` in order

### Requirement: Abort controller prevents concurrent requests
The system SHALL maintain a single `AbortController` ref. Calling `sendMessage` SHALL abort any in-flight request before starting a new one.

#### Scenario: New message aborts previous request
- **WHEN** a request is in-flight and the user sends a new message
- **THEN** the previous request is aborted via `AbortController.abort()`
- **AND** the new request starts with a fresh `AbortController`

#### Scenario: Abort triggers cleanup
- **WHEN** a request is aborted
- **THEN** the stream reader is released
- **AND** the streaming state is set to false

### Requirement: SSE parsing is a standalone utility
The system SHALL provide a pure function `parseSSEStream` that accepts a `ReadableStream` and an `onEvent` callback. The function SHALL handle reading, buffering, parsing, and dispatching SSE events. The function SHALL be cancellable via `AbortSignal`.

#### Scenario: Stream completes normally
- **WHEN** the server closes the SSE stream
- **THEN** the `parseSSEStream` function resolves
- **AND** any remaining buffered content is flushed

#### Scenario: Stream is aborted
- **WHEN** the `AbortSignal` is triggered while reading
- **THEN** the stream reader is cancelled
- **AND** the function rejects with an `AbortError`

### Requirement: Remove @microsoft/fetch-event-source dependency
The system SHALL NOT import or use `@microsoft/fetch-event-source`. The package SHALL be removed from `package.json`.

#### Scenario: No import of fetch-event-source
- **WHEN** the codebase is searched for `@microsoft/fetch-event-source`
- **THEN** zero results are found in application code
