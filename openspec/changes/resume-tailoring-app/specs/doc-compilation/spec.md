## ADDED Requirements

### Requirement: Compile LaTeX to PDF
The system SHALL compile `.tex` files to PDF using a Docker container running texlive-full and latexmk. Compilation SHALL be triggered on demand (before export) and the resulting PDF SHALL be cached per document version.

#### Scenario: Compile a valid .tex file
- **WHEN** the user requests PDF export of a valid `.tex` document
- **THEN** the system writes the `.tex` to the shared Docker volume, executes `latexmk -pdf` in the container, and returns the generated PDF

#### Scenario: Timeout on slow compilation
- **WHEN** latexmk exceeds 30 seconds without completing
- **THEN** the system terminates the compilation and returns a timeout error

#### Scenario: Cache compiled PDFs
- **WHEN** a PDF has been compiled for a specific document version
- **THEN** subsequent export requests for the same version return the cached PDF without recompiling

### Requirement: Extract and report compilation errors
The system SHALL parse latexmk stderr for error messages, extract the file and line number where the error occurred, and surface it to the user. Optionally, the system SHALL send the error context to a cheap LLM to suggest fixes.

#### Scenario: Report LaTeX syntax error
- **WHEN** a `.tex` file fails to compile with `Undefined control sequence` on line 42
- **THEN** the system returns an error with the message, line number, and surrounding source context

#### Scenario: Suggest fix via cheap LLM
- **WHEN** a compilation error occurs and a cheap LLM (Ollama or GPT-4o-mini) is available
- **THEN** the system sends the error snippet and surrounding code to the cheap LLM and returns suggested fixes alongside the raw error

#### Scenario: Graceful error without cheap LLM
- **WHEN** a compilation error occurs and no cheap LLM is configured
- **THEN** the system returns only the raw error message with line number and context — no crash, no hang

### Requirement: Export document model to multiple formats
The system SHALL serialize the document model to `.tex`, `.pdf`, `.docx`, and `.txt` formats regardless of the original input format. The `.tex` export SHALL use the user's template vocabulary map when the original input was `.tex`, or generic LaTeX commands otherwise.

#### Scenario: Export to .tex preserving user template
- **WHEN** a user whose original input was `.tex` with `\cvsection` exports to `.tex`
- **THEN** the output uses `\cvsection` (from the vocabulary map), not a generic `\section`

#### Scenario: Export to .tex from a .docx input
- **WHEN** a user whose original input was `.docx` exports to `.tex`
- **THEN** the output uses standard LaTeX commands (`\section`, `\itemize`, `\textbf`) since no template vocabulary exists

#### Scenario: Export to .docx
- **WHEN** the user exports to `.docx`
- **THEN** the system generates a `.docx` file using python-docx with appropriate heading styles, bullet lists, and bold/italic formatting matching the document model

#### Scenario: Export to .txt
- **WHEN** the user exports to `.txt`
- **THEN** the system renders the document model as plain text with section headers as ALL CAPS lines, bullets as `•` prefixed lines, and preserved spacing
