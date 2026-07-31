## ADDED Requirements

### Requirement: Cover letter content model

The system SHALL store cover letter documents as structured JSON with the shape: `{ type: "cover_letter", salutation: string, paragraphs: [{id: string, text: string}], closing: string }`.

#### Scenario: New cover letter document
- **WHEN** a cover letter is generated
- **THEN** the `SessionDocument.content_json` contains `salutation`, `paragraphs` (array of objects with `id` and `text`), and `closing` fields

#### Scenario: Legacy format migration
- **WHEN** a cover letter document has the old flat format `{ text: string, type: "cover_letter" }`
- **THEN** the system parses the `text` into structured format on first access (split into salutation, paragraphs, closing)

### Requirement: Six cover letter operations

The system SHALL support six operations for cover letter documents: `update_salutation`, `update_paragraph`, `add_paragraph`, `delete_paragraph`, `reorder_paragraphs`, `update_closing`.

#### Scenario: update_salutation
- **WHEN** an `update_salutation` operation is applied with `text: "Dear Ms. Chen,"`
- **THEN** the cover letter's salutation is replaced with "Dear Ms. Chen,"

#### Scenario: update_paragraph
- **WHEN** an `update_paragraph` operation is applied with `id: "p2"` and new `text`
- **THEN** the paragraph with id "p2" is replaced with the new text

#### Scenario: add_paragraph
- **WHEN** an `add_paragraph` operation is applied with `text` and `after_id: "p1"`
- **THEN** a new paragraph with a generated UUID is inserted after the paragraph with id "p1"

#### Scenario: add_paragraph at start
- **WHEN** an `add_paragraph` operation is applied with `text` and no `after_id`
- **THEN** a new paragraph is inserted at the beginning of the paragraphs array

#### Scenario: delete_paragraph
- **WHEN** a `delete_paragraph` operation is applied with `id: "p3"`
- **THEN** the paragraph with id "p3" is removed from the paragraphs array

#### Scenario: reorder_paragraphs
- **WHEN** a `reorder_paragraphs` operation is applied with `ids: ["p3", "p1", "p2"]`
- **THEN** the paragraphs array is reordered to match the specified id order

#### Scenario: update_closing
- **WHEN** an `update_closing` operation is applied with `text: "Best regards,\nYash"`
- **THEN** the cover letter's closing is replaced with the new text

### Requirement: ContentApplier branches on document type

The `ContentApplier` SHALL detect the content type and apply cover letter operations when the content has `type: "cover_letter"`, or resume operations when the content has `basics`.

#### Scenario: Apply cover letter operations
- **WHEN** `ContentApplier.apply()` receives content with `type: "cover_letter"` and a list of cover letter operations
- **THEN** the operations are applied to the structured cover letter content and the modified content is returned

#### Scenario: Apply resume operations (unchanged)
- **WHEN** `ContentApplier.apply()` receives `ResumeContent` and resume operations
- **THEN** the existing resume application logic runs unchanged
