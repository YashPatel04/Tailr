## Context

The application's central artifact is a resume, authored as `.tex` and tailored section-by-section, bullet-by-bullet against job descriptions. The first-version pipeline (`openspec/changes/resume-tailoring-app/`) parsed `.tex` into a flat token list with a regex tokenizer, walked it into a tree of `DocNode` subclasses, and gave the LLM a JSON patch protocol (`modify`/`insert`/`delete`/`move`/`ask`). It also shipped a generic serializer that regenerated `.tex` from typed nodes using a vocabulary map.

In practice the regex tokenizer drops every command's `{...}` argument on the floor (its trailing args group only allows whitespace before `{`, so `\section*{EDUCATION}` produces a content of `\section` and the args are lost as a stray text token). The extractor then writes `SectionNode(label=node.content)` so every section's label becomes the literal string `\section`. The same pattern empties every bullet (`\item <body>` → `BulletNode(text="")` with `<body>` escaping as sibling text tokens). The canvas renders the result — which is what the user sees today: a heading `\section`, empty bullets, and a soup of orphan strings between them.

The generic serializer also destroys layout glue it doesn't model (`\hfill`, `\\`, `[itemsep=-2pt]`, multi-line `\hypersetup`), so any LLM patch that lands produces a `.tex` whose template aesthetic is gone.

This change replaces the parser, extractor, document model, patch protocol, applier, serializer, and LLM prompt. It adds user-driven inline editing on the same op channel the LLM uses. The round-trip guarantee is moved from "byte-identical token tree" (which never held in practice) to "byte-faithful to unchanged regions, idiomatic-harvested for changed regions."

## Goals / Non-Goals

**Goals:**
- The canvas renders the user's actual resume — populated sections, populated entries with title/dates/role/location fields, populated bullets with formatted spans.
- LLM tailoring patches land on real, addressable typed content; round-trip preserves the user's template idiom.
- User can inline-edit any bullet, entry field (including swapping dates with location by drag), skill row, or section heading directly in the canvas.
- User can drag-and-drop to reorder sections, entries within a section, bullets within an entry, and fields within an entry's header layout.
- User edits and LLM edits flow through the same patch audit log with a `source` tag.
- Arbitrary LaTeX templates degrade gracefully: unknown constructs become opaque regions that still round-trip; nothing is blank, nothing is broken at export.

**Non-Goals:**
- A general-purpose LaTeX AST (we model the resume idiom, not arbitrary LaTeX).
- Live multi-user collaboration.
- Editing preamble/package configuration from the canvas (preamble stays opaque; users edit their template outside the app).
- Supporting `.docx`/`.txt` as master resume input (already restricted to `.tex` for the master; `.docx`/`.txt` remain export-only).
- Backfilling V2 documents for historical sessions eagerly (lazy re-parse on first access is fine).

## Decisions

### Decision 1: Byte-offset lexer, not a tree-sitter parser

A hand-written lexer walks `tex_source` once and produces a flat list of positioned tokens: `{type, name, start_byte, end_byte, content}`. The lexer:

- Recognizes comments (`%`), verbatim environments, inline/display math, commands (with their full `{}` arg groups preserved inside `content`), environment begin/end, groups, and text runs.
- Unlike the previous regex, the command token's `content` includes the args (so `\section*{EDUCATION}` ⇒ `content="\\section*{EDUCATION}"`; nothing leaks). Balancing is handled by greedy match up to balanced braces, not by a fixed regex.
- Maintains an environment stack tracking `\begin{name}` ↔ `\end{name}` nesting and annotating each token with its enclosing environment path.

**Why not tree-sitter-latex:** the previous task list named `tree-sitter-latex` but it was never used; the regex is what shipped. tree-sitter-latex is incomplete for resume-grade tokens (custom package options, resume-class idioms) and adds a binary dependency. A 250-line hand-written lexer is enough for the resume idiom and trivially inspectable.

### Decision 2: Recognizer catalog, not a fixed command map

`DocumentModelExtractor` becomes a registry of `Recognizer` classes. Each recognizer:

- Declares `can_claim(tokens_slice, env_path) -> bool` — does this recognizer own the run of tokens starting at this position?
- Declares `claim(tokens_slice, env_path, source_bytes) -> Region` — consume a contiguous run of tokens and produce one Region with `slice` (start of first token, end of last) plus a typed payload.
- Recognizers run in priority order; first match wins per region. `OpaqueRecognizer` is always last — it absorbs anything the others didn't claim and produces an `OpaqueRegion` (round-trips bytes, no typed payload, never LLM-editable).

Shipped recognizers (priority order):

1. `PreambleRecognizer` — owns everything from the first byte through the `\begin{document}` boundary (header macros, package loads, `\hypersetup`, `\pagestyle`). Emits one opaque region.
2. `HeaderRecognizer` — owns the `\begin{center} … \end{center}` block (name + contact line). Emits a `HeaderRegion` with name + structured contact fields.
3. `SectionRecognizer` — owns `\section*{...}`/`\section{...}`/`\subsection{...}`/`\cvsection{...}`/`\resumesection{...}`. Emits a `SectionRegion(label)`.
4. `EntryRecognizer` — owns the run of "header line + optional `itemize` block" that forms one experience/research/project entry. Heuristically parses the header line into `title`, `role`, `organization`, `dates`, `location`, `link` fields and the itemize into bullet children. Emits an `EntryRegion`.
5. `SkillRowRecognizer` — owns the `\textbf{Category:} <items> \\` line shape. Emits a `SkillRowRegion(category, items)`.
6. `BulletRecognizer` — owns one `\item <body>` inside an itemize. Emits a `BulletRegion(text, spans)` where `text` is the *parsed* bullet body (not empty) and `spans` is computed from `\textbf`/`\textit`/`\underline`/`\texttt`/`\href`.
7. `OpaqueRecognizer` — fallback for everything else (orphan `\\`, `\hfill`, `\noindent`, stray comments, unrecognized macros). Emits an `OpaqueRegion`.

The catalog is **extensible**: when the user uploads a `moderncv` resume, ship a `CvEntryRecognizer` for `\cventry{...}{...}{...}{...}`. Unknown templates never break the pipeline — they just produce more opaque regions and fewer typed regions. The model degrades *gracefully*, not catastrophically.

### Decision 3: Region tree with verbatim slices, not a typed-only DocNode tree

Each `Region` carries:

```
Region
  id: str                          ← stable, deterministic
  type: "root"|"preamble"|"header"|"section"|"entry"|"bullet"|"skill_row"|"opaque"
  slice: (start_byte, end_byte)     ← into tex_source
  text: str | None                 ← parsed, for typed regions (else None)
  spans: list[SpanAnnotation]      ← offsets into text
  fields: dict[str, Field] | None  ← only Entry/Header: title, role, dates, location, link, etc.
  layout: list[list[FieldRef|"hfill"]] | None  ← only Entry/Header: how to lay fields out across lines
  children: list[Region]
  emits_override: str | None       ← if this region's content was mutated, its new bytes live here
  metadata: dict
```

Two facts live on one node:
1. A **verbatim byte-slice** into the original `tex_source` → round-trip insurance.
2. A **parsed typed payload** (`text`, `spans`, `fields`, `layout`) → frontend rendering + LLM addressing + canvas editing.

The tree contains **no absolute offsets that must be maintained**. Slice positions are only authoritative for `tex_source` materialization; the emitter always re-walks the tree in traversal order and either replays the original slice or substitutes `emits_override`.

### Decision 4: Surgical serializer, not generic regeneration

`serialize_to_tex(regions, source_bytes) -> str` walks the Region tree once and produces `.tex` bytes by:

- For each region: if `emits_override is not None`, emit those bytes; else emit `source_bytes[start:end]`.
- For `Entry`/`Header` regions whose layout was edited, re-emit the header lines from `layout`: walk each line, join `fields` with `\hfill` spacers automatically placed between non-empty slots, terminate each line with `\\`. Bold/italic wrapping travels with the field's `spans` (emitted by a tiny `format_to_tex(field.text, field.spans)` helper).
- For `Bullet` regions with `emits_override`: re-emit `\item <text-with-span-wrappers>` using the local itemize's exact opening options (e.g. `[itemsep=-2pt]`), harvested verbatim from a sibling bullet's slice.
- For inserted bullets/entries: harvest the user's own idiom from a neighboring region's slice (same `\begin{itemize}[...]`, same `\\` rhythm, same `\hfill` placement). The result reads as if the user wrote it.
- For moved regions: re-emit the regions in the new tree-traversal order — no offset bookkeeping.

Layout glue (`\\`, `\hfill`, `\noindent`, `\item`, `\begin`/`\end` of itemize) is **serializer-managed and never stored as a draggable node**. The user manipulates *intent* ("dates on the right of title"); the serializer translates that intent into LaTeX glue.

### Decision 5: Typed op catalog, source-tagged, single applier

Replace the 5-op `modify`/`insert`/`delete`/`move`/`ask` patch with a typed catalog:

```
ReplaceText(target, text, spans)
UpdateFieldSpans(target_field, spans)
InsertBullet(parent_entry, after, text, spans)
DeleteBullet(target)
MoveBullet(target, after)
MoveField(entry, field, line, slot)
UpdateLayout(entry, layout)
InsertEntry(section, after, template)
DeleteEntry(target)
MoveEntry(target, after)
InsertSection(after, label)
DeleteSection(target)
Ask(question, context)
SplitBullet(target, at_offset)
MergeBullets(target)
```

Every `Patch` carries a `source: "user" | "llm" | "import"` field. The applier:

1. Deep-copies the Region tree.
2. Validates op references (target/parent/after IDs exist; no field moved into a non-Entry; no section moved into itself).
3. Mutates the tree; for any region whose typed payload changed, sets `emits_override` to the freshly-harvested bytes.
4. Returns the new tree + a `DiffChangeSet` for the audit log.

The same applier serves both `POST /api/sessions/{id}/chat` (LLM path, `source="llm"`) and `PATCH /api/sessions/{id}/document` (user path, `source="user"`). One Patch row, one version chain, one audit log. The UI surfaces the `source` column as a badge per change.

### Decision 6: Entry header is a field layout, not a string

An experience/research/project entry header is modeled as:

```
EntryRegion {
  fields: {
    "f1": {kind:"title",     text:"TrendAI",                       spans:[bold]},
    "f2": {kind:"dates",     text:"June 2026 – August 2026",      spans:[bold]},
    "f3": {kind:"role",      text:"Software Engineering Intern",   spans:[italic]},
    "f4": {kind:"location",  text:"Austin, TX",                    spans:[italic]},
  },
  layout: [
    ["f1", "hfill", "f2"],     ← line 1: title pushed left, dates pushed right
    ["f3", "hfill", "f4"],     ← line 2: role pushed left, location pushed right
  ],
  bullets: [BulletRegion...]
}
```

`MoveField(entry="ent-1", field="f4", line=1, slot="right")` + `MoveField(entry="ent-1", field="f2", line=2, slot="right")` swaps dates and location. Serializer re-emits `\textbf{TrendAI} \hfill \textit{Austin, TX} \\ \textit{Software Engineering Intern} \hfill \textbf{June 2026 – August 2026}`. Bold/italic travels with the field — `\textbf` vs `\textit` is part of `spans`, not part of the layout. The user can also inline-edit any field's text via `contentEditable` → `ReplaceText(target=field_id, …)`.

The same shape powers the header block (`name` field + contact fields) and skill rows (`category` field + `items` field).

### Decision 7: Typed-JSON LLM contract (no raw LaTeX in either direction)

The LLM receives a JSON view of the Region tree, not the `.tex` source:

```json
{
  "sections": [
    {
      "id": "sec-3",
      "label": "EXPERIENCE",
      "entries": [
        {
          "id": "ent-1",
          "fields": {
            "title":   {"text": "TrendAI", "spans": [{"range":[0,6],"formats":["bold"]}]},
            "dates":   {"text": "June 2026 – August 2026", "spans": [{"range":[0,22],"formats":["bold"]}]},
            "role":    {"text": "Software Engineering Intern", "spans": [{"range":[0,28],"formats":["italic"]}]},
            "location":{"text": "Austin, TX", "spans": [{"range":[0,10],"formats":["italic"]}]}
          },
          "layout": [["title","hfill","dates"],["role","hfill","location"]],
          "bullets": [
            {"id":"bul-1","text":"Engineered and shipped a migration of network firewall...","spans":[{"range":[38,53],"formats":["bold"]},…]}
          ]
        }
      ]
    },
    {
      "id":"sec-2","label":"TECHNICAL SKILLS",
      "skill_rows":[
        {"id":"sk-1","category":"Programming Languages","items":"Python, TypeScript, Java, C++, HTML, CSS, TailwindCSS"}
      ]
    }
  ]
}
```

Spans are explicit `{"range":[start,end],"formats":[...]}` — the LLM doesn't infer formatting from tokens. Field roles are explicit via dict keys — the LLM doesn't guess which line is a title vs dates. The LLM emits typed ops against the documented catalog, never raw `.tex`. The surgical serializer translates back. Smaller prompt, smaller response, fewer hallucinations than asking the LLM to produce LaTeX.

SSE event pipeline (`researching` / `research_done` / `thinking` / `writing` / `done`) is preserved. The `writing` event streams partial typed-op JSON; the frontend can show a "writing bullets…" progress hint per section being edited.

### Decision 8: User editing surface = contentEditable + drag, NOT a heavy rich-text editor

The canvas stays lightweight (Decision 9 from the original design holds). Each typed thing is a normal React element:

- `FieldChip` — `<span contentEditable>` bound to one field's `text` + `spans`. On blur/change fires `ReplaceText` or `UpdateFieldSpans`.
- `BulletRenderer` — `contentEditable` `<li>` with a hover toolbar (add sibling, delete, drag handle).
- `EntryRenderer` — header is a row of `FieldChip`s in the entry's `layout` order; drag-reorders chips within/across lines via `MoveField`. Hover toolbar (add entry, delete, drag handle).
- `SectionRenderer` — `contentEditable` heading for `label`; drag handle for section reorder.
- `SkillRowRenderer` — `contentEditable` category + items fields.
- `OpaqueNodeRenderer` — read-only (preamble / unknown macros / stray glue). Title attribute explains "Template-specific content — not editable."

Drag-and-drop uses `@dnd-kit/core` (already a familiar React lib; supports sensored reordering at multiple levels without dragging in a full rich-text framework). Optimistic-update store: mutate local tree, fire op, reconcile on ack. If the LLM lands a patch while the user has unsaved edits, the chat rail shows a conflict banner ("AI made changes — review / keep yours / keep AI's") instead of silently clobbering.

### Decision 9: `PATCH /api/sessions/{id}/document` mirrors the chat route shape

Request shape (用户-or-import path):

```json
{
  "operations": [ <typed ops> ]
}
```

The endpoint:
- Authenticates, fetches current `SessionDocument`.
- Loads the Region tree.
- Runs the applier (same as LLM path).
- Validates.
- Persists: new `SessionDocument` row with `version = N+1`, `parent_doc_id = current.id`, `document_model_json = regions_json`, `tex_source = serialize_to_tex(regions, source)`. Inserts a `Patch` row with `source="user"`, `applied=true`, `operations_json`.
- Returns the new document version + a `DiffChangeSet`.

LLM path (`/api/sessions/{id}/chat`) is unchanged structurally except for the op-schema swap and the source tag (`source="llm"`).

### Decision 10: Lazy migration of historical sessions

Old `SessionDocument.document_model_json` (in the legacy shape) is left untouched. On `GET /api/sessions/{id}` under V2:

- If the row has `document_model_v2_json` set, serve it.
- Else re-parse `tex_source` with the new pipeline, write the result to `document_model_v2_json` (do NOT overwrite the legacy column), and serve the new shape.

This preserves the audit history and lets us delete the legacy path once every active session has V2 data. Migration cost is one parse per session per user — trivial.

## Risks / Trade-offs

- **[Risk] Recognizer heuristics mis-parse exotic entries.** A custom `\cvitem{...}{...}` style might not match `EntryRecognizer`'s header-line heuristic and fall through to `OpaqueRecognizer`. Mitigation: the catalog is extensible; ship a `CvItemRecognizer` for known templates. Crucially, a mis-parse degrades to opaque, which still round-trips and still exports — never blank canvas, never broken PDF. The user sees "I couldn't parse this as an entry — it's there but not AI- or manually-editable."

- **[Risk] Surgical serializer produces non-compiling `.tex`.** Re-emitting a bullet with mid-string spans could produce mismatched braces. Mitigation: a `{format_to_tex(text, spans)}` helper that balances `\textbf{...}` wraps on whitespace boundaries; a round-trip test that compiles re-emitted bytes through the existing latex container as part of the test suite. On compile failure, fall back to emitting the original slice and surface "couldn't safely rewrite this region" to the LLM/chat.

- **[Risk] User + LLM edits collide.** Inside one session the user is mid-edit while an LLM tailoring patch arrives. Mitigation: optimistic-update store tracks "in-flight user ops"; on LLM patch arrival, if there are pending user ops, hold the LLM patch and surface a conflict banner. The user resolves (keep mine / keep AI's / merge). No silent clobber.

- **[Risk] Span offsets drift after a `ReplaceText` op.** Once text changes, any spans stored against the old text are invalid. Mitigation: `ReplaceText` *requires* spans in the op payload (either recomputed by the LLM/canvas where the edit happened, or empty). The applier does not "carry over" old spans.

- **[Risk] Migrating lazy sessions on a slow parser.** If a user has 100 old sessions, the first open of each re-parses. Mitigation: parsing a 5-page resume should be ≤50ms; even 100 sessions costs 5s total. Acceptable. If parsing ever does turn out slow, a background job can pre-warm V2 documents.

- **[Trade-off] Drag-and-drop glue is serializer-managed, not user-managed.** Users cannot drag `\hfill` directly. This restrictions keeps the model coherent (the user manipulates intent; the serializer manages glue). If advanced users complain, expose a future `UpdateLayout` op with raw-glue overrides behind the same audit channel — but not for v1.

- **[Trade-off] Preamble stays opaque.** Users cannot edit `\documentclass`, package options, or `\hypersetup` from the canvas. Editing the template happens outside the app (it's their `.tex` file). This keeps the editing surface resume-shaped instead of LaTeX-shaped.

## Open Questions

- Whether the conflict UX (user-pending-meets-LLM-arrived) should auto-resolve to "last-writer-wins" with an undo, vs always require explicit choice. Leaning explicit for v1; revisit after user testing.
- Whether `import` as a `Patch.source` is needed in v1 (e.g. accepting a `.tex` patch upload mid-session) — deferring until concrete need.
- Whether skill-row `items` should be a typed list of strings (so users can drag individual skills) vs a free string. Leaning free string for v1; list-of-strings is a clean follow-up via a new `SplitSkillRow` op.