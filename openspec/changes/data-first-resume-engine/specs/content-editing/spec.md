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

### Requirement: LLM edits require user approval before applying
When the LLM returns proposed operations, the system SHALL NOT auto-apply them. Instead, the backend SHALL compute a diff and emit an SSE `proposal` event containing the operations and diff. The frontend SHALL render a proposal message with Accept and Decline buttons. Changes SHALL only be applied when the user clicks Accept.

#### Scenario: User accepts proposed changes
- **WHEN** the LLM proposes 5 operations and the user clicks Accept
- **THEN** the operations are applied via ContentApplier, a new SessionDocument version is created, and the canvas updates to the new version

#### Scenario: User declines proposed changes
- **WHEN** the LLM proposes changes and the user clicks Decline
- **THEN** the operations are discarded, a declined message is recorded in chat, and the canvas remains unchanged

#### Scenario: Canvas auto-opens diff view on proposal
- **WHEN** the SSE `proposal` event arrives
- **THEN** the canvas automatically switches to diff view showing the proposed changes with old/new values highlighted

### Requirement: Rich text formatting in editable fields
The frontend SHALL provide a formatting toolbar (Bold, Italic, Underline, Code) on editable text fields that support spans. Users SHALL be able to select text and apply formats via toolbar buttons or keyboard shortcuts (Ctrl+B/I/U). The formatted spans SHALL be preserved in the edit operation payload.

#### Scenario: Mark text as bold
- **WHEN** a user selects "network firewall" in a bullet and clicks Bold
- **THEN** the selected text is recorded with span `{start: sel_start, end: sel_end, formats: ["bold"]}` and saved with the bullet

#### Scenario: Toggle formatting off
- **WHEN** a user selects text that is already bold and clicks Bold again
- **THEN** the bold format is removed from that span

### Requirement: Drag-and-drop reordering at section, entry, and bullet levels
The canvas SHALL support drag-and-drop reordering via grip handles at three levels: sections (in DocumentCanvas), entries within sections (in SectionRenderer), and bullets within entries (in EntryRenderer). Drag handles SHALL be hidden in diff view mode. All reorders SHALL be optimistic (immediate UI update + debounced API call).

#### Scenario: Drag a section to reorder
- **WHEN** a user drags the EXPERIENCE section above EDUCATION
- **THEN** a `move_section` operation is queued and the sections appear in the new order

#### Scenario: Drag an entry within a section
- **WHEN** a user drags the second entry in EXPERIENCE above the first
- **THEN** a `move_entry` operation is queued and the entries appear in the new order

#### Scenario: Drag a bullet within an entry
- **WHEN** a user drags the third bullet above the first
- **THEN** a `reorder_bullets` operation is queued and the bullets appear in the new order

### Requirement: Add and remove bullets from entries
Each entry SHALL display an "Add Bullet" button (visible on hover) and each bullet SHALL display a delete button (×). Adding a bullet SHALL create a new bullet with placeholder text. Deleting a bullet SHALL remove it optimistically and queue a delete operation. Both buttons SHALL be hidden in diff view mode.

#### Scenario: Add a bullet to an entry
- **WHEN** a user clicks "+ Bullet" on the TrendAI entry
- **THEN** a new bullet with text "New bullet point" appears and an `add_bullet` operation is queued

#### Scenario: Delete a bullet
- **WHEN** a user clicks × on a bullet
- **THEN** the bullet is removed from the canvas and a `delete_bullet` operation is queued

### Requirement: Optimistic UI updates with debounced edit queue
All manual edits SHALL update the React Query cache immediately (optimistic) and queue the operation to a debounced edit queue. The edit queue SHALL flush to `PATCH /api/sessions/{id}/document` after 2 seconds of inactivity. This prevents excessive API calls while giving instant visual feedback.

#### Scenario: Debounced edits batch together
- **WHEN** a user quickly edits 3 fields within 2 seconds
- **THEN** all 3 operations are sent in a single PATCH request after the user stops typing

### Requirement: URL field rendering with clickable links
When an entry has a `url` field set, the EntryRenderer SHALL display a clickable link on the right side of the organization line. The URL field SHALL be editable inline. Links SHALL open in a new tab.

#### Scenario: URL displayed on organization line
- **WHEN** an entry has url="https://github.com/CSCI-321-Project/CliquePay"
- **THEN** a clickable link to the GitHub repo is shown on the right side of the organization/technology line
