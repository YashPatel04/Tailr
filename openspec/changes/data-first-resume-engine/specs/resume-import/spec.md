## ADDED Requirements

### Requirement: Import master resume .tex via LLM extraction
The system SHALL accept a `.tex` file as the master resume and extract its content into a `ResumeContent` model using the configured LLM provider. This import SHALL run once at master resume creation, not per session.

#### Scenario: Successful import of a standard resume
- **WHEN** a `.tex` file with sections EDUCATION, EXPERIENCE, SKILLS, and PROJECTS is uploaded as a master resume
- **THEN** the system sends the `.tex` to the LLM with a structured extraction prompt, receives JSON, validates it with `ResumeContent.model_validate()`, and stores the validated content

#### Scenario: LLM extraction produces invalid JSON
- **WHEN** the LLM returns JSON missing a required field (e.g., basics.name)
- **THEN** Pydantic validation fails, the system sends the validation error back to the LLM for self-correction, and retries up to 2 times before returning an error to the user

#### Scenario: Import preserves formatting spans
- **WHEN** a `.tex` file contains `\textbf{Built} \textit{scalable} APIs`
- **THEN** the extracted bullet contains text "Built scalable APIs" with spans `[{start:0, end:4, formats:["bold"]}, {start:5, end:12, formats:["italic"]}]`

#### Scenario: Import maps section labels from \section* commands
- **WHEN** a `.tex` file contains `\section*{EDUCATION}` and `\section*{EXPERIENCE}`
- **THEN** the extracted ResumeContent has sections with labels "EDUCATION" and "EXPERIENCE" in the original order

### Requirement: Side-by-side import review
After successful extraction, the system SHALL generate `.tex` from the extracted `ResumeContent` using the default template and present both the original `.tex` and generated `.tex` for user comparison.

#### Scenario: User accepts the import
- **WHEN** the user reviews the side-by-side comparison and clicks "Accept"
- **THEN** the extracted `ResumeContent` is stored as the master resume content and the generated `.tex` becomes the stored tex_source

#### Scenario: User rejects the import
- **WHEN** the user reviews the comparison and clicks "Reject" or "Re-import"
- **THEN** the system allows re-import with an optional corrected prompt, discarding the previous extraction

### Requirement: Handle unrecognized LaTeX constructs gracefully
When the LLM encounters LaTeX content it cannot map to the schema, it SHALL place unrecognized content in the `metadata` field of the nearest structural element rather than omitting it.

#### Scenario: Custom preamble macros
- **WHEN** a `.tex` file has custom macros like `\customheaderformat` in the preamble
- **THEN** the extraction does not fail; custom content is preserved in `ResumeContent.metadata["unrecognized_preamble"]`

#### Scenario: Exotic entry format
- **WHEN** an entry uses a non-standard format like `\cventry{...}{...}{...}` that the LLM partially recognizes
- **THEN** the LLM extracts what it can into Entry fields and stores the raw LaTeX in `entry.metadata["raw_latex"]`

### Requirement: Import progress tracking via SSE
The import process SHALL stream progress events to the frontend: `importing` → `extracting` → `validating` → `import_done`. Each event SHALL carry a human-readable message.

#### Scenario: Import streams progress
- **WHEN** a .tex file import is initiated
- **THEN** the frontend receives SSE events: `importing` ("Analyzing resume..."), `extracting` ("Extracting content with AI..."), `validating` ("Validating structure..."), `import_done` ("Import complete — review your content")

### Requirement: Import failures are user-visible and recoverable
If import fails after retries, the system SHALL return a descriptive error to the user and preserve the original `.tex` source. The user MAY retry import or proceed with a blank structured resume.

#### Scenario: Import fails after 2 LLM retries
- **WHEN** the LLM produces invalid JSON on the first attempt and both retries also fail validation
- **THEN** the system returns an error with the validation details, preserves the original .tex, and offers the user options to retry with a corrected prompt or start with a blank structured resume

### Requirement: Fallback regex extraction when LLM import is unavailable
When the LLM-based import fails or no LLM provider is configured, the system SHALL extract basic section structure from the .tex file using regex. Section labels SHALL be extracted from `\section*{...}` commands. Section body text SHALL be captured as raw content. The document name SHALL be extracted from the `\LARGE\textbf{...}` header pattern when present.

#### Scenario: LLM import fails, fallback produces sections
- **WHEN** a .tex file is uploaded but the LLM provider is not configured or the import call fails
- **THEN** the system extracts section labels (EDUCATION, EXPERIENCE, etc.) via regex and creates a ResumeContent with sections containing raw body text as entry titles

#### Scenario: Fallback extracts author name
- **WHEN** a .tex file contains `{\LARGE \textbf{YASH PATEL}}` in the center block
- **THEN** the extracted ResumeContent has basics.name = "YASH PATEL"

#### Scenario: Fallback marks content as fallback_extraction
- **WHEN** content is extracted via regex fallback
- **THEN** the ResumeContent metadata contains `{"fallback_extraction": true}` indicating the content needs LLM refinement for proper structured entries
