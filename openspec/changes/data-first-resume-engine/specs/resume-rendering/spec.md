## ADDED Requirements

### Requirement: Generate LaTeX from ResumeContent via Jinja2 template
The system SHALL render a `ResumeContent` model to `.tex` output using a Jinja2 template. The template SHALL produce a compilable LaTeX document with a complete preamble, sections, entries, bullets, and skill rows.

#### Scenario: Render a complete resume to LaTeX
- **WHEN** a `ResumeContent` with basics, 4 sections (EDUCATION with 1 entry, SKILLS with 4 skill_rows, EXPERIENCE with 3 entries each with bullets, PROJECTS with 1 entry) is rendered
- **THEN** the output is valid `.tex` that compiles with `pdflatex` without errors

#### Scenario: Render entry with all fields populated
- **WHEN** an entry has title="TrendAI", role="Software Engineering Intern", dates="June 2026 – August 2026", location="Austin, TX"
- **THEN** the generated LaTeX produces two header lines: `\textbf{TrendAI} \hfill \textbf{June 2026 – August 2026}` followed by `\textit{Software Engineering Intern} \hfill \textit{Austin, TX}`

#### Scenario: Render entry with only title (minimal)
- **WHEN** an entry has title="CliquePay" with all other fields None
- **THEN** the generated LaTeX produces `\textbf{CliquePay}` without trailing `\\` or empty lines

### Requirement: Span formatting translates to LaTeX commands
The Jinja2 `span_format` filter SHALL convert `Span` annotations into proper LaTeX formatting commands: `bold` → `\textbf{...}`, `italic` → `\textit{...}`, `underline` → `\underline{...}`, `code` → `\texttt{...}`. Nested and adjacent spans SHALL produce balanced, valid LaTeX.

#### Scenario: Single bold span
- **WHEN** a bullet has text "Important point" with span `{start:0, end:7, formats:["bold"]}`
- **THEN** the generated LaTeX is `\item \textbf{Important} point`

#### Scenario: Nested bold and italic
- **WHEN** text has spans `[{start:0, end:10, formats:["bold"]}, {start:3, end:8, formats:["italic"]}]`
- **THEN** the generated LaTeX is `\textbf{Hel\textit{lo W}orl}d` with properly nested braces

#### Scenario: Span with link URL
- **WHEN** text "click here" has span `{start:0, end:9, formats:["bold"], link_url:"https://example.com"}`
- **THEN** the generated LaTeX is `\href{https://example.com}{\textbf{click here}}`

### Requirement: Render ResumeContent to HTML (bonus)
The system SHALL support HTML output from `ResumeContent` using a Jinja2 HTML template. This SHALL be available at the `GET /api/sessions/{id}/export?format=html` endpoint.

#### Scenario: Export resume as HTML
- **WHEN** a session has a valid `ResumeContent` and the user requests HTML export
- **THEN** the system returns a complete, self-contained HTML document with the resume content rendered in semantic HTML

### Requirement: Frontend canvas renders directly from ResumeContent JSON
The frontend SHALL render the resume canvas by consuming `ResumeContent` JSON directly, without backend transformation. The component hierarchy SHALL be: `DocumentCanvas` → iterate `sections` → `SectionRenderer` (per section) → `EntryRenderer` (per entry) / `SkillRowRenderer` (per skill_row) → `BulletRenderer` (per bullet) → `FormattedText` (per text with spans).

#### Scenario: Render a section with entries on the canvas
- **WHEN** the API returns a `ResumeContent` with a section labeled "EXPERIENCE" containing 2 entries each with bullets
- **THEN** the canvas renders an "EXPERIENCE" heading followed by 2 entry blocks, each showing title/dates/role/location and a bullet list with formatted text

#### Scenario: Render skill rows on the canvas
- **WHEN** the API returns a section labeled "TECHNICAL SKILLS" with 4 skill_rows
- **THEN** the canvas renders each skill row as "Category: items" with the category in bold

### Requirement: LaTeX compilation remains Docker-based
The generated `.tex` SHALL be compilable by the existing Dockerized `texlive-full` + `latexmk` compilation pipeline. The compilation endpoint SHALL accept the generated `.tex` and produce a `.pdf`.

#### Scenario: Compile generated LaTeX to PDF
- **WHEN** a generated `.tex` file is sent to the compilation endpoint
- **THEN** `latexmk -pdf` runs in the latex Docker container and returns a valid PDF

#### Scenario: Compilation error on malformed template output
- **WHEN** the Jinja2 template produces LaTeX with a syntax error (unbalanced braces)
- **THEN** the compilation endpoint catches the error, parses the latexmk output for line numbers, and returns a descriptive error message

### Requirement: PDF compilation via HTTP compile service
The system SHALL compile generated .tex to PDF by sending an HTTP POST to a compile service running on the latex container (`http://latex:9777/compile`). The request SHALL contain the tex_source and a document_id. The response SHALL be the compiled PDF bytes. The compile service SHALL run latexmk with nonstopmode and a 60-second timeout.

#### Scenario: Compile generated .tex to PDF via HTTP service
- **WHEN** a user requests PDF export and the backend sends tex_source to the compile service
- **THEN** the compile service runs `latexmk -pdf` and returns a valid PDF

#### Scenario: Compilation error returns descriptive message
- **WHEN** the generated .tex contains a syntax error and latexmk fails
- **THEN** the compile service returns an HTTP error with the compilation error details

#### Scenario: Compilation times out
- **WHEN** latexmk takes longer than 60 seconds to compile
- **THEN** the compile service returns a timeout error and the backend surfaces it to the user
