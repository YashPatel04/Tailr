---
description: Drag-and-drop reordering for skill rows within a section, plus per-section add button
---

### ADDED Requirements

#### Section: SortableSkillRow Component

##### Requirement: Skill rows are drag-reorderable within a section

Each skill row in a section with skill rows is wrapped in a `SortableSkillRow` component that enables drag-and-drop reordering.

###### Scenario: Drag handle appears on hover

- **WHEN** the user hovers over a skill row in a section
- **THEN** a grip handle icon appears to the left of the skill row
- **AND** the handle is hidden when not hovering (opacity transition)

###### Scenario: Dragging a skill row

- **WHEN** the user presses and holds the grip handle
- **THEN** the skill row becomes semi-transparent (opacity-50)
- **AND** a transform is applied matching the cursor position

###### Scenario: Dropping a skill row

- **WHEN** the user releases a dragged skill row over another skill row
- **THEN** the skill row is reordered to the target position
- **AND** the change is reflected in the document cache immediately (optimistic)
- **AND** a `move_skill_row` op is queued with `section_label`, `from_index`, `to_index`

###### Scenario: Drag disabled in diff view

- **WHEN** `viewMode === "diff"`
- **THEN** drag-and-drop is disabled on all skill rows

---

#### Section: Per-Section Add Skill Row Button

##### Requirement: Each section with skill rows has an add button

A button labeled "+ Add skill row" appears below the skill rows list in any section that renders skill rows.

###### Scenario: Clicking add skill row

- **WHEN** the user clicks the "+ Add skill row" button
- **THEN** an `add_skill_row` op is queued with `section_label`, `category: ""`, `items: ""`, `after_index: <last index>`
- **AND** a new empty skill row appears at the bottom of the section's skill rows

---

#### Section: move_skill_row Backend Op

##### Requirement: Backend supports move_skill_row operation

The backend accepts a `move_skill_row` operation with `section_label`, `from_index`, and `to_index`.

###### Scenario: Valid move

- **WHEN** the backend receives a `move_skill_row` op with valid indices
- **THEN** the skill row at `from_index` is moved to `to_index` in the section's `skill_rows` list

###### Scenario: Invalid index

- **WHEN** the backend receives a `move_skill_row` op where `from_index` or `to_index` is out of bounds
- **THEN** the op is skipped and a warning is logged

---

#### Section: Optimistic Cache Update

##### Requirement: Skill row reorder reflects immediately in UI

The document cache is updated immediately on drag-end, without waiting for the server response.

###### Scenario: Optimistic update on drag end

- **WHEN** a skill row is dropped at a new position
- **THEN** the `skill_rows` array in the document cache is reordered immediately
- **AND** if the server request fails, the cache is not rolled back (matches entry DnD behavior)
