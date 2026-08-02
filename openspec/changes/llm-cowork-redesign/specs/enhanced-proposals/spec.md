## ADDED Requirements

### Requirement: Enhanced proposal card

The system SHALL render LLM proposals inline in chat as structured cards containing "What I'm proposing", "Why these changes", and "Summary" sections alongside accept/decline/reply actions.

#### Scenario: Proposal card rendered in chat

- **WHEN** the LLM returns a proposal in Edit Mode
- **THEN** a proposal card appears inline in the chat with: a "What" section explaining the changes, a "Why" section explaining the reasoning, an operations summary (count + description pills), Accept button, Decline button, View Diff button, and a reply input

#### Scenario: LLM includes explanation and reasoning

- **WHEN** the LLM generates a proposal
- **THEN** the response includes `explanation` (what changes are being made), `reasoning` (why these changes), and `operations` (structured ops) fields

### Requirement: Accept proposal

The system SHALL apply the proposed operations when the user clicks Accept.

#### Scenario: User accepts proposal

- **WHEN** user clicks "Accept Changes"
- **THEN** the operations are applied to the document, a new SessionDocument version is created, the proposal card updates to show "Accepted" state, and the view mode switches to "final"

### Requirement: Decline proposal

The system SHALL mark the proposal as declined and keep it in chat history when the user clicks Decline.

#### Scenario: User declines proposal

- **WHEN** user clicks "Decline"
- **THEN** the proposal card updates to show "Declined" state, a decline message is recorded in chat history, and the proposal remains visible in the chat stream

### Requirement: Reply to refine proposal

The system SHALL allow the user to send a follow-up message to refine the proposal. The LLM SHALL generate a revised proposal based on the user's feedback.

#### Scenario: User replies to proposal

- **WHEN** user types a message in the proposal reply input and clicks Send
- **THEN** the message is sent as a chat message with context that this is a proposal refinement request, and the LLM generates a revised proposal

#### Scenario: Revised proposal replaces in-place

- **WHEN** the LLM returns a revised proposal
- **THEN** a new proposal card appears in the chat below the user's reply, with updated what/why/operations

#### Scenario: Reply iteration cap

- **WHEN** the user has replied to the same proposal 5 times
- **THEN** the LLM suggests accepting the current state or starting fresh, and the reply input is disabled

### Requirement: View diff from proposal

The system SHALL allow the user to view the diff of proposed changes from the proposal card.

#### Scenario: User clicks View Diff

- **WHEN** user clicks "View Diff" on a proposal card
- **THEN** the canvas switches to diff view mode and highlights the proposed changes on the document
