## ADDED Requirements

### Requirement: Generate cover letter from session context

The system SHALL provide an endpoint to generate a cover letter using the active LLM provider, drawing from the user's master resume and the session's job description.

#### Scenario: Successful cover letter generation

- **WHEN** user clicks "Generate Cover Letter" in the Cover Letter tab
- **THEN** the system sends job description context and master resume to the configured LLM
- **THEN** the generated cover letter is stored as a document with `document_type: "cover_letter"`
- **THEN** the canvas displays the generated cover letter text

#### Scenario: No master resume uploaded

- **WHEN** user attempts to generate a cover letter without a master resume
- **THEN** the system returns a 400 error with message "Upload a master resume first"

#### Scenario: No LLM provider configured

- **WHEN** user attempts to generate a cover letter without any LLM provider
- **THEN** the system returns a 400 error with message "Configure an LLM provider first"

### Requirement: View cover letter in canvas

The system SHALL display the generated cover letter in the canvas when the Cover Letter tab is selected.

#### Scenario: Switch to cover letter tab after generation

- **WHEN** user has a generated cover letter and clicks the Cover Letter tab
- **THEN** the canvas displays the cover letter content in a read-only text view
