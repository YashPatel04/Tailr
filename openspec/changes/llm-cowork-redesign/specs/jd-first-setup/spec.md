## ADDED Requirements

### Requirement: JD-first session setup

The system SHALL present a single job description input as the primary setup field. The user SHALL be able to paste JD text or enter a URL.

#### Scenario: User pastes JD text

- **WHEN** user pastes job description text into the input
- **THEN** the "Analyze Job Posting" button becomes active

#### Scenario: User enters JD URL

- **WHEN** user enters a URL into the input
- **THEN** the system detects it as a URL and the "Analyze Job Posting" button becomes active

#### Scenario: Empty input

- **WHEN** the JD input is empty
- **THEN** the "Analyze Job Posting" button is disabled

### Requirement: LLM-powered field extraction

The system SHALL provide a `POST /api/sessions/analyze` endpoint that accepts JD text or URL and returns extracted company name, role title, and any other relevant fields via LLM analysis.

#### Scenario: Successful extraction from text

- **WHEN** user submits JD text to the analyze endpoint
- **THEN** the endpoint returns `{ company_name, role_title, extracted: true }`

#### Scenario: Successful extraction from URL

- **WHEN** user submits a URL to the analyze endpoint
- **THEN** the endpoint scrapes the URL, extracts JD content, and returns `{ company_name, role_title, extracted: true }`

#### Scenario: Extraction failure returns clarifying question

- **WHEN** the LLM cannot extract company or role from the provided JD
- **THEN** the endpoint returns `{ extracted: false, question: "<clarifying question>" }` and the frontend displays the question to the user

#### Scenario: URL scrape failure

- **WHEN** the system cannot scrape the provided URL
- **THEN** the endpoint returns `{ extracted: false, question: "I couldn't access that URL. Could you paste the job description text instead?" }`

### Requirement: Extracted fields confirmation

The system SHALL display extracted fields to the user for review and editing before session creation.

#### Scenario: Fields shown for confirmation

- **WHEN** extraction succeeds
- **THEN** the frontend shows company name, role title, and source URL as editable fields with an "edit" affordance

#### Scenario: User edits extracted field

- **WHEN** user clicks on an extracted field value
- **THEN** the field becomes editable and the user can modify the value

#### Scenario: Tailoring level selection

- **WHEN** extracted fields are displayed
- **THEN** the user can select tailoring intensity (polish/refine/rewrite) before creating the session

### Requirement: Session creation from extracted fields

The system SHALL create a session when the user confirms extracted fields and clicks "Start Session". Research SHALL fire automatically on session creation.

#### Scenario: Session created with confirmed fields

- **WHEN** user clicks "Start Session" with confirmed fields
- **THEN** a session is created with the confirmed company name, role title, JD, and tailoring mode, and the first chat message is fired automatically

#### Scenario: Research fires on creation

- **WHEN** a session is created via the JD-first flow
- **THEN** the system immediately begins research (company scraping) regardless of whether the user selected Plan or Edit mode
