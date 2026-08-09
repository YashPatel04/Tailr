## ADDED Requirements

### Requirement: Compute field-level diffs between master and session content

The system SHALL compare the master resume content and the current session document content to produce a map of changed fields.

#### Scenario: No changes

- **WHEN** the session document content is identical to the master resume content
- **THEN** the changes map is empty

#### Scenario: Modified bullet text

- **WHEN** a bullet's `text` field differs between master and session
- **THEN** the changes map contains an entry for that bullet with `kind: "modified"`, `old` set to the master value, and `new` set to the session value

#### Scenario: Added entry

- **WHEN** an entry exists in the session document but not in the master resume (matched by `id`)
- **THEN** the changes map contains entries for all fields of that entry with `kind: "added"`

#### Scenario: Removed section

- **WHEN** a section exists in the master resume but not in the session document (matched by `id`)
- **THEN** the changes map contains an entry for that section with `kind: "removed"` and `old` set to the section content

#### Scenario: Modified basics field

- **WHEN** a basics field (name, email, phone, location) differs between master and session
- **THEN** the changes map contains an entry for that field with `kind: "modified"`, `old` and `new` values

#### Scenario: Modified skill row

- **WHEN** a skill row's `category` or `items` field differs between master and session
- **THEN** the changes map contains entries for the changed fields with `kind: "modified"`

### Requirement: Word-level diff for text fields

The system SHALL compute word-level diffs for text fields (bullet text, basics summary) to highlight which specific words changed.

#### Scenario: Word-level highlight on modified bullet

- **WHEN** a bullet's text has been modified and the user is in Changes view
- **THEN** removed words are displayed with strikethrough styling and added words are displayed with green background styling, with unchanged words displayed normally

#### Scenario: Field-level highlight for non-text fields

- **WHEN** a non-text field (title, role, organization, dates, location, url) has been modified
- **THEN** the entire field value is highlighted as modified (no word-level breakdown)

### Requirement: Changes view toggle

The system SHALL provide a toggle to switch between the normal editing view and the Changes view.

#### Scenario: Toggle to Changes view

- **WHEN** the user clicks the "Changes" button in DocumentTopBar
- **THEN** the document renders with diff highlights on all changed fields

#### Scenario: Toggle to Current view

- **WHEN** the user clicks the "Current" button in DocumentTopBar
- **THEN** the document renders normally without diff highlights

#### Scenario: Change count badge

- **WHEN** there are differences between master and session content
- **THEN** the Changes button displays a badge showing the number of changed fields

### Requirement: Diff rendering for all field types

The system SHALL render diff highlights for all field types in the resume structure.

#### Scenario: Section-level diff

- **WHEN** a section has been added, removed, or has modified metadata
- **THEN** the section renders with a colored left border (green for added, red for removed, amber for modified)

#### Scenario: Entry-level diff

- **WHEN** an entry has been added or removed
- **THEN** the entry renders with a colored left border indicating the change type

#### Scenario: Bullet-level diff

- **WHEN** a bullet has been modified
- **THEN** the bullet text renders with word-level highlights showing removed and added words

#### Scenario: Skill row diff

- **WHEN** a skill row's category or items have been modified
- **THEN** the skill row renders with highlights on the changed fields
