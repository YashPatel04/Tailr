## ADDED Requirements

### Requirement: Separate chat threads per document type

Each session SHALL maintain two separate chat threads: one for resume and one for cover letter. The active thread SHALL be determined by the currently selected tab.

#### Scenario: Switch tabs changes chat messages
- **WHEN** the user switches from Resume tab to Cover Letter tab
- **THEN** the ChatMessageList renders only messages with `doc_type="cover_letter"`

#### Scenario: Resume chat unaffected by cover letter messages
- **WHEN** the user sends messages in the cover letter chat
- **THEN** those messages do not appear in the resume chat when switching back to the Resume tab

### Requirement: Chat-driven cover letter editing

When the user sends a message in the cover letter chat with edit mode active, the system SHALL apply LLM-generated operations directly to the cover letter document without a proposal/accept step.

#### Scenario: LLM edits cover letter via chat
- **WHEN** the user sends "make the opening more punchy" in the cover letter chat
- **THEN** the backend loads the cover letter document, calls the LLM with a cover letter edit prompt, applies the returned operations immediately, creates a new document version, and emits a `done` SSE event with an explanation message

#### Scenario: Plan mode in cover letter chat
- **WHEN** the user sends a message in plan mode in the cover letter chat
- **THEN** the LLM responds with conversational advice (no operations), displayed as a regular assistant message

### Requirement: Chat prompt when no cover letter exists

When the user is on the Cover Letter tab and no cover letter exists, the chat SHALL display a system message prompting generation.

#### Scenario: Empty cover letter chat
- **WHEN** the user switches to the Cover Letter tab and no cover letter document exists
- **THEN** the chat displays a system message: "Generate a cover letter first before editing. Click the button in the canvas or say 'write a cover letter'."

#### Scenario: Generate via chat command
- **WHEN** the user types "write a cover letter" in the cover letter chat and no cover letter exists
- **THEN** the system calls the generate endpoint, creates the cover letter, and confirms in chat

### Requirement: Confirmation message after LLM edit

After the LLM edits the cover letter, the assistant message SHALL describe what changed in 1-3 sentences.

#### Scenario: Explanation after edit
- **WHEN** the LLM applies operations to the cover letter
- **THEN** the assistant message contains the `explanation` from the LLM response (e.g., "Shortened paragraph 2. Made the opening more direct.")
