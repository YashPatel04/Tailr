## ADDED Requirements

### Requirement: Toolbar renders as horizontal bar inside the paper
The formatting toolbar SHALL render as a horizontal bar positioned inside the `.paper` card as its first child, with 12px inset margins on left, right, and top.

#### Scenario: Toolbar visible inside paper
- **WHEN** the document canvas renders with content
- **THEN** the formatting toolbar appears at the top of the paper card, before the resume content, with 12px margins from the paper edges

#### Scenario: Toolbar not rendered outside paper
- **WHEN** the document canvas renders
- **THEN** no floating sidebar toolbar appears beside the paper

### Requirement: Glass inset bezel treatment
The toolbar container SHALL use semi-transparent background with backdrop blur, matching the paper surface depth rather than floating above it.

#### Scenario: Light mode glass styling
- **WHEN** the app is in light mode
- **THEN** the toolbar uses `background: rgba(247,247,248,0.85)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(229,229,229,0.6)`, and `box-shadow: 0 1px 4px rgba(0,0,0,0.04)`

#### Scenario: Dark mode glass styling
- **WHEN** the app is in dark mode
- **THEN** the toolbar uses `background: rgba(43,44,54,0.8)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(142,142,142,0.15)`, and `box-shadow: 0 2px 8px rgba(0,0,0,0.2)`

### Requirement: All existing toolbar actions preserved
The toolbar SHALL retain all current formatting actions: Insert (section/entry/bullet dropdown), Bold, Italic, Underline, Link, Undo, Redo.

#### Scenario: Insert dropdown opens downward
- **WHEN** user clicks the Insert button in the horizontal toolbar
- **THEN** the dropdown menu opens downward (below the toolbar), not to the side

#### Scenario: Format buttons trigger same actions
- **WHEN** user clicks Bold, Italic, Underline, or Link
- **THEN** the same `applyFormatAction` is called as before

#### Scenario: Undo/Redo functional
- **WHEN** user clicks Undo or Redo
- **THEN** the same undo/redo logic executes as before

### Requirement: Toolbar scrolls with paper
The toolbar SHALL be part of the paper's normal document flow, scrolling with the paper content. It SHALL NOT use `position: sticky` or `position: fixed`.

#### Scenario: Toolbar scrolls with document
- **WHEN** user scrolls the document canvas
- **THEN** the toolbar scrolls up with the paper content and disappears off-screen when scrolled past
