## ADDED Requirements

### Requirement: Chat rail collapse
The system SHALL allow the chat rail to collapse to a 52px icon strip and expand back to its previous width.

#### Scenario: Collapse chat rail
- **WHEN** user clicks the collapse button on the chat rail header
- **THEN** the chat rail animates to 52px width, the resize handle hides, and the canvas expands to fill the available space

#### Scenario: Expand chat rail
- **WHEN** user clicks the expand icon in the collapsed chat rail
- **THEN** the chat rail animates back to its previous width, the resize handle reappears, and the canvas shrinks accordingly

#### Scenario: Collapse state persists
- **WHEN** user collapses or expands the chat rail
- **THEN** the state is persisted in localStorage and restored on page load

### Requirement: Collapsed rail shows mode badge
The system SHALL display the current mode (Plan/Edit) as a badge in the collapsed rail header.

#### Scenario: Mode badge visible when collapsed
- **WHEN** the chat rail is collapsed
- **THEN** a mode badge (Plan or Edit) is visible in the collapsed rail area

#### Scenario: Clicking collapsed rail expands
- **WHEN** user clicks anywhere in the collapsed rail area (not on the expand icon)
- **THEN** the chat rail expands to its previous width
