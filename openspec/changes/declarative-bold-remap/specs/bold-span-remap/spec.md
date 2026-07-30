## ADDED Requirements

### Requirement: Operations SHALL declare bold changes declaratively
The `update_bullet` and `add_bullet` operations SHALL include optional `bold_added` (list of words/phrases newly bolded) and `bold_removed` (list of words/phrases un-bolded) fields. These fields default to empty lists when omitted.

#### Scenario: LLM declares bold word replacement
- **WHEN** an `update_bullet` operation is applied where bold word "Engineered" is replaced with "Designed"
- **AND** the operation includes `bold_added: ["Designed"]` and `bold_removed: ["Engineered"]`
- **THEN** the span for "Engineered" SHALL be removed from the old spans
- **AND** a new span SHALL be created covering "Designed" in the new text

#### Scenario: LLM declares bold word deletion
- **WHEN** an `update_bullet` operation is applied where bold word "Engineered" is removed from the text entirely
- **AND** the operation includes `bold_removed: ["Engineered"]` and `bold_added: []`
- **THEN** the span for "Engineered" SHALL be removed from the spans

#### Scenario: LLM declares new bold word
- **WHEN** an `update_bullet` operation is applied where a new word "deployed" is bolded
- **AND** the operation includes `bold_added: ["deployed"]` and `bold_removed: []`
- **THEN** a new span SHALL be created covering "deployed" in the new text

### Requirement: Remap SHALL preserve unchanged bold words by position
After processing `bold_added` and `bold_removed`, any remaining old spans (for unchanged bold words) SHALL be validated against the new text and remapped if the word shifted position.

#### Scenario: Bold word shifts position due to surrounding text edit
- **WHEN** an `update_bullet` operation changes surrounding text but preserves a bold word
- **AND** the bold word's position changes (e.g., "Shipped and Engineered" → "Engineered and shipped")
- **AND** the word is not in `bold_removed` or `bold_added`
- **THEN** the span SHALL be remapped to the new position of the word in the new text

#### Scenario: Bold word remains at same position
- **WHEN** an `update_bullet` operation changes text but the bold word's position is unchanged
- **AND** the LLM's span indices are valid for the new text
- **THEN** the span SHALL be kept as-is without remapping

#### Scenario: Bold word no longer exists in new text
- **WHEN** an `update_bullet` operation changes text such that a bold word no longer exists
- **AND** the word is not in `bold_removed`
- **THEN** the span for that word SHALL be dropped silently

### Requirement: Remap SHALL handle backward-compatible operation format
Operations without `bold_added` or `bold_removed` fields SHALL still work. The remap logic SHALL fall back to span-based remapping using old text + old spans.

#### Scenario: Old-format operation without declarative fields
- **WHEN** an `update_bullet` operation has no `bold_added` or `bold_removed` fields
- **THEN** the system SHALL proceed with span-based remapping only
- **AND** invalid spans SHALL be dropped (existing behavior preserved)

### Requirement: Remap SHALL produce valid spans for Pydantic validation
The output of `_remap_spans()` SHALL produce spans where every span satisfies: `0 <= start < end <= len(new_text)`.

#### Scenario: All remapped spans pass validation
- **WHEN** `_remap_spans()` completes
- **THEN** every returned span SHALL satisfy `0 <= start < end <= len(new_text)`
- **AND** no span SHALL reference positions outside the new text
