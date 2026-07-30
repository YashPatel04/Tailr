## ADDED Requirements

### Requirement: Settings modal is the only settings surface
The settings modal SHALL be the sole way to access user settings (profile, providers, master resume, account). The standalone settings pages and layout SHALL be removed.

#### Scenario: No standalone settings routes exist
- **WHEN** a user navigates to `/settings/profile`, `/settings/providers`, `/settings/master-resume`, or `/settings/account`
- **THEN** the route SHALL not exist (404 or redirect)

### Requirement: Master resume preview matches standalone quality
The settings modal's master resume view overlay SHALL display a structured resume preview (name, contact info, sections, skill rows, entries with bullets) using the `ResumePreview` component, not raw JSON.

#### Scenario: Rich preview in modal
- **WHEN** a user clicks "View" on their master resume in the settings modal
- **THEN** the modal SHALL display a structured resume preview with sections, skill rows, entries, and bullets

### Requirement: No master resume redirects to modal
When a user has no master resume and clicks "New Chat", the system SHALL open the settings modal to the master-resume tab instead of navigating to a standalone page.

#### Scenario: New chat without master resume
- **WHEN** a user clicks "New Chat" and has no master resume
- **THEN** the settings modal SHALL open to the "Master Resume" tab
