## Context

The current system parses LaTeX into a Region tree via a recognizer catalog, applies typed ops against that tree, and emits TeX through a surgical serializer. This works for simple resumes but breaks on formatting variations — nested `\textbf{\textit{...}}`, multi-line entry headers with `\\`, inline `$|$` separators in project entries, and exotic templates all produce mis-parsed entries, leaked LaTeX in fields, and opaque-node bloat. Adding a recognizer for every template variation is unsustainable.

The entire resume builder ecosystem (YAMLResume, JSON Resume, simple-resume, resume-as-code) resolves this by making **structured content the source of truth** and generating output formats (LaTeX, HTML, PDF) from templates. This change adapts that architecture to our existing app.

## Goals / Non-Goals

**Goals:**

- `ResumeSchema` Pydantic model as the single source of truth for all resume content
- Jinja2-driven LaTeX generation from `ResumeSchema` (no surgical emitter, no recognizers)
- One-time LLM-based import from `.tex` → `ResumeSchema` with user review
- Frontend canvas renders directly from `ResumeSchema` (no `_convert_document_model`)
- LLM and user edits operate on `ResumeSchema` with path-based ops (not tree-node IDs)
- Diff produces human-readable field-level changes (not node-ID moves)
- Pydantic validation replaces all manual ID-existence and type checks

**Non-Goals:**

- Multi-format export beyond LaTeX + PDF (HTML is a bonus, not required for MVP)
- Template customization UI — ship one excellent default template; customization via file editing only
- Real-time collaborative editing
- Backfilling historical sessions to new schema (old sessions remain read-only with legacy data)
- Preamble/class file editing from the canvas (preambles live in the template, not the content)

## Decisions

### Decision 1: ResumeSchema is a flat, list-heavy Pydantic model (not a tree)

The schema models resume semantics directly, not LaTeX structure:

```python
class Basics(BaseModel):
    name: str
    email: str | None
    phone: str | None
    location: str | None
    profiles: list[Profile]
    summary: str | None

class Entry(BaseModel):
    id: str  # stable UUID
    title: str              # company or institution name
    role: str | None        # job title or degree
    organization: str | None
    dates: str | None
    location: str | None
    url: str | None
    bullets: list[Bullet]
    metadata: dict[str, Any]  # extra fields for unknown template data

class Bullet(BaseModel):
    id: str
    text: str
    spans: list[Span]  # formatting annotations

class Section(BaseModel):
    id: str
    label: str           # e.g. "EDUCATION", "EXPERIENCE"
    entries: list[Entry]
    skill_rows: list[SkillRow]  # for sections like TECHNICAL SKILLS

class SkillRow(BaseModel):
    id: str
    category: str
    items: str

class Span(BaseModel):
    start: int
    end: int
    formats: list[Literal["bold", "italic", "underline", "code"]]
    link_url: str | None

class ResumeContent(BaseModel):
    basics: Basics
    sections: list[Section]
    metadata: dict[str, Any]  # template version, import source, etc.
```

**Why flat, not tree:** The frontend renders sections in order, entries within sections, bullets within entries. A flat ordered-list structure mirrors the visual layout exactly. No tree walking, no parent-child ID lookups, no recursive converters.

**Why not JSON Resume schema:** JSON Resume's `work`/`education`/`projects` sections are hardcoded; users with custom sections (e.g., `RESEARCH`, `LEADERSHIP`, `CERTIFICATIONS`) can't add them. Our schema uses a generic `sections` list where each section has a `label` and either `entries` or `skill_rows`. This matches how resumes are actually written.

**Alternatives considered:**

- JSON Resume standard: too rigid (fixed section names); no support for RESEARCH or custom sections
- YAMLResume schema: tightly coupled to their LaTeX compiler; heavy weight
- Keeping Region tree: the entire problem we're solving

### Decision 2: LaTeX is generated via Jinja2 templates, not surgical serialization

A single Jinja2 template (`templates/resume.tex.j2`) receives `ResumeContent` and produces `.tex`:

```jinja2
\documentclass[letterpaper,10pt]{article}
\usepackage{enumitem}
\usepackage{hyperref}
\usepackage[margin=0.2in]{geometry}
\usepackage{titlesec}

\titleformat{\section}{\normalsize\bfseries}{}{0em}{}[\titlerule]
\titlespacing*{\section}{0pt}{8pt plus 2pt minus 2pt}{4pt}
\setlist[itemize]{leftmargin=*, itemsep=3pt, topsep=2pt}
\hypersetup{colorlinks=true, urlcolor=blue, pdfnewwindow=true}
\pagestyle{empty}

\begin{document}

\begin{center}
    {\LARGE \textbf{{ content.basics.name }}} \\[4pt]
    {{ content.basics.location }} \\[4pt]
    {{ content.basics.phone }} $|$
    \href{mailto:{{ content.basics.email }}}{{ content.basics.email }}
    {% for p in content.basics.profiles %}$|$
    \href{{ '{' }}{{ p.url }}}{{ p.label }}{% endfor %}
\end{center}

{% for section in content.sections %}
\section*{{ '{' }}{{ section.label }}}
{% if section.skill_rows %}
{% for sk in section.skill_rows %}
\textbf{{ '{' }}{{ sk.category }}:} {{ sk.items }} \\
{% endfor %}
{% endif %}
{% for entry in section.entries %}
\textbf{{ '{' }}{{ entry.title }}} \hfill \textbf{{ '{' }}{{ entry.dates }}}
{% if entry.role %}\textit{{ '{' }}{{ entry.role }}}{% if entry.location %} \hfill \textit{{ '{' }}{{ entry.location }}}{% endif %}{% endif %}
{% if entry.bullets %}
\begin{itemize}[itemsep=-2pt]
{% for bullet in entry.bullets %}
    \item {{ bullet.text | span_format }}
{% endfor %}
\end{itemize}
{% endif %}
{% endfor %}
{% endfor %}

\end{document}
```

A custom `span_format` Jinja2 filter wraps bold/italic/underline/code spans in the appropriate LaTeX commands.

**Why Jinja2:** Already available in the Python ecosystem (FastAPI/Starlette uses it). Templates are plain text files the user can customize by editing. No new dependencies.

**Why not surgical emitter:** The surgical emitter walks a Region tree and replays verbatim slices. It's 300 lines of fragile offset math. A template is ~100 lines of straightforward LaTeX generation.

**Alternatives considered:**

- Keeping surgical serializer: the whole point of this change is to delete it
- WeasyPrint/Markdown→PDF: loses LaTeX's typesetting quality; users expect LaTeX output
- Multiple template engines (Handlebars, Mustache): Jinja2 is already in the Python ecosystem; no new dependencies

### Decision 3: Import .tex → ResumeSchema via LLM, one-time

When a user uploads a master resume `.tex` file:

1. Send the entire `.tex` source to the configured LLM with a structured prompt:

   > "Extract the resume content from this LaTeX document into the following JSON schema. Preserve all text exactly, including formatting spans (bold/italic/underline). Map sections by their `\section*{}` labels. Extract entry fields (title, role, organization, dates, location, URL) from header lines. Extract bullet text with formatting spans from `\itemize` blocks. Unknown constructs go in metadata."

2. Parse the LLM response with `ResumeContent.model_validate()`
3. Pydantic validation catches missing fields, wrong types, invalid spans
4. On validation failure: send errors back to LLM for self-correction (same retry pattern as current patch validation)
5. On success: generate `.tex` from the template, show a side-by-side comparison (original vs generated)
6. User reviews and accepts (or re-imports with a different template)

**Why LLM, not recognizers:** An LLM understands "this `\textbf` followed by `\hfill` followed by `\textbf` is a title-dates pair" without needing position-specific heuristics. It handles nested formatting, multi-line headers, and exotic commands. It degrades gracefully — if it can't parse something, it puts it in `metadata` rather than creating 6 mis-parsed nodes.

**Why one-time, not per-session:** The content doesn't change between sessions. Parsing once and storing structured data avoids the per-session fragility and cost.

**Alternatives considered:**

- Rule-based recognizers: the current system; proven fragile
- Manual structured data entry: viable but user-hostile for existing LaTeX users
- Two-phase (LLM + human): adds friction; LLM-only with user review is the pragmatic balance

### Decision 4: Scheme path-based editing ops, not tree-node-ID ops

The LLM and user edit `ResumeContent` through operations addressed by semantic paths:

```
update_bullet(section_label="EXPERIENCE", entry_index=0, bullet_index=1,
              text="New bullet text", spans=[...])

add_entry(section_label="EXPERIENCE", after_index=0,
          entry={title:"New Company", role:"Engineer", ...})

delete_section(section_label="LEADERSHIP")

move_section(from_index=2, to_index=0)

add_section(after_index=-1, section={label:"CERTIFICATIONS", entries:[...]})

update_field(section_label="EXPERIENCE", entry_index=0,
             field="dates", value="2024 – Present")

reorder_bullets(section_label="EXPERIENCE", entry_index=0,
                order=[2, 0, 1])
```

**Why paths, not node IDs:** Paths are stable across regenerations (an entry's position doesn't change unless moved). Node IDs like `ent-3` or `bul-7` change when content is re-imported or regenerated. Paths are also semantically meaningful to the LLM — "the first bullet of the second experience entry" is clearer than "bul-7".

**Why not full-content replacement:** Sending the entire `ResumeContent` back and diffing would be simplest for the LLM, but:

- Token cost scales with resume size (unnecessary for single-bullet edits)
- Diffs can be noisy (whitespace, ordering)
- The smaller the LLM response, the fewer hallucinations

Typed ops strike a balance: targeted edits with semantic addressing.

**Alternatives considered:**

- Full content replacement + server-side diff: higher token cost, noisier diffs
- Region tree node IDs: the current system; fragile ID persistence

### Decision 5: Validation is Pydantic, not manual

Every edit operation goes through:

```python
def apply_op(content: ResumeContent, op: ContentOp) -> ResumeContent:
    new_content = content.model_copy(deep=True)
    # mutate new_content based on op type
    # ...
    ResumeContent.model_validate(new_content.model_dump())  # validates everything
    return new_content
```

Pydantic validates: field types, required fields, list constraints, span offset bounds, enum values. No manual "does this ID exist" or "is this a valid field kind" checks.

**Why:** The current `PatchValidator` manually checks ID existence, type compatibility, and structural constraints. Pydantic does all of this for free with the schema definition.

### Decision 6: Frontend renders ResumeContent directly

The backend returns `ResumeContent.model_dump(mode='json')` to the frontend. No `_convert_document_model()` transformation. The frontend types mirror the schema:

```typescript
interface ResumeContent {
  basics: Basics;
  sections: Section[];
}

interface Section {
  id: string;
  label: string;
  entries?: Entry[];
  skill_rows?: SkillRow[];
}

interface Entry {
  id: string;
  title: string;
  role?: string;
  dates?: string;
  location?: string;
  bullets: Bullet[];
}
```

`DocumentCanvas` iterates `sections`, `SectionRenderer` renders each `Section`, `EntryRenderer` renders each `Entry`, `BulletRenderer` renders each `Bullet`. Same component hierarchy, simpler data flow.

### Decision 7: Single default template shipped with the app

For MVP, one LaTeX template is shipped at `backend/app/services/rendering/templates/resume.tex.j2`. It produces a professional, ATS-friendly output matching the visual style of Yash's current template (compact margins, `\titlerule` section headers, `[itemsep=-2pt]` itemize). Users can customize by editing the template file in their deployment.

Template customization UI is a follow-up. The template system supports multiple templates out of the box — `ResumeContent` is template-agnostic; different `.j2` files produce different visual styles from the same content.

### Decision 8: Diff produces human-readable change descriptions

Instead of "ent-3 moved from position 2 to 3", the diff produces:

```json
{
  "changes": [
    {
      "path": "sections[2].entries[1].bullets[0].text",
      "kind": "modified",
      "old": "Engineered and shipped...",
      "new": "Led migration of network firewall..."
    },
    {
      "path": "sections[3].entries",
      "kind": "added",
      "index": 1,
      "value": {"title": "New Company", ...}
    }
  ]
}
```

Implemented via `deepdiff` or a simple recursive dict comparison. The frontend maps paths back to rendered elements for highlighting.

### Decision 9: LLM proposal flow (accept/decline, not auto-apply)

Instead of auto-applying LLM edits, the chat endpoint emits an SSE `proposal` event with the proposed operations and computed diff. The frontend stores the proposal in sessionStore (`pendingProposal`), renders a `ProposalMessage` component in the chat rail with Accept/Decline buttons, and auto-opens the diff view on the canvas.

- **POST /api/sessions/{id}/chat**: LLM response → compute diff → emit `proposal` SSE event (don't apply yet)
- **POST /api/sessions/{id}/proposal/accept**: Receives operations list in request body, applies via ContentApplier, creates new SessionDocument version + Patch + chat message
- **POST /api/sessions/{id}/proposal/decline**: Clears proposal state, records declined message

**Why not auto-apply:** Users wanted to review changes before they land, similar to Claude Code's confirmation pattern. The canvas auto-opens the diff view showing exactly what will change (old→new values, color-coded). This prevents unwanted edits and gives users control.

**Alternatives considered:**

- Auto-apply with undo: undo is complex (multiple document versions); user review is simpler and preferred
- Server-stored pending ops: DB persistence issues with async SSE generators; passing ops in request body is more reliable

### Decision 10: Rich text editing with span formatting toolbar

A `RichEditableField` component replaces plain `EditableField` for text that supports formatting spans. It provides a toolbar with Bold/Italic/Underline/Code buttons that appear on click. Selected text can be formatted via toolbar buttons or keyboard shortcuts (Ctrl+B/I/U). The component tracks span offsets during editing and passes both text and spans to the onSave callback.

**Why not a full rich-text editor (Slate/ProseMirror):** The formatting needs are minimal (4 inline styles + links). A custom component with textarea + span tracking is ~150 lines vs 100KB+ for a rich-text library. Span offsets are simple to compute from textarea selection ranges.

**Alternatives considered:**

- Slate.js: heavy dependency, complex API, overkill for 4 inline styles
- contentEditable: browser inconsistencies make span tracking unreliable across browsers

### Decision 11: Drag-and-drop reordering at three levels

Sections, entries within sections, and bullets within entries are reorderable via @dnd-kit/core + @dnd-kit/sortable. Each draggable unit has a GripVertical icon handle (hidden until hover, hidden in diff mode). On drag end, the appropriate move/reorder operation is queued via editQueue.

- **Sections**: SortableSection wrapper in DocumentCanvas
- **Entries**: SortableEntry wrapper in SectionRenderer
- **Bullets**: SortableBullet wrapper in EntryRenderer

Drag handles are hidden in diff/changes view mode. All reorders are optimistic (immediate UI update + debounced API call).

**Why @dnd-kit:** Mature React dnd library with accessibility support, smooth animations, and sortable presets. Unlike react-beautiful-dnd, it's actively maintained and supports React 18+.

### Decision 12: PDF compilation via HTTP microservice

The latex container runs a Python HTTP server (`compile_server.py`) on port 9777 instead of `sleep infinity`. The `LatexCompiler` class sends an HTTP POST with tex_source + document_id and receives the compiled PDF bytes. This replaces the previous `docker exec latexmk` approach which required the Docker socket to be mounted in the backend container.

**Why not docker exec:** Docker CLI is not available inside the backend container, and mounting /var/run/docker.sock is a security risk. An HTTP service is lightweight (~50 lines of Python stdlib), uses the shared latex_work volume, and requires no new dependencies.

## Risks / Trade-offs

- **[Risk] LLM import produces incorrect or incomplete extractions.** Mitigation: Pydantic validation catches missing required fields. Side-by-side comparison lets the user review. Import is one-time — if it's wrong, the user re-imports with a corrected prompt.
- **[Risk] Generated LaTeX doesn't match the user's original template aesthetics exactly.** Mitigation: Ship an excellent default template. Users can customize the Jinja2 template file. For v1, template quality is "good enough" — professional output beats pixel-perfect reproduction of a custom template.
- **[Risk] User resists adopting a structured format after using raw LaTeX.** Mitigation: The LLM import makes migration zero-effort. The generated LaTeX is downloadable — users can still use their own toolchain. Structured editing is a value-add, not a lock-in.
- **[Risk] Span format filter produces unbalanced LaTeX braces.** Mitigation: The `span_format` Jinja2 filter uses a stack-based approach to wrap text segments and close all open groups. Unit test with edge cases (overlapping spans, empty spans, spans at boundaries).
- **[Risk] Path-based op addressing breaks if content is concurrently modified.** Mitigation: Same optimistic-update + conflict-resolution pattern from the current design (Decision 8 of document-model-overlay). Paths are validated before application; if a path no longer exists (e.g., entry was deleted), the op is rejected and surfaced.
- **[Trade-off] Section order is positional, not ID-based.** Moving a section changes indices of all subsequent sections. This is correct behavior — resume section order is a user choice, not a fixed property.
- **[Risk] LaTeX compilation service is single-process.** The compile_server.py uses Python's HTTPServer which handles one request at a time. Mitigation: Acceptable for MVP (one user at a time). Can be replaced with gunicorn or a multi-threaded server if needed.

## Migration Plan

1. **Database**: Add `content_json JSONB` column to `session_documents` (nullable). Existing rows keep `document_model_json` as legacy. New sessions write only `content_json`.
2. **API**: Session creation (`POST /api/sessions`) calls LLM import on master resume `.tex`, stores `ResumeContent` in `content_json`. Reads return `content_json` if present, else fall back to legacy `document_model_json`.
3. **Frontend**: `DocumentCanvas` checks response shape — if `content_json` is present, render from schema; if only `document_model_json`, render from legacy converter (to be deleted after migration).
4. **Rollback**: Revert API to read `document_model_json`. No data loss — legacy column preserved. Re-deploy old parser stack.
5. **Cleanup**: After all active sessions have `content_json`, drop `document_model_json` column and delete parser stack files. Target: 2 sprints. **Note:** The LaTeX compile container now runs `compile_server.py` (Python HTTP on port 9777) instead of `sleep infinity` to serve PDF compilation requests.

## Open Questions

- Whether to support the full `ResumeContent` replacement pattern (LLM returns entire modified content, server diffs to produce ops) as an alternative to typed ops. This would simplify the LLM prompt at the cost of token usage. Defer to implementation — benchmark both approaches.
- Whether `skill_rows` should be a list of typed strings (so individual skills can be dragged/reordered) vs a free string. Lean free string for v1; list-of-strings is a clean follow-up.
- Template customization UX: file editing only for MVP, or a template selector in settings? Lean file editing.
