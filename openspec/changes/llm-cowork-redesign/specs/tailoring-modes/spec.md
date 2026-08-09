## MODIFIED Requirements

### Requirement: Tailoring mode selection

The system SHALL support three tailoring modes: polish (surgical micro-edits), refine (reorder/reorganize for impact), and rewrite (aggressive restructure). The selected mode SHALL be baked into the system prompt.

#### Scenario: Mode baked into system prompt

- **WHEN** the system assembles the Edit Mode prompt
- **THEN** the prompt includes the behavioral instructions for the currently selected tailoring level (polish, refine, or rewrite)

#### Scenario: Mode persists on session

- **WHEN** a tailoring mode is selected
- **THEN** it is stored on the session model and persists across chat messages until changed

### Requirement: Mid-chat tailoring mode switch

The system SHALL allow the user to change tailoring mode mid-chat via a UI toggle. The system SHALL inject a system notification into the chat stream when the mode changes.

#### Scenario: User switches tailoring level

- **WHEN** user clicks a different tailoring level pill in the mode bar
- **THEN** the frontend updates the active tailoring level and sends the next chat message with the new level

#### Scenario: LLM notified of mode change

- **WHEN** the user changes tailoring level mid-chat
- **THEN** a system message is injected: "Tailoring mode changed from [old] to [new]. You may now: [new mode instructions]" and the LLM acknowledges the change

#### Scenario: Mode change does not restart conversation

- **WHEN** the user changes tailoring level
- **THEN** the conversation history is preserved and only the system prompt context is updated
