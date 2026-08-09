## MODIFIED Requirements

### Requirement: Export document model to multiple formats (surgical serializer)

The system SHALL serialize the Region tree to `.tex`, `.pdf`, `.docx`, and `.txt` formats. The `.tex` export SHALL use the surgical serializer (untouched regions emit verbatim; mutated regions emit `emits_override` bytes harvested with the user's template idiom). The `.pdf` export SHALL compile the materialized `tex_source` through the existing latex container. The `.docx` export SHALL emit typed regions (sections, entries, skill rows, bullets) as Word paragraphs/runs with bold/italic spans applied; opaque regions SHALL be skipped (or emitted as raw marked-up strings, for v1). The `.txt` export SHALL render the typed regions as ALL-CAPS section headers, `•`-prefixed bullets, and `Title — Dates` entry lines.

#### Scenario: Export to .tex with surgical fidelity

- **WHEN** a user exports their tailored resume to `.tex`
- **THEN** the output bytes consist of all unchanged regions' original bytes plus the re-emitted bytes for any region with an `emits_override`; the file is compilable and stylistically indistinguishable from the user's original template

#### Scenario: Export to .pdf compiles the materialized tex source

- **WHEN** a user exports to `.pdf`
- **THEN** the system calls `serialize_to_tex(regions, source)`, writes the result to the shared Docker volume under a unique path, executes `latexmk -pdf` in the existing latex container, and returns the generated PDF (or a cached copy if the sha256 of the tex matches a previous compile)

#### Scenario: Export to .docx emits typed regions

- **WHEN** a user exports to `.docx`
- **THEN** sections become `Heading 1` paragraphs, entries become a title line + optional organization/dates line + bullet list, skill rows become a bold category line + items paragraph, span annotations become Word run bold/italic properties; opaque regions are omitted from the .docx output for v1

#### Scenario: Export to .txt renders typed structure

- **WHEN** a user exports to `.txt`
- **THEN** the system emits ALL-CAPS section headers, `• <bullet text>` per bullet, `<title> — <dates>` per entry, and `<Category>: <items>` per skill row

### Requirement: Compile LaTeX to PDF (unchanged)

The system SHALL compile `.tex` files to PDF using a Docker container running texlive-full and latexmk; the compilation flow, timeout (30s), error parsing, and PDF caching by sha256 of `tex_source` are unchanged from the legacy design.

#### Scenario: Compile a valid materialized .tex file

- **WHEN** the user requests PDF export of a tailored resume
- **THEN** the system writes the surgically serialized `.tex` to the shared volume, executes `latexmk -pdf` in the latex container, and returns the generated PDF (or the cached copy if a prior compile matches the same tex-source hash)

#### Scenario: Timeout on slow compilation (unchanged)

- **WHEN** latexmk exceeds 30 seconds without completing
- **THEN** the system terminates the compilation and returns a timeout error

#### Scenario: Surface compilation errors with line numbers (unchanged)

- **WHEN** a `.tex` file fails to compile with `Undefined control sequence` on a particular line
- **THEN** the system returns an error with the message, line number, and surrounding source context; optionally a cheap LLM provides a fix suggestion

### Requirement: Surgical serializer compile-validates its output

The system SHALL validate the surgical serializer's output by compiling it through the latex container during the test suite. If a known op would produce non-compiling bytes (e.g. mid-word `\textbf` wraps overlapping with existing braces), the serializer SHALL fall back to emitting the original slice bytes for the affected region and surface a "couldn't safely rewrite this region" warning to the calling path (chat endpoint for `source="llm"`; canvas endpoint for `source="user"`).

#### Scenario: Fallback to original slice on re-emit failure

- **WHEN** the surgical serializer's re-emit for a bullet would produce a `\textbf{` whose closing brace lands inside an existing span region
- **THEN** the serializer detects the malformed wrap, emits the bullet's original `slice` bytes instead, and the surgical-serializer result includes a warning `{"region_id":"bul-3","warning":"couldn't safely rewrite this region; emitted original"}` surfaced back to the caller
