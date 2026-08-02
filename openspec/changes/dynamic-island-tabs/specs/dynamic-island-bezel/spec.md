## ADDED Requirements

### Requirement: Dynamic island displays document type tabs

The system SHALL render a floating pill-shaped tab bar between the top toolbar and document content, containing "Resume" and "Cover Letter" tabs.

#### Scenario: Resume tab is active by default

- **WHEN** the canvas loads with a session
- **THEN** the Resume tab is highlighted with a brass accent pill

#### Scenario: Switching to Cover Letter

- **WHEN** user clicks the Cover Letter tab
- **THEN** the brass accent pill slides to Cover Letter
- **AND** the canvas displays the cover letter content

#### Scenario: Switching back to Resume

- **WHEN** user clicks the Resume tab
- **THEN** the brass accent pill slides back to Resume
- **AND** the canvas displays the resume content

### Requirement: Island visual treatment

The dynamic island SHALL use a dark background (#171717) with rounded-full shape and a subtle shadow. The active tab indicator SHALL use the brass accent color (#10a37f) with a smooth left/width transition (300ms cubic-bezier).

#### Scenario: Dark mode compatibility

- **WHEN** the system is in dark mode
- **THEN** the island background remains dark (#171717) and remains visually distinct from the canvas

### Requirement: Cover Letter tab visibility

The Cover Letter tab SHALL only appear when the session has a cover letter document available.

#### Scenario: No cover letter exists

- **WHEN** the session has no cover letter document
- **THEN** only the Resume tab is visible in the island

#### Scenario: Cover letter exists

- **WHEN** the session has a cover letter document
- **THEN** both Resume and Cover Letter tabs are visible
