## MODIFIED Requirements

### Requirement: Path-based edit operations on ResumeContent

The system SHALL accept edit operations addressed by semantic paths (section label + index) rather than tree node IDs. Supported operations SHALL include: `update_bullet`, `add_entry`, `delete_entry`, `move_entry`, `update_field`, `add_section`, `delete_section`, `move_section`, `add_bullet`, `delete_bullet`, `reorder_bullets`, `update_skill_row`, `update_basics_field`, `update_entry_urls`. The `update_field` operation SHALL NOT accept `"url"` as a field name. The `add_entry` operation SHALL accept a `urls` parameter (dict) instead of `url` (string).

#### Scenario: Update a specific bullet

- **WHEN** an `update_bullet` op targets section_label="EXPERIENCE", entry_index=0, bullet_index=1 with new text "Modified bullet"
- **THEN** the bullet at sections["EXPERIENCE"].entries[0].bullets[1].text is updated and Pydantic re-validates the entire ResumeContent

#### Scenario: Add a new entry at a specific position

- **WHEN** an `add_entry` op targets section_label="EXPERIENCE", after_index=0 with a complete Entry object including urls={"https://github.com/repo": "Source"}
- **THEN** the new entry is inserted at index 1 in the EXPERIENCE section's entries list with the urls dict populated

#### Scenario: Update entry urls via dedicated operation

- **WHEN** an `update_entry_urls` op targets section_label="EXPERIENCE", entry_index=0, urls={"https://new-url.com": "New Site"}
- **THEN** the entry's urls dict is replaced with the provided dict

#### Scenario: update_field rejects url as field name

- **WHEN** an `update_field` op has field="url"
- **THEN** the system raises a validation error and does not modify the content

#### Scenario: Delete a section by label

- **WHEN** a `delete_section` op targets section_label="LEADERSHIP"
- **THEN** the section with label "LEADERSHIP" is removed from the sections list

#### Scenario: Path validation fails on missing section

- **WHEN** an `update_bullet` op targets section_label="NONEXISTENT"
- **THEN** the system returns a validation error "Section 'NONEXISTENT' not found" and does not modify the content

### Requirement: URL field rendering with clickable links

When an entry has entries in its `urls` dict, the EntryRenderer SHALL display each URL as a clickable link on the right side of the organization line. Each link SHALL use the dict value as display text (mask). If the mask is empty, the URL itself SHALL be used as display text. Links SHALL open in a new tab.

#### Scenario: Single URL with mask displayed on organization line

- **WHEN** an entry has urls={"https://github.com/CSCI-321-Project/CliquePay": "GitHub repo"}
- **THEN** a clickable link with text "GitHub repo" linking to the GitHub URL is shown on the right side of the organization/technology line

#### Scenario: Multiple URLs displayed

- **WHEN** an entry has urls={"https://github.com/me": "GitHub", "https://portfolio.dev": "Portfolio"}
- **THEN** both links are shown on the right side of the organization line

#### Scenario: URL with empty mask uses URL as text

- **WHEN** an entry has urls={"https://example.com": ""}
- **THEN** a clickable link with text "https://example.com" is shown

#### Scenario: Entry with no URLs

- **WHEN** an entry has urls={} (empty dict)
- **THEN** no link is displayed
