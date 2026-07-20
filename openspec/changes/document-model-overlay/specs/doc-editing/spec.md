## MODIFIED Requirements

### Requirement: Accept typed operations from user or LLM
The system SHALL accept a JSON patch containing an array of typed operations. The supported operations are documented in the typed op catalog: `ReplaceText`, `UpdateFieldSpans`, `InsertBullet`, `DeleteBullet`, `MoveBullet`, `MoveField`, `UpdateLayout`, `InsertEntry`, `DeleteEntry`, `MoveEntry`, `InsertSection`, `DeleteSection`, `SplitBullet`, `MergeBullets`, and `Ask`. Every Patch MUST carry a `source` field with one of `"user"`, `"llm"`, `"import"`. The applier validates every op before mutating the Region tree.

#### Scenario: Apply a user ReplaceText op to a bullet
- **WHEN** the frontend sends `{"source":"user","operations":[{"op":"replace_text","target":"bul-3","text":"Updated bullet text","spans":[],"reasoning":"manual edit"}]}`
- **THEN** the applier sets `bul-3.text="Updated bullet text"`, sets `bul-3.spans=[]`, sets `bul-3.emits_override` to the harvested bullet-byte form, the new Region tree is persisted as a new `SessionDocument` version, and a `Patch` row with `source="user"` and `applied=true` is recorded

#### Scenario: Apply an LLM MoveField swap op
- **WHEN** the LLM returns operations `{"op":"move_field","entry":"ent-1","field":"dates","line":2,"slot":"right"}` and `{"op":"move_field","entry":"ent-1","field":"location","line":1,"slot":"right"}`
- **THEN** the applier updates `ent-1.layout` to swap dates↔location across the two lines, sets `ent-1.emits_override` to the re-emitted header lines (`\textbf{TrendAI} \hfill \textit{Austin, TX} \\ \textit{Software Engineering Intern} \hfill \textbf{June 2026 – August 2026}`), persists the new Region tree, and records a `Patch` with `source="llm"`

#### Scenario: Apply a user InsertBullet op
- **WHEN** the user clicks the "+ bullet" hover button on entry `ent-1`
- **THEN** the frontend fires `{"op":"insert_bullet","parent_entry":"ent-1","after":"bul-2","text":"","spans":[]}`; the applier inserts a new `BulletRegion` with a fresh id (e.g. `bul-gen-ent-1-1`) after `bul-2`, the entry's `emits_override` is re-emitted, and an editable empty bullet appears in the canvas

#### Scenario: Reject a patch referencing a nonexistent target
- **WHEN** any op references a Region `id` (as `target`, `parent`, `after`, `entry`, or `field`) that does not exist in the current document
- **THEN** the applier returns a `ValidationResult` with `valid=false` and an error naming the invalid ID; no mutation occurs; if `source="llm"` the chat endpoint sends a retry prompt; if `source="user"` the frontend rolls back its optimistic update and surfaces the error

#### Scenario: Reject a patch that creates a cycle
- **WHEN** a `MoveSection` op would reparent a section into one of its own descendants
- **THEN** the applier returns a cycle-detection validation error and does not mutate

#### Scenario: Apply an Ask op
- **WHEN** the patch contains `{"op":"ask","question":"Do you have Kubernetes experience? The JD requires it."}`
- **THEN** the applier halts further ops, the chat rail surfaces the question as an assistant message, the document is not mutated past the `ask` op, and the user's reply drives the next patch

### Requirement: Validate ops against the typed op catalog
The system SHALL validate each op against the typed op catalog before applying. Validators SHALL check: target/parent/after/entry/field IDs exist where required; the referenced Region is of the expected type (e.g. `MoveField` requires `entry` to be an `EntryRegion` and `field` to be a real field id on that entry); `MoveSection` does not create cycles; `ReplaceText` text length does not exceed a configured limit (default 4000 chars per node); `InsertEntry`/`InsertSection` `template` values are valid.

#### Scenario: Reject MoveField against a non-Entry
- **WHEN** an op `{"op":"move_field","entry":"bul-2","field":"title","line":1,"slot":"right"}` is submitted
- **THEN** validation fails with "Region 'bul-2' is not an EntryRegion"

#### Scenario: Reject ReplaceText with oversized text
- **WHEN** an op submits `text` of length 4500 against a single bullet
- **THEN** validation fails with "Text exceeds 4000 character limit per node"

### Requirement: Typed op catalog (canonical list)
The system SHALL support the canonical typed op catalog. Each op has a fixed, documented request shape consumed by both the LLM chat path (`POST /api/sessions/{id}/chat`, `source="llm"`) and the user canvas path (`PATCH /api/sessions/{id}/document`, `source="user"`). Recognized ops:

- `ReplaceText(target, text, spans)`
- `UpdateFieldSpans(target_field, spans)`
- `InsertBullet(parent_entry, after, text, spans)`
- `DeleteBullet(target)`
- `MoveBullet(target, after)`
- `MoveField(entry, field, line, slot)`
- `UpdateLayout(entry, layout)`
- `InsertEntry(section, after, template)`
- `DeleteEntry(target)`
- `MoveEntry(target, after)`
- `InsertSection(after, label)`
- `DeleteSection(target)`
- `SplitBullet(target, at_offset)`
- `MergeBullets(target)`
- `Ask(question, context)`

Any op outside this catalog SHALL be rejected with an "Unknown op" validation error.

#### Scenario: Apply MoveSection to reorder whole sections
- **WHEN** an op `{"op":"move_section","target":"sec-3","after":"sec-1"}` is submitted
- **THEN** the applier reorders the children of the root Region so `sec-3` follows `sec-1`'s old position, and the surgical serializer emits `tex_source` with the EXPERIENCE block appearing between EDUCATION and TECHNICAL SKILLS

#### Scenario: Apply SplitBullet to break a long bullet in two
- **WHEN** an op `{"op":"split_bullet","target":"bul-1","at_offset":120}` is submitted against a 250-character bullet
- **THEN** the applier splits `bul-1`'s text at character 120, preserves spans accordingly, and inserts a new sibling bullet after `bul-1` carrying the remainder

### Requirement: Maintain document version chain (unchanged semantics, Region-tree contents)
The system SHALL continue tracking a version chain per session via `SessionDocument.parent_doc_id`. Each accepted Patch (user or LLM) produces a new `SessionDocument` row with `parent_doc_id` pointing to its predecessor and `version` incremented. Diff computation operates between any two versions in the chain by comparing Region trees. The version chain semantics are unchanged from the legacy design; only the storage shape of `document_model_json` changes.

#### Scenario: Create version chain on first tailoring
- **WHEN** the user accepts the first tailoring patch in a session
- **THEN** a new SessionDocument row is created with `parent_doc_id` = the initial document, `version` = 1, and `document_model_json` = the mutated Region tree

#### Scenario: Branch from any version
- **WHEN** the user starts a tailoring session from a non-latest version
- **THEN** the system creates a child document branching the version chain from that point

### Requirement: Apply patches to master resume selectively (unchanged)
The system SHALL allow the user to selectively push individual patch operations from a tailored document back to their master resume. Only the selected ops are applied. The behavior is unchanged from the legacy design; ops now use the typed catalog and the master resume's Region tree.

#### Scenario: Push a single improved bullet to master
- **WHEN** the user clicks "Apply to master" on a modified bullet in a tailored resume
- **THEN** only that `ReplaceText` op is applied to the master resume's Region tree, `tex_source` is re-emitted surgically, and a `Patch` row with `source="import"` is recorded against the master

### Requirement: Store patches with source and metadata
The system SHALL store every patch with its operations, the raw source-of-truth response (LLM raw response for `source="llm"`; serialized ops for `source="user"`/`source="import"`), the triggering chat message (for `source="llm"`) or null (for `source="user"`), the `source` enum, and an `applied` flag. This enables debugging, audit, and the "edited by you / AI" UI badges.

#### Scenario: Record a user-initiated canvas edit
- **WHEN** the user submits a `PATCH /api/sessions/{id}/document` request with `source="user"`
- **THEN** a `Patch` row is written with `source="user"`, `applied=true`, `operations_json` = the submitted ops, `raw_llm_response` = NULL, `user_message` = NULL, `target_doc_id` = the new SessionDocument

#### Scenario: Show source badges in the audit history
- **WHEN** the user opens the diff view between two document versions
- **THEN** the UI renders each change with a "you" badge if its Patch row has `source="user"` and an "AI" badge if it has `source="llm"`

### Requirement: Surgical serializer materializes tex_source from regions
The system SHALL serialize a Region tree to `.tex` bytes by walking the tree in traversal order and emitting, per region, either the original `tex_source[start:end]` slice (when the region has no `emits_override`) or the `emits_override` bytes (when present). For `Entry`/`Header` regions whose `layout` was edited, the serializer re-emits the header lines from `layout`, automatically inserting `\hfill` spacers between non-empty slots of the same line and `\\` line terminators between lines. The serializer MUST NOT regenerate untouched regions. The serializer harvests idioms (itemize options, `\hfill` placement, `\\` style) from sibling regions' slices when re-emitting inserted or layout-modified regions.

#### Scenario: Round-trip a parsed-but-unchanged resume
- **WHEN** a resume is parsed into a Region tree and serialized back without any patch
- **THEN** the output bytes are byte-identical to the input `tex_source` — only original slices emit, in tree order

#### Scenario: Serialize a single modified bullet
- **WHEN** a patch on `bul-3` sets `text="Better phrasing"` and `emits_override` is computed
- **THEN** the serializer emits the original bytes for the preamble, header, and section, the entry's original header bytes, the original bytes of `bul-1` and `bul-2`, the `emits_override` bytes for `bul-3`, and the original bytes for `bul-4` onward — only `bul-3`'s line changes

#### Scenario: Serialize a layout swap reuses the entry's own idioms
- **WHEN** an entry's `layout` is modified by swapping two field slots between lines
- **THEN** the serializer re-emits the entry header using harvested idiom — same `\hfill` placement, same `\\` terminator, same bold/italic wrapping traveling with each field — and the surrounding preamble, sections, bullets emit verbatim