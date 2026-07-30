## ADDED Requirements

### Requirement: Research phase as expandable card
The system SHALL render the research phase in chat history as an expandable card with a header (icon, label, chevron) and a collapsible body containing the research summary.

#### Scenario: Research card shown during research
- **WHEN** the system is in the researching phase
- **THEN** a research card appears in the chat with a spinner icon, "Researching..." label, and collapsed body

#### Scenario: Research card shown after research completes
- **WHEN** research completes
- **THEN** the research card updates to show a checkmark icon, "Research Complete" label, and the body is collapsed by default

#### Scenario: User expands research card
- **WHEN** user clicks on the research card header
- **THEN** the body expands to show the research summary including key findings and source links

#### Scenario: User collapses research card
- **WHEN** user clicks on an expanded research card header
- **THEN** the body collapses

### Requirement: Thinking phase as expandable card
The system SHALL render the LLM thinking phase in chat history as an expandable card with a header (icon, label, chevron) and a collapsible body containing the LLM's reasoning.

#### Scenario: Thinking card shown during thinking
- **WHEN** the system is in the thinking phase
- **THEN** a thinking card appears in the chat with a lightbulb icon, "Thinking..." label, and collapsed body

#### Scenario: Thinking card shown after thinking completes
- **WHEN** thinking completes
- **THEN** the thinking card updates to show the label "Thinking" and the body is collapsed by default

#### Scenario: User expands thinking card
- **WHEN** user clicks on the thinking card header
- **THEN** the body expands to show the LLM's reasoning about resume fit, strengths, and strategy

### Requirement: Phase cards visible in both modes
Research and thinking cards SHALL appear in the chat stream regardless of whether the user is in Plan Mode or Edit Mode.

#### Scenario: Research card in Plan Mode
- **WHEN** user is in Plan Mode and research fires
- **THEN** the research card appears in the chat stream with the same expandable behavior

#### Scenario: Research card in Edit Mode
- **WHEN** user is in Edit Mode and research fires
- **THEN** the research card appears in the chat stream with the same expandable behavior
