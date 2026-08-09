## 0. Conventions

- Backend code lives under `backend/app/services/latex/` and `backend/app/services/editing/`.
- Python 3.11+; Pydantic v2; async SQLAlchemy; type-annotate every public function.
- All parser/recognizer/serializer/applier changes must ship a pytest under `backend/tests/` before being marked done.
- Frontend edits stay under `frontend/app/components/document/`, `frontend/app/hooks/`, `frontend/app/stores/`.
- Work behind the `DOCUMENT_MODEL_V2=on` env flag (settings + frontend env). Legacy paths remain callable until teardown in §10.
- Sections 1-6 are backend-only and unblock sections 7-9. Section 7 is the user-edit PATCH endpoint; §8 is the LLM prompt swap; §9 is the frontend canvas. §10 migration, §11 teardown, §12 tests.

---

## 1. Backend: Byte-offset lexer

- [x] 1.1 Create `backend/app/services/latex/lexer.py` exporting `Token` (dataclass: `type`, `name`, `start_byte`, `end_byte`, `content`, `env_path`) and `LatexLexer` with `lex(source: bytes) -> list[Token]`.
- [x] 1.2 Implement tokenizer covering: comments (`%…$`), verbatim environments, inline math (`$…$`), display math (`$$…$$`, `\[…]`, equation env), commands (backslash + alphabetic name + greedy `{…}` arguments balanced by brace depth), environment begin (`\begin{name}…[options]`) and end (`\end{name}`), groups (`{…}`), and text runs.
- [x] 1.3 Maintain an environment stack; populate `env_path` on each token.
- [ ] 1.4 Reject input > 5 estimated pages by content-length heuristic; keep the existing `400` error contract. (deferred to §5 wire-up — not needed for lexer unit)
- [x] 1.5 Tests: `tests/services/latex/test_lexer.py` covering each token type, brace-balanced argument capture, environment stack nesting, verbatim non-escaping.

## 2. Backend: Region model + recognizer catalog

- [ ] 2.1 Create `backend/app/services/latex/region_model.py` with Pydantic models: `Span` (start, end, formats), `Field` (id, kind, text, spans, link), `Region` (id, type, slice, text, spans, fields, layout, children, emits_override, metadata), `ResumeDocument` (root Region + tex_source + vocabulary hint).
- [ ] 2.2 Create `backend/app/services/latex/recognizers/__init__.py` exposing `Recognizer` ABC (`can_claim`, `claim`), `RECOGNIZER_CATALOG` list in priority order.
- [ ] 2.3 Implement `PreambleRecognizer` — owns tokens from byte 0 through `\begin{document}`; emits one opaque region.
- [ ] 2.4 Implement `HeaderRecognizer` — owns a `\begin{center} … \end{center}` block; parses name (`\LARGE \textbf{…}` or first bold text) and contact fields (`\href{url}{label}`, phone/email/url runs); emits a `HeaderRegion` with `fields` + `layout`.
- [ ] 2.5 Implement `SectionRecognizer` — owns `\section*{…}`, `\section{…}`, `\subsection{…}`, `\cvsection{…}`, `\resumesection{…}`; emits a `SectionRegion(label=argument, text=argument)`.
- [ ] 2.6 Implement `EntryRecognizer` — owns the run of "header line(s) + optional itemize block" forming one entry entry. Parse the header lines into typed `Field`s: `title` (first bold), `dates` (second bold on first line), `role` (italic on second line), `organization` (any explicit `\hfill` right-side on lines, or detected via `EntityRecognizer` heuristic), `location` (last italic on second line right), `link` (`\href` in header). Build `layout` as `[[field_ids_with_hfill]]`. Bullets are recognized into children via `BulletRecognizer` (recursive). Emits an `EntryRegion`.
- [ ] 2.7 Implement `SkillRowRecognizer` — owns a single line matching `\textbf{Category:} <items> \\` where the rest after the colon is plain text (possibly with nested `\textbf`); emits a `SkillRowRegion(category, items, spans)`.
- [ ] 2.8 Implement `BulletRecognizer` — owns one `\item <body>` inside an itemize. Parses `<body>` into `text` (concatenated plain text) + `spans` (computed from `\textbf`/`\textit`/`\underline`/`\texttt`/`\href` macros). Emits `BulletRegion(text, spans)`.
- [ ] 2.9 Implement `OpaqueRecognizer` (always last) — claims any leftover token run; emits `OpaqueRegion(slice, text=None)`.
- [ ] 2.10 Implement `DocumentModelExtractor.extract(tokens, source) -> ResumeDocument` that walks tokens once, splitting the stream at `claim` boundaries, producing a `root` Region with typed children.
- [ ] 2.11 Wire `lex + extract` into `parse_resume(source: bytes) -> ResumeDocument` helper exported from `backend/app/services/latex/__init__.py`.
- [ ] 2.12 Tests: `tests/services/latex/test_recognizers.py` with the sample master resume (full text in `tests/fixtures/sample_resume.tex`) asserting: 5 sections, 7+ entries, ~14 bullets, all non-empty `text`, sentiment-checked `layout` for the TrendAI entry header.

## 3. Backend: Surgical serializer

- [ ] 3.1 Create `backend/app/services/latex/surgical_serializer.py` exporting `serialize_to_tex(doc: ResumeDocument, source: bytes | None = None) -> tuple[str, list[dict]]` returning emitted bytes + per-region warnings.
- [ ] 3.2 Implement `format_to_tex(text: str, spans: list[Span]) -> str` that wraps spanned substrings in the format macros (`\textbf{}`, `\textit{}`, `\underline{}`, `\texttt{}`, `\href{url}{}`). Wrap on whitespace-aware boundaries to avoid broken braces.
- [ ] 3.3 Implement `emit_entry_header(entry)` that walks `layout` and emits each line as `<field text> \hfill <field text> \\`, reusing `format_to_tex` per field; honor field's `link` (emit `\href{url}{<formatted text>}`).
- [ ] 3.4 Implement idiom-harvest: for inserted bullets, look up the parent entry's first existing bullet's slice to copy the exact `\begin{itemize}[options]` opener. For inserted entries, harvest a sibling entry's outer idiom (header line shape, optional itemize wrapper) by sampling source bytes.
- [ ] 3.5 Implement `materialize(doc, source)` — walk the Region tree in traversal order; for each region, if `emits_override is not None` emit it, else emit `source[start:end]`; collect warnings on fallback cases.
- [ ] 3.6 Implement fallback: when re-emit validation fails (a simple internal `compile-check` of just the modified region against a balancer heuristic), emit the original slice bytes and append `{"region_id":…, "warning":"couldn't safely rewrite this region"}` to the warnings list.
- [ ] 3.7 Tests: `tests/services/latex/test_surgical_serializer.py` — (a) identity round-trip (no edits → byte-identical output), (b) single-bullet edit → only that bullet's line changes, (c) layout swap → entry header reformatted with harvested idiom, (d) section move → blocks reordered verbatim, (e) surgical output compiles via the latex container in CI.

## 4. Backend: Typed op catalog + applier + validator

- [ ] 4.1 Create `backend/app/services/editing/ops.py` with Pydantic models for every op in the catalog: `ReplaceText`, `UpdateFieldSpans`, `InsertBullet`, `DeleteBullet`, `MoveBullet`, `MoveField`, `UpdateLayout`, `InsertEntry`, `DeleteEntry`, `MoveEntry`, `InsertSection`, `DeleteSection`, `SplitBullet`, `MergeBullets`, `Ask`. A `Patch` model carries `source: Literal["user","llm","import"]` (default `"llm"`) and `operations: list[Union[…]]` (discriminated union by `op`).
- [ ] 4.2 Create `backend/app/services/editing/validator.py` reusing the existing pattern: id-existence, type-mismatch (e.g. `MoveField` against non-Entry), cycle detection on section/entry moves, 4000-char text limit, valid `template` on inserts. Return `ValidationResult(valid, errors[])`.
- [ ] 4.3 Rewrite `backend/app/services/editing/applier.py` to operate on a `ResumeDocument`: deep-copy tree; dispatch each valid op; mutate the Region tree; for regions whose text/spans/layout/fields changed, compute `emits_override` via the surgical serializer's per-region emitter and set it on the new Region; for moved/inserted/deleted regions, let the surgical serializer re-walk the tree. Return `(new_doc, DiffChangeSet)`.
- [ ] 4.4 Implement `DiffEngine` to compare two Region trees by id, classifying nodes as added/removed/modified/moved on the typed payload (text, spans, layout, fields).
- [ ] 4.5 Tests: `tests/services/editing/test_applier.py` covering every op: ReplaceText on a bullet, MoveField swap inside an entry header, InsertBullet on an entry, DeleteSection, SplitBullet, MergeBullets, and the MoveSection cycle rejection path.

## 5. Backend: Wire the new pipeline into session create + chat

- [ ] 5.1 In `backend/app/api/sessions.py` `create_session`, replace the legacy `LatexParser + DocumentModelExtractor + model_dump()` path with `parse_resume(master.tex_source.encode())`; store the Region tree as `document_model_json` (keyed `document_model_v2_json` when DOCUMENT_MODEL_V2=on, else `document_model_json`). Keep `tex_source` storage identical.
- [ ] 5.2 In `backend/app/services/llm/prompts.py`, rewrite `build_tailor_prompt` and `_document_to_dict` to produce the typed-JSON contract (sections → entries → fields + bullets + skill rows, with explicit `range` spans). Document the new op catalog in the system prompt; keep mode-specific instructions.
- [ ] 5.3 In `backend/app/services/llm/parser.py`, `extract_patch` parses JSON (list or `{"operations":[…]}`) into the typed `Patch` model; errors surface as `PatchError(op_schema_violation=…)`. Carry retry messages with the specific op-schema violations.
- [ ] 5.4 In `backend/app/api/tailor.py` `chat_stream`: replace the `doc_node_from_dict` load with `ResumeDocument.model_validate(doc_model)`; build the prompt with the new typed-JSON contract; call the adapter (already supports OpenAI new-model compat); parse patch via `extract_patch`; validate via `validator.validate`; apply via `applier.apply`; surgical-serialize the new doc; persist with `source="llm"`; emit SSE `writing` (partial ops) + `done` events.
- [ ] 5.5 Adapt `get_session` to return `document_model_json` (Region tree) and `tex_source` (verbatim materialized bytes) under `latest_document` with `document_type="resume"` and `parent_doc_id` — same key shape the frontend already expects.
- [ ] 5.6 Restart the backend container for each completed sub-task and verify against a fresh session via `curl POST /api/sessions` + `PG session_documents` inspection.

## 6. Backend: Lock serializer round-trip via test corpus

- [ ] 6.1 Add `backend/tests/fixtures/` with 4 sample `.tex` resumes (the project's actual master resume, a moderncv sample, a plain `\section` template, a custom macro template).
- [ ] 6.2 Add a `test_roundtrip_corpus.py` parameterized test asserting byte-identical serialize for each fixture when no ops are applied.
- [ ] 6.3 Add a `test_compile_after_apply` test that runs the full op catalog's happy-path sequence against the master fixture and asserts `latexmk -pdf` of the surgical output returns `0`.

## 7. Backend: User-edit PATCH endpoint

- [ ] 7.1 Create `backend/app/api/document.py` with `PATCH /api/sessions/{session_id}/document` accepting `{"operations":[…]}` body.
- [ ] 7.2 Load current `SessionDocument`, deserialize to `ResumeDocument`, validate via `validator`, apply via `applier.apply`, serialize via surgical serializer; persist new `SessionDocument(version+1, parent_doc_id=current, document_model_json=Region tree, tex_source=emit)`.
- [ ] 7.3 Insert `Patch(source="user", applied=true, operations_json=ops, raw_llm_response=None, user_message=None)`; on validation failure return `422` with `{"detail":{"validation_errors":…}}` and DO NOT persist.
- [ ] 7.4 Return `{"document_id","version","diff":{"added","removed","modified","moved"}, "warnings":[…]}` from the surgical serializer.
- [ ] 7.5 Register the router in `backend/app/main.py` and confirm CSRF middleware applies to it (it is a `PATCH` non-exempt route).
- [ ] 7.6 Tests: `backend/tests/api/test_document.py` covering success path, validation failure, op-vs-unknown-id rejection, legacy-doc lazy migration (load a row with legacy doc-model, return V2 after parsing).

## 8. Backend: Lazy migration of legacy sessions

- [ ] 8.1 In `get_session`, if DOCUMENT_MODEL_V2=on and the row's `document_model_json` doesn't carry `"type":"root"` + `"children":[]` + a `slice` key on each `Region` (i.e. it's the legacy DocNode shape), call `parse_resume(tex_source.encode())` and write the new tree to a new column `document_model_v2_json` (added by migration). Never overwrite `document_model_json`.
- [ ] 8.2 Add an alembic migration `add_document_model_v2_column` adding `session_documents.document_model_v2_json JSON` and `patches.source TEXT NOT NULL DEFAULT 'llm'`.
- [ ] 8.3 Tests: `tests/api/test_migration.py` — a session created under the legacy path returns a V2 Region tree on first `GET` and the V2 column is populated; subsequent `GET`s read the V2 column without re-parsing.

## 9. Frontend: Editable canvas components

- [ ] 9.1 Update `frontend/app/types/index.ts` with `Region`, `Span`, `Field`, `Layout`, `ResumeDocument`, `TypedOp`, `Patch` (now including `source`), `DiffRegion`, and remove obsolete `DocNode`-based types.
- [ ] 9.2 Rewrite `DocumentCanvas.tsx` to: load `latest_document.document_model_json` as Region tree; dispatch root children by `type` (`preamble`, `header`, `section`, `opaque`) to new renderers; show an empty-state only when the tree truly has no typed children.
- [ ] 9.3 `SectionRenderer.tsx` — section label is `contentEditable`; hover toolbar shows: drag handle (Section), "+ bullet"/"+ entry" actions only if section has typed children, "+ section" sibling action on the LAST section. Dispatches to children renderers.
- [ ] 9.4 `EntryRenderer.tsx` — header is rendered from `entry.layout` as rows of `FieldChip`s with flex spacers between non-empty slots; hover toolbar (drag handle, "+ bullet", "× delete"); children bullets → `BulletRenderer`.
- [ ] 9.5 `FieldChip.tsx` — `contentEditable` span bound to one `Field.text`; on blur fires `ReplaceText` targeting the field id or `UpdateFieldSpans` when only spans changed.
- [ ] 9.6 `BulletRenderer.tsx` — `contentEditable` `<li>` bound to `bullet.text`+`bullet.spans`; hover toolbar (drag handle inside the entry's itemize, "+ bullet sibling", "× delete"); maintains a mini format toolbar (bold/italic/underline/link) on selection.
- [ ] 9.7 `SkillRowRenderer.tsx` — two `contentEditable` spans (category, items) inside the same line; spans applied via the same mini format toolbar.
- [ ] 9.8 `HeaderRenderer.tsx` — name field + contact fields, all `contentEditable`; resume title (`name`) cannot be deleted (no `×` on it); other contact fields can be added/removed.
- [ ] 9.9 `OpaqueNodeRenderer.tsx` — non-editable, raw slice preview; title attribute "Template-specific content — not editable"; clicking shows the underlying raw bytes in a small dropdown.

## 10. Frontend: Drag-and-drop + hover toolbars

- [ ] 10.1 Install `@dnd-kit/core` + `@dnd-kit/sortable` (verify version compatibility with Next 14).
- [ ] 10.2 Implement `DndContext` wrapping the canvas; sensors = pointer + keyboard; per-droppable strata: section-level (root), entry-level (inside a section), bullet-level (inside an entry itemize), field-level (inside an entry header's layout).
- [ ] 10.3 Implement drag handlers mapping to typed ops: `onDragEnd` section reorders → `MoveSection`; entry reorders → `MoveEntry`; bullet reorders → `MoveBullet`; field chip drag between layout rows/slots → `MoveField`.
- [ ] 10.4 Implement hover toolbar component `EditToolbar.tsx` with Lucide icons (`GripVertical`, `Plus`, `X`); visibly only on hover; tooltips via Radix (already in the deps list).
- [ ] 10.5 Tests: `frontend/app/components/document/__tests__/` using React Testing Library: render the master resume's Region tree, simulate clicking into a bullet and typing, assert the optimistic local tree updates and the PATCH is called with the right op shape.

## 11. Frontend: Optimistic-update store + mutation hook

- [ ] 11.1 Create `frontend/app/stores/documentStore.ts` (Zustand) holding: `doc: ResumeDocument | null`, `version: number`, `inFlight: TypedOp[]`, `dirty: Record<region_id, true>`. Actions: `setDoc`, `applyOptimistic(op)`, `commit(op)`, `rollback(op)`, `reconcileFromServer(newDoc, version, diffs)`.
- [ ] 11.2 Create `frontend/app/hooks/useDocumentEdit.ts` exposing `applyOp(op: TypedOp)` — optimistically mutates the store, calls `apiRequest('PATCH', '/api/sessions/{id}/document', {operations:[op]})`, on `200` reconciles, on `422` rolls back + shows toast, on network failure retries once.
- [ ] 11.3 `useSessionDocument` returns the optimistic doc (not the stale server doc) so the canvas reflects user intent immediately.
- [ ] 11.4 Reconcile logic: on server response, replace regions whose id appears in `diff.modified` or `diff.moved` with server data; for `diff.added` insert new regions; for `diff.removed` drop regions; reset `inFlight` and `dirty` for committed ops.

## 12. Frontend: Conflict detection vs in-flight LLM patches

- [ ] 12.1 In the SSE hook (`useSessionSSE.ts`), on receiving a `writing` or `done` event, inspect `documentStore.inFlight` for overlapping region IDs against the incoming patch's target ids.
- [ ] 12.2 On overlap, hold the LLM patch in a `pending_llm_patch` slot in the store; surface a `ConflictBanner.tsx` in the chat rail: "AI made changes that conflict with your edits — Keep mine / Keep AI's / Review".
- [ ] 12.3 "Keep mine": commit pending user op; record the LLM patch in a `Patch` row via a new `POST /api/sessions/{id}/patches` endpoint accepting `{patch_id, applied:false, user_feedback:"user_preferred_local"}` (NEW small endpoint; add under §13).
- [ ] 12.4 "Keep AI's": discard pending user op by rolling back the optimistic store; fire a follow-up `PATCH /api/sessions/{id}/document?parent_version=<llm_version>` to apply the user's intent with the LLM's doc as base — or simply skip the user's edit and let the LLM's doc stand.
- [ ] 12.5 "Review": open a side-by-side diff of the user's pending edit vs the LLM's patch on that region; user chooses per region.
- [ ] 12.6 No-conflict fast path: when `inFlight` is empty, apply the LLM patch transparently as today.

## 13. Backend: small endpoints supporting v2 UX

- [ ] 13.1 `POST /api/sessions/{id}/patches/{patch_id}/discard` — mark a stored but unapplied `Patch` row as `applied=false, user_feedback="user_preferred_local"`; used by the conflict "Keep mine" action.
- [ ] 13.2 `GET /api/sessions/{id}/patches` — list all patches for a session in chronological order; returns `id, source, applied, user_message, raw_llm_response_excerpt, created_at, operation_count, target_doc_version` for the audit history rail.
- [ ] 13.3 `GET /api/sessions/{id}/diff?from_version=X&to_version=Y` — compute a `DiffChangeSet` between two versions in the chain by replaying ops; used by the diff timeline.

## 14. Frontend: Audit history rail + source badges

- [ ] 14.1 Add an "Audit history" entry to the chat rail header menu (`MoreVertical`) that opens a slide-down panel listing Patches via `useSessionPatches(sessionId)` (new TanStack Query hook hitting §13.2).
- [ ] 14.2 Each Patch row shows a "you" / "AI" badge, the operation count, the timestamp, and the triggering message excerpt (if any).
- [ ] 14.3 Clicking a row switches the canvas to diff mode between the row's `parent` and `target` versions via §13.3.
- [ ] 14.4 Augment `BulletRenderer`, `EntryRenderer`, `SectionHeader`, `SkillRowRenderer` to render a small badge next to any region whose id appears in the most recent `DiffChangeSet.modified` — colored by `source` (brass for you, proof-green for AI, slate for import). Tooltip shows the patch timestamp.

## 15. Backend: Export adaptations

- [ ] 15.1 In `backend/app/api/export.py`, `.tex` export: return the surgical serializer's materialized bytes (not the stored `tex_source` directly — they are equivalent when no edits, but materials are correct post-edit).
- [ ] 15.2 `.pdf` export: compile the materialized bytes through the existing latex container using the existing sha256 cache key.
- [ ] 15.3 `.docx` export: implement a new `docx_from_regions(doc: ResumeDocument)` emitter that maps Section → `Heading 1`, Entry → title line + organization/dates line + bulleted list, SkillRow → bold category + items paragraph, Bullet → bullet paragraph with run bold/italic spans. Skip opaque regions (or include them as plain raw text for v1 — decide after UX feedback).
- [ ] 15.4 `.txt` export: emit ALL-CAPS section heads, `• ` bullets, `Title — Dates` entries, `Category: items` skill rows.
- [ ] 15.5 Refresh cache key semantics: cache key is `sha256(materialized_tex)`, not `sha256(stored_tex_source)`, so post-edit exports invalidate correctly.

## 16. Teardown (once §8 migration complete and no customer-touchable path uses legacy)

- [ ] 16.1 Remove `backend/app/services/latex/parser.py` (regex tokenizer), `extractor.py` (legacy `_walk_node`), `builder.py` (unused passthrough), `document_model.py` (`DocNode` subclass tree — replaced by `region_model.py`).
- [ ] 16.2 Remove `backend/app/services/editing/patch.py` (the legacy 5-op schema) and the `doc_node_from_dict` factory anywhere it lingers.
- [ ] 16.3 Remove the old generic serializer (`backend/app/services/latex/serializer.py`).
- [ ] 16.4 Remove DOCUMENT_MODEL_V2 flag; serve Region-tree only.
- [ ] 16.5 Drop `document_model_json` legacy column after a migration data check (one alembic step).

## 17. Continuous integration

- [ ] 17.1 Backend CI runs `pytest backend/tests/` including the surgical-serializer roundtrip corpus test, the applier op-catalog test, the lexer/recognizer tests, and the lazy-migration test.
- [ ] 17.2 The latex container is available in CI for the `test_compile_after_apply` test (via a service container or a cached compile-image).
- [ ] 17.3 Frontend CI runs `npm test` for the editable-canvas component tests and the dnd-kit handler tests.
- [ ] 17.4 ESLint `@typescript-eslint/no-explicit-any` — tighten in `components/document/` so renderer props are typed against `Region`/`Field` objects, not `any`.
