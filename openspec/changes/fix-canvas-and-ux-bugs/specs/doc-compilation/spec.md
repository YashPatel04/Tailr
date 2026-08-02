## MODIFIED Requirements

### Requirement: Export document model to multiple formats (surgical serializer)

The system SHALL serialize the Region tree to `.tex`, `.pdf`, `.docx`, and `.txt` formats. The `.tex` export SHALL return the stored `tex_source` bytes directly. The `.pdf` export SHALL compile the `tex_source` through the existing latex container. The `.docx` export SHALL walk the document model tree (`document_model_json`) and emit typed regions as Word paragraphs/runs: sections become `Heading 1` paragraphs, entries become a title line with bold formatting plus optional organization/dates line followed by a bullet list, skill rows become a bold category line followed by an items paragraph, bullets become bullet-point paragraphs. Span annotations (bold, italic, underline) SHALL be applied as Word run properties. Opaque regions SHALL be skipped. The `.txt` export SHALL walk the document model tree and emit ALL-CAPS section headers, `•`-prefixed bullets, `<Category>: <items>` per skill row, and `<title> — <dates>` per entry line.

#### Scenario: Export to .tex returns stored tex source

- **WHEN** a user exports their tailored resume to `.tex`
- **THEN** the system returns `doc.tex_source` as a text/plain attachment

#### Scenario: Export to .pdf compiles the tex source

- **WHEN** a user exports to `.pdf`
- **THEN** the system compiles `doc.tex_source` through the latex container and returns the generated PDF (or a cached copy if the sha256 matches a previous compile)

#### Scenario: Export to .docx emits typed regions from document model

- **WHEN** a user exports to `.docx`
- **THEN** the system reads `doc.document_model_json`, walks the Region tree, and emits sections as `Heading 1` paragraphs, entries as a title line + optional organization/dates line + bullet list, skill rows as a bold category line + items paragraph, and bullets as bullet-point paragraphs with span formatting applied as Word run properties; opaque regions are skipped

#### Scenario: Export to .txt renders typed structure from document model

- **WHEN** a user exports to `.txt`
- **THEN** the system reads `doc.document_model_json`, walks the Region tree, and emits ALL-CAPS section headers, `• <bullet text>` per bullet, `<Category>: <items>` per skill row, and `<title> — <dates>` per entry
