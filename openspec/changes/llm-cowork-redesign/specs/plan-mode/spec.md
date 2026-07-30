## ADDED Requirements

### Requirement: Plan Mode conversation
The system SHALL support a Plan Mode where the LLM engages in conversational research, advice, and Q&A without generating structured content operations.

#### Scenario: User asks research question in Plan Mode
- **WHEN** user sends a message with `mode: "plan"` in the chat request
- **THEN** the LLM responds with plain text conversational content and SHALL NOT return structured operations

#### Scenario: LLM has full resume access in Plan Mode
- **WHEN** user sends a message in Plan Mode
- **THEN** the system prompt includes the full resume JSON as context

#### Scenario: Plan Mode response stored as assistant message
- **WHEN** the LLM responds in Plan Mode
- **THEN** the response is stored as a ChatMessage with `role: "assistant"` and `metadata_json.mode: "plan"`

### Requirement: Plan Mode system prompt
The system SHALL use a dedicated system prompt for Plan Mode that instructs the LLM to act as a resume advisor, research assistant, and career coach. The prompt SHALL explicitly forbid generating structured content operations.

#### Scenario: Plan Mode prompt forbids ops
- **WHEN** the system assembles the Plan Mode prompt
- **THEN** the prompt includes instructions that the LLM MUST NOT return structured operations and MUST respond in natural language only

#### Scenario: Plan Mode prompt includes research context
- **WHEN** research has been completed for the session
- **THEN** the Plan Mode system prompt includes the research summary as context

### Requirement: Mode switch suggestion
The system SHALL allow the LLM to suggest switching between Plan and Edit modes when user intent does not match the current mode.

#### Scenario: LLM suggests switch to Plan Mode
- **WHEN** user is in Edit Mode and asks a research/advice question
- **THEN** the LLM MAY include a `mode_suggestion` in its response suggesting Plan Mode, and the frontend renders a "Switch to Plan Mode" banner

#### Scenario: LLM suggests switch to Edit Mode
- **WHEN** user is in Plan Mode and requests resume changes
- **THEN** the LLM MAY include a `mode_suggestion` in its response suggesting Edit Mode, and the frontend renders a "Switch to Edit & Tailor" banner

#### Scenario: User accepts mode switch suggestion
- **WHEN** user clicks "Switch" on a mode suggestion banner
- **THEN** the frontend updates `activeMode` in sessionStore and the next message uses the new mode

#### Scenario: User declines mode switch suggestion
- **WHEN** user clicks "Stay" on a mode suggestion banner
- **THEN** the banner dismisses and the mode remains unchanged
