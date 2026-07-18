## ADDED Requirements

### Requirement: Parse LaTeX into syntactic token tree
The system SHALL parse `.tex` files into a lossless syntactic token tree that captures commands, environments, groups, math mode shifts, verbatim blocks, comments, and text spans. Every token MUST carry a source range (start/end byte offsets) enabling byte-identical serialization back to `.tex`.

#### Scenario: Parse a simple resume section
- **WHEN** a `.tex` file containing `\section{Experience} \begin{itemize} \item Built APIs \end{itemize}` is submitted
- **THEN** the system produces a token tree with nodes for the `\section` command, its group argument `{Experience}`, the `itemize` environment opening, the `\item` with text `Built APIs`, and the environment closing — each with correct source ranges

#### Scenario: Parse exotic custom macros
- **WHEN** a `.tex` file uses unknown custom macros like `\customcvsection{Experience}` and `\cvbullet{Built APIs}`
- **THEN** the system parses them as generic command nodes with group arguments and opaque text spans, without requiring semantic knowledge of their purpose

#### Scenario: Round-trip serialization
- **WHEN** a token tree is serialized back to `.tex`
- **THEN** the output is byte-identical to the input `.tex` source, preserving all whitespace, comments, and formatting

#### Scenario: Parse verbatim blocks
- **WHEN** a `.tex` file contains `\begin{verbatim} print("hello") \end{verbatim}`
- **THEN** the content `print("hello")` is captured as a verbatim text span without interpreting `\` as command escapes

#### Scenario: Reject oversized documents
- **WHEN** a `.tex` file exceeds 5 pages in content length
- **THEN** the system returns an error indicating the document exceeds the page limit and is not parsed

### Requirement: Extract document model from token tree
The system SHALL extract a structured document model from the token tree by mapping known LaTeX commands and environments to semantic types (sections, entries, bullets, text spans with formatting). Unknown macros SHALL be treated as opaque text spans that the LLM can see but not modify.

#### Scenario: Extract semantic structure from known commands
- **WHEN** a token tree contains `\section{Experience}` followed by `\begin{itemize} \item Built APIs \item Led team \end{itemize}`
- **THEN** the document model contains a section node of type `section` with label "Experience", containing a bullet list node with two bullet children, each with stable IDs

#### Scenario: Preserve unknown macros as opaque spans
- **WHEN** a token tree contains `\customgradientheader{John Doe}` where `\customgradientheader` is not in the known command map
- **THEN** the document model contains an opaque span node with the raw content, marked as non-editable

#### Scenario: Extract text formatting spans
- **WHEN** a token tree contains `\textbf{Built} \textit{scalable} APIs`
- **THEN** the document model text node includes span annotations: offset 0 length 5 format `["bold"]`, offset 6 length 8 format `["italic"]`

#### Scenario: Assign stable IDs to structural nodes
- **WHEN** a document model is extracted from a token tree
- **THEN** every section, entry, and bullet node SHALL be assigned a unique stable ID (`sec-1`, `ent-1`, `bul-1`) that persists across re-extractions of the same document within a session

### Requirement: Build template vocabulary map
The system SHALL learn the user's LaTeX vocabulary by recording which commands and environments map to each semantic type during extraction. This vocabulary map SHALL be used by the serializer when applying LLM patches to produce idiomatic `.tex`.

#### Scenario: Record command-to-type mapping
- **WHEN** a token tree uses `\cvsection{Experience}` as a section header
- **THEN** the vocabulary map records `\cvsection` as the section command, so future serializations use `\cvsection` rather than the generic `\section`

#### Scenario: Fall back to base LaTeX for new types
- **WHEN** the LLM adds a new section type that has no mapping in the vocabulary map
- **THEN** the serializer falls back to the standard LaTeX command (e.g., `\section{Title}`) and records the new mapping

### Requirement: Normalize .docx and .txt inputs
The system SHALL accept `.docx` and `.txt` resume files, extract their content and structure, and convert them to the unified document model format. `.docx` files SHALL be parsed via python-docx preserving paragraph styles and formatting. `.txt` files SHALL be parsed using whitespace heuristics (ALL CAPS lines as sections, lines starting with bullets as list items).

#### Scenario: Import a .docx resume
- **WHEN** a `.docx` file with heading styles and bullet lists is uploaded
- **THEN** the system extracts paragraphs with their styles, maps heading styles to sections, bullet paragraphs to bullet items, and bold/italic runs to span formatting annotations

#### Scenario: Import a .txt resume with heuristics
- **WHEN** a `.txt` file with ALL CAPS section headers and `•` prefixed bullets is uploaded
- **THEN** the system identifies sections from ALL CAPS lines, bullets from lines starting with `•`, `-`, or `*`, and assigns stable IDs to all structural nodes

#### Scenario: Auto-generate .tex from non-LaTeX input
- **WHEN** a `.docx` or `.txt` file is imported
- **THEN** the system serializes the document model to generic `.tex` (using standard `\section`, `\itemize`, `\textbf`) and stores it as the source of truth
