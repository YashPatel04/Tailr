## ADDED Requirements

### Requirement: Cover letter canvas renders structured content

The system SHALL render a cover letter document as an editable canvas with three block types: salutation, paragraphs, and closing. Each block SHALL be a plain text `contentEditable` element.

#### Scenario: Canvas renders existing cover letter

- **WHEN** the user switches to the Cover Letter tab and a cover letter document exists
- **THEN** the canvas displays the salutation, each paragraph as a separate editable block, dashed insert lines between paragraphs with a `[+ Paragraph]` button, and the closing block

#### Scenario: Canvas shows empty state

- **WHEN** the user switches to the Cover Letter tab and no cover letter document exists
- **THEN** the canvas displays an empty state with a mail icon, "No cover letter yet" heading, description text, and a "Generate Cover Letter" button

### Requirement: Inline editing of cover letter blocks

The user SHALL be able to click any block (salutation, paragraph, closing) to enter edit mode. Changes SHALL be committed on blur or Enter key. Escape SHALL revert to the original value.

#### Scenario: Edit a paragraph

- **WHEN** the user clicks on a paragraph block
- **THEN** the block enters contentEditable mode, and the user can type to modify the text

#### Scenario: Commit edit on blur

- **WHEN** the user clicks outside an edited block
- **THEN** the change is queued via the editQueue and flushed to `PATCH /api/sessions/{id}/document` after the debounce period

#### Scenario: Revert edit on Escape

- **WHEN** the user presses Escape while editing a block
- **THEN** the block reverts to its original value and exits edit mode

### Requirement: Insert paragraph between existing paragraphs

The user SHALL be able to insert a new empty paragraph between existing paragraphs using the `[+ Paragraph]` insert line.

#### Scenario: Insert paragraph

- **WHEN** the user clicks a `[+ Paragraph]` insert line between paragraph 1 and paragraph 2
- **THEN** a new empty paragraph is created after paragraph 1, the canvas re-renders with the new paragraph in edit mode, and an `add_paragraph` operation is queued

### Requirement: Generate cover letter button

The "Generate Cover Letter" button SHALL call `POST /api/sessions/{id}/generate-cover-letter` and render the result in the canvas.

#### Scenario: Successful generation

- **WHEN** the user clicks "Generate Cover Letter" and the session has a job description and LLM provider configured
- **THEN** the system generates a cover letter, stores it as a `SessionDocument` with `doc_type="cover_letter"`, and the canvas renders the structured content

#### Scenario: Generation failure

- **WHEN** the user clicks "Generate Cover Letter" but no LLM provider is configured
- **THEN** the system shows an error toast "Configure an LLM provider first"
