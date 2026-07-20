## ADDED Requirements

### Requirement: Path-based edit operations on ResumeContent
The system SHALL accept edit operations addressed by semantic paths (section label + index) rather than tree node IDs. Supported operations SHALL include: `update_bullet`, `add_entry`, `delete_entry`, `move_entry`, `update_field`, `add_section`, `delete_section`, `move_section`, `add_bullet`, `delete_bullet`, `reorder_bullets`, `update_skill_row`, `update_basics_field`.

#### Scenario: Update a specific bullet
- **WHEN** an `update_bullet` op targets section_label="EXPERIENCE", entry_index=0, bullet_index=1 with new text "Modified bullet"
- **THEN** the bullet at sections["EXPERIENCE"].entries[0].bullets[1].text is updated and Pydantic re-validates the entire ResumeContent

#### Scenario: Add a new entry at a specific position
- **WHEN** an `add_entry` op targets section_label="EXPERIENCE", after_index=0 with a complete Entry object
- **THEN** the new entry is inserted at index 1 in the EXPERIENCE section's entries list, and subsequent entries shift down

#### Scenario: Delete a section by label
- **WHEN** a `delete_section` op targets section_label="LEADERSHIP"
- **THEN** the section with label "LEADERSHIP" is removed from the sections list

#### Scenario: Path validation fails on missing section
- **WHEN** an `update_bullet` op targets section_label="NONEXISTENT"
- **THEN** the system returns a validation error "Section 'NONEXISTENT' not found" and does not modify the content

### Requirement: Both LLM and user edits use the same operation channel
The operation application layer (`ContentApplier`) SHALL serve both the LLM chat path and the user canvas-editing path. Operations SHALL carry a `source` tag (`"llm"` or `"user"`). Every operation SHALL produce a `Patch` row in the database with the operation payload, source tag, source document version, and target document version.

#### Scenario: LLM produces an edit operation
- **WHEN** the chat endpoint receives LLM output containing `{"operations": [{"op": "update_bullet", ...}]}`
- **THEN** the operations are applied with `source="llm"`, a new `SessionDocument` version is created, and a `Patch` row is inserted

#### Scenario: User edits a field on the canvas
- **WHEN** the frontend sends a `PATCH /api/sessions/{id}/document` with `{"operations": [{"op": "update_field", "source": "user", ...}]}`
- **THEN** the operation is applied with `source="user"`, a new `SessionDocument` version is created, and a `Patch` row is inserted

### Requirement: Pydantic validation on every edit
Every edit operation SHALL trigger full `ResumeContent.model_validate()` on the resulting content. If validation fails, the operation SHALL be rejected and the content SHALL remain unchanged.

#### Scenario: Edit produces invalid content
- **WHEN** an `update_bullet` op sets bullet text but includes a span with `start=-1` (invalid offset)
- **THEN** Pydantic validation fails, the operation is rejected, and the error is returned to the caller

### Requirement: LLM prompt sends structured content, not Region tree JSON
The LLM prompt for chat tailoring SHALL include a clean JSON representation of `ResumeContent` (sections with labeled entries and bullets, not Region trees with byte slices and opaque nodes). The prompt SHALL instruct the LLM to return typed operations against the supported catalog.

#### Scenario: LLM prompt contains human-readable resume structure
- **WHEN** a chat message is sent for tailoring
- **THEN** the LLM prompt contains a JSON with `basics`, `sections` array where each section has `label`, `entries` with `title`/`role`/`dates`/`location`/`bullets`, and `skill_rows` with `category`/`items` — no byte offsets, no opaque nodes, no slice data

#### Scenario: LLM prompt is smaller than Region tree prompt
- **WHEN** a resume with 5 sections, 10 entries, and 30 bullets is sent to the LLM
- **THEN** the prompt JSON is under 8KB (compared to ~20KB for the Region tree equivalent with byte slices and fields dicts)

### Requirement: Diff produces human-readable field-level changes
The diff engine SHALL compare old and new `ResumeContent` and produce a list of changes with semantic paths. Changes SHALL include the path (e.g., `sections[2].entries[1].bullets[0].text`), the kind (`added`, `removed`, `modified`), and the old/new values.

#### Scenario: Diff detects a modified bullet
- **WHEN** a ResumeContent is modified so that sections[1].entries[0].bullets[2].text changes from "Built APIs" to "Designed and built REST APIs"
- **THEN** the diff includes `{path: "sections[1].entries[0].bullets[2].text", kind: "modified", old: "Built APIs", new: "Designed and built REST APIs"}`

#### Scenario: Diff detects a new section
- **WHEN** a new section "CERTIFICATIONS" is appended to the sections list
- **THEN** the diff includes `{path: "sections", kind: "added", index: 5, value: {label: "CERTIFICATIONS", ...}}`

### Requirement: Conflict detection for concurrent edits
When the LLM produces edits while the user has unsaved canvas edits, the system SHALL detect the conflict and surface it to the user. The user SHALL choose: keep LLM edits, keep user edits, or merge.

#### Scenario: User editing when LLM patch arrives
- **WHEN** the user has unsaved edits in the canvas (tracked via optimistic-update store) and an LLM patch arrives via SSE
- **THEN** the frontend shows a conflict banner: "AI made changes while you were editing — review, keep yours, or merge" and does not auto-apply the LLM patch
