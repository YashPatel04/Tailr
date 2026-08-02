## ADDED Requirements

### Requirement: Create tailoring sessions from master resume

The system SHALL allow users to create a tailoring session by selecting their master resume, pasting a job description (URL or raw text), optionally naming the company and role, setting a tailoring mode (Polish, Refine, or Rewrite), selecting an LLM provider, and adding per-session notes.

#### Scenario: Create a session with a JD URL

- **WHEN** a user submits a session with a JD URL instead of raw text
- **THEN** the system fetches and parses the URL content, extracts the text, and stores it as the session's job description

#### Scenario: Create a session without a master resume

- **WHEN** a user has no master resume set
- **THEN** the system prompts the user to upload one before proceeding with the session

#### Scenario: Set tailoring mode

- **WHEN** a user creates a session with Refine mode
- **THEN** the system stores the mode and includes it in the LLM prompt, authorizing reorganization but not full restructuring by default

### Requirement: Manage session lifecycle

The system SHALL support viewing, continuing, archiving, and deleting tailoring sessions. Sessions SHALL be organized by company (extracted or user-supplied) and displayable in the sidebar grouped by date (Today, Yesterday, Previous 7 Days, Older).

#### Scenario: List sessions grouped by date

- **WHEN** the sidebar loads the user's session history
- **THEN** sessions are grouped by date category (Today, Yesterday, Previous 7 Days, Older) with company name and role title displayed

#### Scenario: Click a session to resume

- **WHEN** a user clicks a session in the sidebar history
- **THEN** the document canvas loads the session's current document, the chat rail loads the full message history, and the user can continue editing

#### Scenario: Archive a session

- **WHEN** a user archives a completed session
- **THEN** the session is hidden from the main history list but remains recoverable from an archived chats view

#### Scenario: Delete a session

- **WHEN** a user deletes a session
- **THEN** the session and its associated documents, patches, and chat messages are permanently removed

### Requirement: Store and display chat messages

The system SHALL store all chat messages for a session (user, assistant, system roles) with their metadata (progress events, patch references, research data). Messages SHALL be displayed in the chat rail in chronological order with role-based styling.

#### Scenario: Display user message

- **WHEN** a user sends "Tailor this resume for the JD"
- **THEN** the chat rail shows the message right-aligned with a user avatar

#### Scenario: Display system progress messages

- **WHEN** the SSE stream emits `researching`, `thinking`, `writing`, and `done` events
- **THEN** the chat rail renders each as a styled system message with the appropriate icon (Lucide search/sparkles/pencil/check icons), and the document canvas updates incrementally

#### Scenario: Reference applied patches in chat

- **WHEN** a tailoring patch is applied
- **THEN** the chat message includes a summary ("3 entries modified, 1 skill added") and a clickable reference that jumps to the diff view

### Requirement: Organize by company with global tags

The system SHALL extract or accept a company name for each session. Sessions for the same company SHALL be viewable together. Users SHALL be able to assign global tags (e.g., `#security`, `#infra`, `#ML`) that cut across companies for cross-company browsing.

#### Scenario: View all sessions for a company

- **WHEN** a user navigates to `/company/stripe`
- **THEN** the system displays all tailoring sessions for Stripe, grouped by role, with their status and last-modified dates

#### Scenario: Filter by tag across companies

- **WHEN** a user clicks the `#security` tag in the sidebar
- **THEN** the system displays all sessions tagged `#security` regardless of company

#### Scenario: Add multiple tags to a session

- **WHEN** a user adds tags `#security`, `#infra` to a session
- **THEN** both tags are stored in the session's `tags` array and appear in the global tag list

### Requirement: Generate cover letters

The system SHALL generate an optional cover letter for a session using the same JD, company research, and tailored resume as context. The cover letter SHALL use a generic letter format (date, salutation, body paragraphs, closing) unless the user provides custom format instructions in their notes.

#### Scenario: Generate a cover letter

- **WHEN** a user clicks "Generate Cover Letter" in an active session
- **THEN** the system sends a modified prompt to the LLM requesting a cover letter, stores it as a `session_documents` row with `doc_type: "cover_letter"`, and switches the canvas to cover letter view

#### Scenario: Cover letter shares session context

- **WHEN** a cover letter is generated for a session that already has a tailored resume and company research
- **THEN** the LLM prompt includes the tailored resume content and research summary so tone and emphasis stay consistent between the two documents

#### Scenario: Edit cover letter via chat

- **WHEN** the cover letter is displayed and the user sends "make the intro more direct"
- **THEN** the LLM sends a patch applied to the cover letter document, the diff view highlights changes, and the canvas updates

### Requirement: Manage master resume

The system SHALL allow users to upload, view, and replace their master resume. The master resume SHALL be normalized to `.tex` internally regardless of input format. If a user uploads a new master, the old master is replaced; existing sessions referencing the old master are unaffected.

#### Scenario: Upload first master resume

- **WHEN** a user with no master resume uploads a `.tex` file
- **THEN** the system parses it into the token tree, extracts the vocabulary map, and stores it as the master

#### Scenario: Replace master resume

- **WHEN** a user uploads a new master resume
- **THEN** the old master is replaced; previously created sessions retain their documents but new sessions use the new master

#### Scenario: Reject oversized master

- **WHEN** a user uploads a resume that exceeds 5 pages after normalization
- **THEN** the system rejects with a message that the document exceeds the page limit
