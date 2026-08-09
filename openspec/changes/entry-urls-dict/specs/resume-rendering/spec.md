## MODIFIED Requirements

### Requirement: Generate LaTeX from ResumeContent via Jinja2 template

The system SHALL render a `ResumeContent` model to `.tex` output using a Jinja2 template. The template SHALL produce a compilable LaTeX document with a complete preamble, sections, entries, bullets, and skill rows. For entries with a non-empty `urls` dict, the template SHALL render each URL as a `\href{url}{mask}` command. If the mask is empty, the URL itself SHALL be used as the display text.

#### Scenario: Render a complete resume to LaTeX

- **WHEN** a `ResumeContent` with basics, 4 sections (EDUCATION with 1 entry, SKILLS with 4 skill_rows, EXPERIENCE with 3 entries each with bullets, PROJECTS with 1 entry) is rendered
- **THEN** the output is valid `.tex` that compiles with `pdflatex` without errors

#### Scenario: Render entry with URL and mask

- **WHEN** an entry has urls={"https://example.com": "Project Site"}
- **THEN** the generated LaTeX contains `\href{https://example.com}{Project Site}`

#### Scenario: Render entry with URL and empty mask

- **WHEN** an entry has urls={"https://example.com": ""}
- **THEN** the generated LaTeX contains `\href{https://example.com}{https://example.com}`

#### Scenario: Render entry with multiple URLs

- **WHEN** an entry has urls={"https://github.com/me": "GitHub", "https://dev.example.com": "Dev Site"}
- **THEN** the generated LaTeX contains both `\href{https://github.com/me}{GitHub}` and `\href{https://dev.example.com}{Dev Site}`

#### Scenario: Render entry with no URLs

- **WHEN** an entry has urls={} (empty dict)
- **THEN** no `\href` command is generated for that entry's URL line

#### Scenario: Render entry with all fields populated

- **WHEN** an entry has title="TrendAI", role="Software Engineering Intern", dates="June 2026 – August 2026", location="Austin, TX"
- **THEN** the generated LaTeX produces two header lines: `\textbf{TrendAI} \hfill \textbf{June 2026 – August 2026}` followed by `\textit{Software Engineering Intern} \hfill \textit{Austin, TX}`

#### Scenario: Render entry with only title (minimal)

- **WHEN** an entry has title="CliquePay" with all other fields None
- **THEN** the generated LaTeX produces `\textbf{CliquePay}` without trailing `\\` or empty lines
