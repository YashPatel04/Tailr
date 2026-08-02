## MODIFIED Requirements

### Requirement: View mode toggle visibility

The Changes/Final view mode toggle SHALL only be visible when the active document type is "resume". When viewing a cover letter, the toggle SHALL collapse to zero width with a smooth transition.

#### Scenario: Resume view shows toggle

- **WHEN** activeDocType is "resume"
- **THEN** the Changes/Final toggle is visible in the top bar

#### Scenario: Cover Letter view hides toggle

- **WHEN** activeDocType is "cover_letter"
- **THEN** the Changes/Final toggle is hidden (max-width: 0, opacity: 0)
- **AND** the Export button remains visible

## REMOVED Requirements

### Requirement: Standalone Cover Letter button

**Reason**: Replaced by the dynamic island tab switcher. The Cover Letter button that generated and copied to clipboard is no longer needed as a separate action.
**Migration**: Use the Cover Letter tab in the dynamic island to switch to cover letter view.

## ADDED Requirements

### Requirement: Export button always visible

The Export button SHALL remain visible and functional regardless of the active document type (resume or cover letter).

#### Scenario: Export in Resume mode

- **WHEN** activeDocType is "resume"
- **THEN** the Export button is visible and functional

#### Scenario: Export in Cover Letter mode

- **WHEN** activeDocType is "cover_letter"
- **THEN** the Export button is visible and functional
