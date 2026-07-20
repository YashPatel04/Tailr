## ADDED Requirements

### Requirement: Define structured resume content model
The system SHALL provide a Pydantic `ResumeContent` model representing the full content of a resume as structured data, independent of any output format. The model SHALL include `basics` (name, email, phone, location, profiles, summary), an ordered list of `sections` each with a `label` and either `entries` or `skill_rows`, and `metadata` for extensibility.

#### Scenario: Valid resume content with all sections
- **WHEN** a `ResumeContent` is created with basics (name="John Doe", email="john@example.com") and sections [EDUCATION with 1 entry, EXPERIENCE with 2 entries, SKILLS with 3 skill_rows]
- **THEN** `ResumeContent.model_validate()` succeeds and the model is populated with the provided data

#### Scenario: Missing required basics field
- **WHEN** a `ResumeContent` is created without the required `name` field in basics
- **THEN** Pydantic raises a `ValidationError` indicating `basics.name` is required

#### Scenario: Invalid span offsets
- **WHEN** a `Bullet` has text "Hello" but a span with `start=10, end=15` (out of bounds)
- **THEN** Pydantic raises a `ValidationError` indicating the span offset is beyond the text length

### Requirement: Support semantic entry fields
Each `Entry` in a section SHALL support typed fields: `title` (required), `role`, `organization`, `dates`, `location`, `url` (all optional), plus an ordered list of `Bullet` items. Each `Bullet` SHALL contain `text` and optional `spans` for formatting annotations.

#### Scenario: Entry with all fields
- **WHEN** an Entry is created with title="TrendAI", role="Software Engineering Intern", organization=None, dates="June 2026 – August 2026", location="Austin, TX", url=None, and 3 bullets
- **THEN** the Entry validates successfully with all fields accessible by name

#### Scenario: Entry with only title and bullets
- **WHEN** an Entry is created with title="CliquePay" and 1 bullet, with all other fields None
- **THEN** the Entry validates successfully (only title is required)

### Requirement: Support skill rows in sections
Sections SHALL support `skill_rows` as an alternative to `entries`. Each `SkillRow` SHALL contain `category` (the label before the colon, e.g. "Programming Languages") and `items` (the comma-separated skill list).

#### Scenario: Technical skills section with skill rows
- **WHEN** a section with label="TECHNICAL SKILLS" has 4 skill_rows: "Programming Languages:" → "Python, TypeScript...", "Frameworks:" → "React, Django..."
- **THEN** the section validates with entries=None and skill_rows populated

### Requirement: Support formatting spans on text
The `Span` model SHALL support `start` and `end` byte offsets into the parent text and a list of `formats` drawn from the enum `["bold", "italic", "underline", "code"]`. Spans MAY have an optional `link_url`. Span offsets SHALL be validated to be within the parent text bounds.

#### Scenario: Bullet with bold and italic spans
- **WHEN** a Bullet has text "Engineered and shipped a migration" and spans=[{start:0, end:13, formats:["bold"]}, {start:18, end:24, formats:["italic"]}]
- **THEN** the spans are validated and stored with the bullet

#### Scenario: Span with unknown format
- **WHEN** a Span has `formats: ["strikethrough"]` which is not in the allowed enum
- **THEN** Pydantic raises a `ValidationError`

### Requirement: Stable IDs for all structural elements
Every `Section`, `Entry`, `Bullet`, and `SkillRow` SHALL carry a unique `id` field (UUID4 string). IDs SHALL be generated at creation time and persist through edits. IDs SHALL NOT be regenerated on re-import (if the content is unchanged, IDs persist; if new content is imported, new IDs are assigned).

#### Scenario: New entry receives a unique ID
- **WHEN** a new Entry is created via `add_entry` without specifying an ID
- **THEN** the system assigns a UUID4 string as the entry's `id`

#### Scenario: Existing entry preserves its ID through edits
- **WHEN** an Entry with id="abc-123" has its `dates` field updated via `update_field`
- **THEN** the Entry retains id="abc-123"

### Requirement: Metadata field for extensibility
All models (ResumeContent, Section, Entry) SHALL include a `metadata: dict[str, Any]` field for template-specific data, import source tracking, and future extensions without schema changes.

#### Scenario: Store import metadata
- **WHEN** a ResumeContent is imported from a .tex file
- **THEN** metadata contains `{"import_source": "llm", "original_tex_hash": "sha256...", "template_version": "1.0"}`
