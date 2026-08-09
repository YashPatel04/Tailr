## MODIFIED Requirements

### Requirement: Session creation

The system SHALL create a session with company name, role title, job description (text or URL), tailoring mode, and optional LLM provider. The session creation endpoint SHALL accept requests with only a job description (text or URL) and return extracted fields for user confirmation.

#### Scenario: Session created with all fields

- **WHEN** user submits session creation with company_name, role_title, job_description, and tailoring_mode
- **THEN** a session is created with a SessionDocument (version 0) containing the master resume content, and research fires automatically

#### Scenario: Session created with JD-only (analyze flow)

- **WHEN** user submits session creation after confirming extracted fields from the analyze endpoint
- **THEN** a session is created with the confirmed fields and research fires automatically

#### Scenario: Research fires on creation regardless of mode

- **WHEN** a session is created
- **THEN** the system begins research (company scraping) immediately, regardless of whether the user selected Plan or Edit mode

### Requirement: Chat endpoint mode support

The chat endpoint SHALL accept an optional `mode` field in the request body. When `mode: "plan"`, the endpoint SHALL use the Plan Mode system prompt. When `mode: "edit"` or omitted, the endpoint SHALL use the Edit Mode system prompt.

#### Scenario: Chat with Plan Mode

- **WHEN** user sends a chat message with `mode: "plan"`
- **THEN** the system uses the Plan Mode system prompt and the LLM responds with conversational text only

#### Scenario: Chat with Edit Mode

- **WHEN** user sends a chat message with `mode: "edit"` or without a mode field
- **THEN** the system uses the Edit Mode system prompt with the current tailoring level baked in

#### Scenario: Mode stored in message metadata

- **WHEN** a chat message is processed
- **THEN** the mode is recorded in the ChatMessage's `metadata_json.mode` field
