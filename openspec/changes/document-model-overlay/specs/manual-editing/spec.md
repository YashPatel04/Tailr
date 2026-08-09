## ADDED Requirements

### Requirement: First-class inline manual editing in the canvas

The system SHALL let the user edit the document directly in the canvas at the level of typed regions: section labels, entry header fields, bullets, skill row categories and items, and the system's single `name` field. Each editable thing is a `contentEditable` React element bound to its Region's typed payload; on commit (blur or Enter), the frontend fires a `ReplaceText` op through the same patch channel the LLM uses. Edits SHALL persist as new `SessionDocument` versions with a `Patch` row tagged `source="user"`, so the audit history stitches user edits and LLM tailoring into one stream.

#### Scenario: User edits a bullet inline

- **WHEN** the user clicks into the bullet `bul-3`, types new text, and presses Enter or blurs focus
- **THEN** the frontend posts `{"source":"user","operations":[{"op":"replace_text","target":"bul-3","text":"<new>","spans":[]}]}` to `PATCH /api/sessions/{id}/document`; applier sets `emits_override`, the surgical serializer re-emits, a new SessionDocument version + Patch row (source="user") are persisted, the canvas reconciles from the server response, and the audit history shows a "you" badge on the change

#### Scenario: User edits the section heading

- **WHEN** the user clicks into the section `sec-1` heading and re-types the label from "EDUCATION" to "Education Background"
- **THEN** a `ReplaceText` op against `sec-1.text` is fired; the serializer re-emits `\section*{Education Background}` in the section's `emits_override`; the new version is persisted

#### Scenario: User edits a skill row category

- **WHEN** the user clicks into the category field of `sk-1` and changes "Programming Languages" to "Languages"
- **THEN** a `ReplaceText` op against the category field fires; `sk-1.emits_override` carries the new `\textbf{Languages:} ...` line; the new version is persisted

#### Scenario: User edits the resume's name

- **WHEN** the user clicks the header name field and changes "YASH PATEL" to "Yash Patel"
- **THEN** the op targets the HeaderRegion's `name` field; the serializer re-emits the `\begin{center} {\LARGE \textbf{Yash Patel} …` block; the new version is persisted

### Requirement: Drag-and-drop reordering at section, entry, bullet, and field levels

The system SHALL let the user drag-and-drop to reorder: (1) whole sections inside the document, (2) whole entries within a section, (3) bullets within an entry, and (4) entry header fields across the entry's layout lines. Each drag emits a typed op (`MoveSection` / `MoveEntry` / `MoveBullet` / `MoveField`) through the same patch channel as LLM edits. Layout glue (`\hfill`, `\\`, `\item`, `\begin`/`\end`) is NOT a draggable thing — it is serializer-managed, derived from the user's intent. The user manipulates which "thing" goes in which "place"; the serializer manages the LaTeX glue required to express that intent.

#### Scenario: User reorders two top-level sections

- **WHEN** the user drags the EXPERIENCE section header above the TECHNICAL SKILLS section header
- **THEN** a `MoveSection(target="sec-3", after="sec-1")` op fires; the surgical serializer re-emits `tex_source` with the EXPERIENCE block appearing between EDUCATION and TECHNICAL SKILLS; the new version is persisted

#### Scenario: User reorders entries inside EXPERIENCE

- **WHEN** the user drags the Stetson entry card above the TrendAI entry card
- **THEN** a `MoveEntry(target="ent-2", after="sec-3")` op fires (placing it as the first entry under the section); the serializer re-emits the section in the new order

#### Scenario: User reorders bullets inside an entry

- **WHEN** the user drags `bul-3` (the Grafana bullet) up to position 1 inside the TrendAI entry
- **THEN** a `MoveBullet(target="bul-3", after="ent-1")` op fires (placing it as the first child); the serializer re-emits the itemize block in the new order using the entry's harvested `\begin{itemize}[itemsep=-2pt]` idiom

#### Scenario: User swaps two header fields by drag (the dates↔location case)

- **WHEN** the user drags the "Austin, TX" field chip up to line 1 right side and drags "June 2026 – August 2026" chip down to line 2 right side, in the TrendAI entry header
- **THEN** two `MoveField` ops fire in sequence (`field="location", line=1, slot="right"` and `field="dates", line=2, slot="right"`); the serializer re-emits the entry header as `\textbf{TrendAI} \hfill \textit{Austin, TX} \\ \textit{Software Engineering Intern} \hfill \textbf{June 2026 – August 2026}`; bold/italic travel with the field's spans (date keeps `\textbf`, location keeps `\textit`)

#### Scenario: User cannot drag the hfill directly

- **WHEN** the user attempts to drag the visible inter-chip spacer (representing an `\hfill`) on its own
- **THEN** the spacer is not draggable; the only draggable things in the entry header are real fields; the spacer is rendered as a flex distributed gap, not a chip

### Requirement: Hover toolbars for add/remove/move on typed regions

The system SHALL surface hover toolbars on each typed region (section, entry, bullet, skill row, header) exposing: (a) a drag handle for reordering, (b) an `add` action where applicable (`+ bullet` on an entry, `+ entry` on a section, `+ section` on the document), (c) a `delete` action (`×` on each typed region except the resume's `name`). Each toolbar action fires a typed op through the same patch channel. Preamble, environment glue, and unknown macros are NOT given toolbars — opaque regions are not editable.

#### Scenario: User adds a bullet to an entry via hover toolbar

- **WHEN** the user hovers the TrendAI entry and clicks the "+ bullet" action
- **THEN** an `InsertBullet(parent_entry="ent-1", after=<last bullet id>, text="", spans=[])` op fires; the new bullet appears as an empty `contentEditable` ready to type; the audit history shows a "you" badge

#### Scenario: User deletes an entry

- **WHEN** the user hovers the SignStream entry and clicks the delete (`×`) action
- **THEN** a `DeleteEntry(target="ent-3")` op fires; the surgical serializer re-emits the section without the SignStream block (including its surrounding `\\` and itemize glue, which the serializer correctly cleans up); the new version is persisted

#### Scenario: User adds a new section

- **WHEN** the user hovers the last section's toolbar and clicks "+ section"
- **THEN** an `InsertSection(after=<last section id>, label="NEW SECTION")` op fires; the surgical serializer clones the most neutral existing section's `\section*{...}` idiom and inserts a new empty section; the canvas renders the new section with the label as an editable heading

### Requirement: PATCH endpoint for user-initiated document edits

The system SHALL expose `PATCH /api/sessions/{session_id}/document` accepting a JSON body `{"operations":[<typed ops>]}`. The endpoint SHALL: authenticate; load the latest `SessionDocument` from the DB; deserialize the Region tree from `document_model_json`; run the same applier as the LLM chat path; validate; persist a new `SessionDocument` row (`version+1`, `parent_doc_id`=current, `tex_source`=surgical serializer output, `document_model_json`=new Region tree); insert a `Patch` row with `source="user"`, `applied=true`, `operations_json`=ops, `raw_llm_response=NULL`. The endpoint SHALL return the new document version ID, the materials, and a `DiffChangeSet`. CSRF protection SHALL apply (the `X-CSRF-Token` header must match the `csrf_token` cookie).

#### Scenario: Apply a single ReplaceText op via PATCH

- **WHEN** the canvas posts `{"operations":[{"op":"replace_text","target":"bul-1","text":"Edited text","spans":[]}]}` to `PATCH /api/sessions/abc/document`
- **THEN** the endpoint returns `{"document_id":"<new>","version":2,"diff":{"added":[],"removed":[],"modified":[{"id":"bul-1","old_text":"…","new_text":"Edited text"}],"moved":[]}}`

#### Scenario: Reject op with validation error

- **WHEN** the canvas posts an op referencing a nonexistent target ID
- **THEN** the endpoint returns `422` with `{"detail":{"validation_errors":[{"operation_index":0,"message":"Target ID 'bul-99' not found"}]}}` and does NOT persist a new version

#### Scenario: CSRF enforced on PATCH

- **WHEN** a `PATCH /api/sessions/{id}/document` request is received without `X-CSRF-Token` header or with a mismatched value vs the `csrf_token` cookie
- **THEN** the CSRF middleware rejects the request with `403` before the route handler runs

### Requirement: Optimistic-update store for canvas edits

The frontend SHALL maintain a Zustand store that mirrors the document Region tree and tracks in-flight user ops. When the user commits an edit: (a) the store optimistically mutates the local tree (the canvas updates instantly), (b) the op is fired to `PATCH /api/sessions/{id}/document`, (c) on `200` the store reconciles from the server response (spans, ids, version), (d) on `422` the store rolls back to the pre-op tree and surfaces the validation error as a toast, (e) on network failure the store retries once with exponential backoff, then rolls back and surfaces an error.

#### Scenario: Optimistic update applied and reconciled

- **WHEN** the user edits a bullet's text and the PATCH returns `200`
- **THEN** the local tree already shows the new text before the response arrives; the response updates any server-assigned spans and the new `version` number; the audit badge "you" appears next to the bullet

#### Scenario: Optimistic update rolled back on validation failure

- **WHEN** the user's edit fails server-side validation
- **THEN** the local tree reverts to its pre-edit state, the canvas briefly highlights the region in Proof-Red, and a toast shows the validation error message

### Requirement: Conflict detection between user and LLM in-flight edits

The system SHALL detect when an LLM patch arrives (via the SSE `writing`/`done` event) while the user has unsaved local edits in the optimistic-update store. In that case the chat rail SHALL surface a conflict banner ("AI made changes — Keep mine / Keep AI's / Review") instead of silently clobbering the user's edits. The user's choice resolves the conflict by replaying either the user's pending ops or the LLM's patch as the new HEAD of the version chain.

#### Scenario: LLM patch arrives while user has pending bullet edit

- **WHEN** the user is mid-edit on `bul-3` (text typed but not yet blurred/committed) and the SSE `done` event arrives with a patch that also targets `bul-3`
- **THEN** the chat rail shows a conflict banner; the canvas does NOT immediately apply the LLM's patch; the user chooses to keep their edit (their ReplaceText op is fired; the LLM patch is recorded in the audit history as `applied=false` with reason `user_preferred_local`), keep the AI's (the LLM patch is applied; the user's pending edit is discarded), or cancel

#### Scenario: No conflict when LLM targets a region the user is not editing

- **WHEN** the user is editing `bul-3` and the LLM patch only touches `bul-7`
- **THEN** the LLM patch is applied normally without a conflict banner; the user's pending edit on `bul-3` is staged and fires on their next commit; both edits become `Patch` rows under consecutive versions

### Requirement: Source-tagged audit history surfaced in the UI

The system SHALL surface the `source` field of every Patch row in the audit history / diff view. Each change SHALL be tagged "you" for `source="user"`, "AI" for `source="llm"`, and (if v1 supports it) "import" for `source="import"`. Hovering a badge SHALL reveal the timestamp and the patch's triggering chat message (if any). The badge lives next to the edited region and in the diff timeline.

#### Scenario: Diff banner tags each change by source

- **WHEN** the user toggles between two versions in the diff view and the version chain contains one user edit (ReplaceText on `bul-3`) and one AI patch (MoveSection)
- **THEN** the diff view renders the ReplaceText change with a "you" badge and the MoveSection change with an "AI" badge, in chronological order
