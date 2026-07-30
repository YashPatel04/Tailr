## ADDED Requirements

### Requirement: Diff path formats are normalized across backend and frontend

The system SHALL match every diff change path produced by the backend `ContentDiffer` to a corresponding frontend node ID, regardless of which path convention the backend uses for that particular change type.

#### Scenario: Section-level added change matches
- **WHEN** the backend produces a change with path `sections[0].EXPERIENCE`
- **THEN** `findChange(sectionId)` returns the change with `kind: "added"`

#### Scenario: Section-level removed change matches
- **WHEN** the backend produces a change with path `sections[0].EXPERIENCE`
- **THEN** `findChange(sectionId)` returns the change with `kind: "removed"`

#### Scenario: Entry field change matches (dot-label format)
- **WHEN** the backend produces a change with path `sections.EXPERIENCE.entries[0].title`
- **THEN** `findChange(entryId)` returns the change with `kind: "modified"` and `old`/`new` values

#### Scenario: Bullet text change matches (dot-label format)
- **WHEN** the backend produces a change with path `sections.EXPERIENCE.entries[0].bullets[0].text`
- **THEN** `findChange(bulletId)` returns the change with `kind: "modified"` and `old`/`new` values for inline word diff

#### Scenario: Bullet added change matches (dot-label format)
- **WHEN** the backend produces a change with path `sections.EXPERIENCE.entries[0].bullets[1]` with `kind: "added"`
- **THEN** `findChange(newBulletId)` returns the change with `kind: "added"`

#### Scenario: Bullet removed change matches (dot-label format)
- **WHEN** the backend produces a change with path `sections.EXPERIENCE.entries[0].bullets[0]` with `kind: "removed"`
- **THEN** `findChange(oldBulletId)` returns the change with `kind: "removed"`

### Requirement: Basics field changes render diff annotations

The system SHALL display diff gutter markers and inline word diffs for changes to basics fields (name, email, phone, location, summary) when viewing a proposal in diff mode.

#### Scenario: Name field modified
- **WHEN** the backend produces a change with path `basics.name`
- **THEN** the name field in `ResumeHeader` renders with a modified gutter marker and shows old/new values inline

#### Scenario: Email field modified
- **WHEN** the backend produces a change with path `basics.email`
- **THEN** the email field renders with a modified gutter marker and shows old/new values inline

#### Scenario: Summary field modified
- **WHEN** the backend produces a change with path `basics.summary`
- **THEN** the summary text renders with word-level old/new diff

### Requirement: Diff annotations render on all document element types

The system SHALL render visual diff annotations (gutter markers, colored left-borders, and inline word diffs) on sections, entries, bullets, and basics fields when in diff view mode.

#### Scenario: Section shows added gutter marker
- **WHEN** a section is marked as added in the diff
- **THEN** the section renders a green `+` gutter marker and green left border

#### Scenario: Entry shows modified gutter marker
- **WHEN** an entry is marked as modified in the diff
- **THEN** the entry renders an orange `~` gutter marker and orange left border

#### Scenario: Bullet shows word-level text diff
- **WHEN** a bullet text is modified with old value "Led 3 engineers" and new value "Led 5 engineers"
- **THEN** the bullet renders "Led 3 engineers" (strikethrough, red) followed by "Led 5 engineers" (green highlight)

#### Scenario: Bullet shows removed gutter marker
- **WHEN** a bullet is marked as removed in the diff
- **THEN** the bullet renders a red `–` gutter marker and red left border with strikethrough text

### Requirement: ChangesSummary bar reflects all change types

The system SHALL display an accurate count of added, removed, and modified changes in the summary bar at the top of the diff view.

#### Scenario: Mixed changes summary
- **WHEN** a diff contains 2 added, 1 removed, and 4 modified changes
- **THEN** the summary bar displays "+2 added · –1 removed · ~4 modified"
