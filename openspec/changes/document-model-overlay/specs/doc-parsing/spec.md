## MODIFIED Requirements

### Requirement: Lex LaTeX into positioned tokens with full argument capture

The system SHALL lex `.tex` files into a flat list of positioned tokens (command, environment begin/end, group, text, comment, math, verbatim) where every token carries `start_byte`, `end_byte`, and `content`. Command tokens MUST include their full `{...}` argument groups inside `content` — the lexer MUST NOT drop arguments the way a naive trailing-group regex does. The lexer MUST maintain an environment stack tracking `\begin{name}` ↔ `\end{name}` nesting so each token carries its enclosing environment path. The lexer is hand-written, not tree-sitter-based, to remain inspectable and template-agnostic.

#### Scenario: Lex a section command with argument

- **WHEN** a `.tex` file contains `\section*{EDUCATION}`
- **THEN** the lexer produces one command token with `content="\\section*{EDUCATION}"`, `start_byte` pointing at the first `\`, and `end_byte` one past the closing `}` — the argument is fully captured inside `content`

#### Scenario: Lex a textbf command with nested formatting

- **WHEN** a `.tex` file contains `\textbf{TrendAI} \hfill \textbf{\textit{June 2026 – August 2026}}`
- **THEN** the lexer produces three command tokens: `\\textbf{TrendAI}`, `\\hfill`, and `\\textbf{\\textit{June 2026 – August 2026}}` — nested braces are balanced inside `content`

#### Scenario: Lex an itemize environment with bullets

- **WHEN** a `.tex` file contains `\begin{itemize}[itemsep=-2pt] \item Built APIs \item Led team \end{itemize}`
- **THEN** the lexer produces an environment begin token (name `itemize`, content including `[itemsep=-2pt]`), two command tokens (`\item Built APIs`, `\item Led team`), and an environment end token; every token's environment path includes the enclosing `itemize` environment

#### Scenario: Lex verbatim blocks and math without command escaping

- **WHEN** a `.tex` file contains `\begin{verbatim} print("h\\x") \end{verbatim}` and `\(a^2 + b^2 = c^2\)`
- **THEN** the verbatim content `print("h\\x")` is captured as a single verbatim token without interpreting backslashes as command escapes, and the math is captured as a math token

#### Scenario: Reject oversized documents

- **WHEN** a `.tex` file exceeds 5 pages in content length
- **THEN** the system returns a `400` with a clear "Document exceeds 5-page limit" error and does not lex

### Requirement: Recognize resume regions via an extensible catalog

The system SHALL extract a Region tree from the positioned token list by running an extensible, priority-ordered catalog of recognizers. Each recognizer declares `can_claim(tokens_slice, env_path) -> bool` and `claim(tokens_slice, env_path, source_bytes) -> Region`. The first recognizer whose `can_claim` returns true for a given token slice consumes that slice and emits one Region. `OpaqueRecognizer` runs last and absorbs any unmatched tokens so unrecognized constructs never crash parsing.

#### Scenario: Recognize a section command as a SectionRegion

- **WHEN** a token slice begins with a `\section*` (or `\section`, `\subsection`, `\cvsection`, `\resumesection`) command
- **THEN** `SectionRecognizer.claim` consumes that single command token and emits a `SectionRegion` whose `label` is the parsed argument (e.g. "EDUCATION"), whose `slice` spans the command token's bytes, and whose `text` is the parsed label — never the raw command string

#### Scenario: Recognize a header layout block as a HeaderRegion

- **WHEN** a token slice is a `\begin{center} … \end{center}` block recognized by `HeaderRecognizer`
- **THEN** the emitted `HeaderRegion` contains a `name` field (parsed from the first `\textbf` inside the block) and a list of contact `fields` (phone, email, urls) each with `text` and `link` data parsed from `\href{url}{label}` commands

#### Scenario: Recognize an experience entry as an EntryRegion with fields, layout, and bullets

- **WHEN** a token slice starts with a "header line" (`\textbf{Org} \hfill \textbf{Dates} \\ \textit{Role \hfill Location}`) optionally followed by `\begin{itemize} … \end{itemize}` and `EntryRecognizer.can_claim` returns true
- **THEN** the emitted `EntryRegion` has `fields` (title, role, organization, dates, location, link as present), a `layout` ordering fields across lines (with `hfill` spacers), and child `BulletRegion`s parsed from each `\item` body — bullet `text` is the parsed body, not empty

#### Scenario: Recognize a skill row as a SkillRowRegion

- **WHEN** a token slice matches `\textbf{Category:} <items> \\` (a single line with a bold category prefix) and `SkillRowRecognizer.can_claim` returns true
- **THEN** the emitted `SkillRowRegion` has `category` and `items` fields parsed from the bold prefix and the rest of the line

#### Scenario: Recognize an item bullet with formatted spans

- **WHEN** a token slice inside an itemize is `\item Engineered and shipped a migration of \textbf{network firewall} query infrastructure`
- **THEN** `BulletRecognizer.claim` emits a `BulletRegion` with `text="Engineered and shipped a migration of network firewall query infrastructure"` and a span annotation covering `network firewall` marked `["bold"]` — the bullet's text is the parsed body, and formatting is captured as offsets into that text

#### Scenario: Unrecognized constructs degrade to OpaqueRegion

- **WHEN** a token slice contains an unknown custom macro like `\customgradientheader{John Doe}` or stray layout glue like `\\` `\hfill` `\noindent`
- **THEN** `OpaqueRecognizer.claim` emits an `OpaqueRegion` with `slice` covering the tokens and `text=None`; the construct survives serialization verbatim and is never LLM-editable

#### Scenario: Pluggable recognizer for a new template

- **WHEN** a developer adds a `CvEntryRecognizer` to the catalog (priority slot above the generic `EntryRecognizer`) and a user uploads a `moderncv` resume using `\cventry{...}{...}{...}{...}`
- **THEN** `CvEntryRecognizer.can_claim` returns true for those runs and emits `EntryRegion`s with `moderncv`-specific field parsing, while generic `EntryRecognizer` no longer attempts those slices

### Requirement: Region tree carries verbatim slices and typed payloads

The system SHALL model a parsed resume as a tree of `Region` nodes. Each Region MUST carry both a `slice` (start_byte, end_byte) into the authoritative `tex_source` AND a typed payload (`text` + `spans` for bullets/text; `label` for sections; `fields` + `layout` for entries; `category` + `items` for skill rows; nothing for opaque). Each Region MUST have a stable deterministic `id` (prefix + index) that survives re-extraction of the same source within a session. The tree MUST contain no baked-in absolute offsets that must be maintained after edits — slice positions are read-only input metadata, never mutated in place; the serializer re-walks the tree on each emit.

#### Scenario: Region carries its slice and its parsed label

- **WHEN** a `\section*{EDUCATION}` command is recognized
- **THEN** the SectionRegion's `slice` points at the bytes of `\section*{EDUCATION}` in `tex_source`, `label="EDUCATION"`, and `text="EDUCATION"` — both pieces of information are present on the same node

#### Scenario: Re-extraction produces stable IDs

- **WHEN** the same `tex_source` is parsed twice within the same session
- **THEN** the produced Region trees have identical `id` sequences for the same structural positions (e.g. `sec-1` for EDUCATION, `ent-1` for TrendAI)

#### Scenario: Editing a region does not require re-balancing offsets elsewhere

- **WHEN** the applier sets `emits_override` on one bullet Region after a `ReplaceText` op
- **THEN** no other Region's `slice` is altered; the serializer resolves ordering from a new tree traversal at emit time and never maintains "shifted offsets" by hand

### Requirement: Keep `.docx`/`.txt` import out of master pipeline (export-only)

The system SHALL continue to accept only `.tex` files for master resume upload. `.docx` and `.txt` remain export-only targets. The previous `.docx`/`.txt` import normalizers are removed from the master upload path; export-only `.docx`/`.txt` emitters are kept under `doc-compilation`.

#### Scenario: Reject `.docx` master upload

- **WHEN** a user uploads a `.docx` as master resume
- **THEN** the system returns a `400` "Only `.tex` format is accepted. Got: .docx" and does not parse

### Requirement: Store document model as Region tree JSON

The system SHALL persist parsed resume documents to `SessionDocument.document_model_json` as a JSON serialization of the Region tree. Each Region's `slice` is serialized with its byte offsets (for the surgical serializer), and its typed payload is serialized alongside. `tex_source` is stored verbatim on the same row and remains the authoritative source for unchanged regions.

#### Scenario: Persist a parsed master resume on session create

- **WHEN** a user creates a new tailoring session against a master `.tex`
- **THEN** the system lexes the master, runs the recognizer catalog, produces the Region tree, and stores both `document_model_json` (Region tree) and `tex_source` (verbatim bytes from the master) on the new `SessionDocument` row
