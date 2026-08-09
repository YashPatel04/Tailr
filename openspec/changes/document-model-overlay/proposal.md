## Why

The document canvas is blank because the document _model_ is the wrong shape. The current pipeline parses `.tex` with a flat regex tokenizer whose command regex throws away the `{...}` argument of every command, then walks the resulting tokens into a tree of `DocNode` subclasses. The output is a degenerate tree: every section's `label` is the literal string `\section`, every bullet's `text` is `""`, and bullet bodies leak out as orphan sibling `text` nodes. The LLM cannot address content it cannot see, the user cannot edit a canvas that has no editable payload, and the generic serializer destroys the user's LaTeX idiom on round-trip. Manual editing was also explicitly a non-goal of the original design ("the LLM is the editor; the user gives instructions") — that decision is now reversed.

## What Changes

- **New document model: structural overlay with verbatim slices.** Every node carries both a typed payload (`text`, `label`, `fields`, `spans`) AND a byte range into the authoritative `tex_source`. Round-trip is byte-faithful because unchanged regions emit their original bytes.
- **Replaced parser.** Out goes the flat regex tokenizer + walk-by-command-name extractor. In comes a byte-offset lexer producing positioned tokens, consumed by an **extensible recognizer catalog** (`SectionRecognizer`, `EntryRecognizer`, `BulletRecognizer`, `SkillRowRecognizer`, `HeaderRecognizer`, `OpaqueRecognizer`). Unknown constructs degrade to `OpaqueRegion` and still round-trip — never blank canvas, never broken export, regardless of template.
- **Replaced serializer.** Out goes the generic regenerate-from-typed-nodes emitter. In comes a **surgical serializer**: walk the Region tree in traversal order; for each region emit either its original bytes (untouched) or its re-emitted bytes (using the user's own harvested idioms — e.g. copy the literal `\begin{itemize}[itemsep=-2pt]` from a sibling bullet); splice the result into `tex_source`. Layout glue (`\\`, `\hfill`, `\noindent`, `\item`, `\begin`/`\end`) is **serializer-managed, never user-draggable**.
- **Replaced patch protocol.** Out goes the generic 5-op (`modify/insert/delete/move/ask`) schema. In comes a typed op catalog (ReplaceText, InsertBullet, DeleteEntry, MoveEntry, MoveSection, MoveField, UpdateFieldSpans, SplitBullet, MergeBullets, InsertEntry, InsertSection, DeleteSection, Ask). Each op is **source-tagged (`user` | `llm` | `import`)** and routes through one applier, one patch table, one audit log. User drags and LLM tailoring share an identical op contract.
- **Entry-field granularity.** The header of an experience entry becomes a typed composition of fields (`title`, `role`, `organization`, `dates`, `location`, `link`) plus a `layout` spec (which fields sit on which line, with serializer-placed `\hfill` spacers between them). This is what unlocks the user swapping "June 2026 – August 2026" with "Austin, TX" by drag-and-drop, and the LLM editing the dates field without touching the title.
- **New capability: `manual-editing`.** The canvas becomes a first-class editor. Every typed thing (section, entry, bullet, field, skill row) is `contentEditable` and/or drag-reorderable with hover toolbars for add/remove/move. Optimistic updates fire typed ops through a new `PATCH /api/sessions/{id}/document` route running the same applier the LLM uses. UI surfaces "edited by you" vs "edited by AI" badges from `patch.source`.
- **Revised LLM contract.** The LLM no longer sees raw `.tex` and no longer emits raw `.tex`. It receives typed JSON (sections, entries with fields, bullets with spans, skill rows with categories) and emits typed ops. Smaller prompts, smaller responses, fewer hallucinations; the surgical serializer translates back to the user's idiom.

## Capabilities

### Modified Capabilities

- `doc-parsing`: Replace the flat regex tokenizer + command-name extractor with a byte-offset lexer + recognizer catalog producing a Region tree whose nodes carry typed payloads AND verbatim byte slices into `tex_source`. Recognizers are pluggable so arbitrary templates degrade gracefully. Bookkeeping model changed from `DocNode` subclass tree to `Region` tree (id, type, slice, text, spans, fields, layout, children, emits_override).
- `doc-editing`: Replace the 5-op generic patch with a typed op catalog. Add `source` field to every Patch (user | llm | import). Applier mutates the Region tree and records per-region re-emit deltas; serializer materializes `tex_source` from the tree on demand. Cycle detection and ID-existence validation retained; field-level ops (`MoveField`, `UpdateFieldSpans`) added.
- `llm-integration`: Replace the document-model-as-JSON prompt payload with a typed-JSON resume contract (sections → entries → fields + bullets + skill rows). Update prompt templates to document the new op catalog. SSE event pipeline (researching → thinking → writing → done) and per-provider adapter behavior unchanged; OpenAI `_max_token_param` / temperature-guard compatibility retained.
- `doc-compilation`: Serializer is surgical, not generic. PDF export pulls materialized `tex_source`; `.tex` export returns the bytes directly; `.docx` export emits from the typed Region tree (typed regions only) and skips opaque regions for v1. LaTeX container, latexmk invocation, error parser, PDF caching, and error-suggestor all unchanged.

### New Capabilities

- `manual-editing`: First-class inline canvas editing for the user. `contentEditable` field/bullet/section text, drag-reorder at section/entry/bullet/field levels, hover toolbars for add/remove/move, optimistic-update store flowing through the same patch channel as LLM edits. New `PATCH /api/sessions/{id}/document` endpoint. Audit history stitched across both sources with `source` badges.

## Impact

- **Backend rewrites:** `services/latex/parser.py`, `services/latex/extractor.py`, `services/latex/document_model.py`, `services/latex/serializer.py`, `services/latex/builder.py`, `services/editing/patch.py`, `services/editing/applier.py`, `services/editing/diff.py`, `services/llm/prompts.py`. Touches `api/sessions.py` (storage shape), `api/tailor.py` (op-loading + apply path), `api/export.py` (call surgical serializer).
- **Backend additions:** `services/latex/lexer.py` (byte-offset tokenizer), `services/latex/recognizers/` (catalog with one module per recognizer), `services/latex/region_model.py` (Region tree), `services/latex/surgical_serializer.py`, `api/document.py` (`PATCH /api/sessions/{id}/document`).
- **Database migration:** `session_documents.document_model_json` schema changes (now stores Region tree, not DocNode tree). Add `patches.source` column (`user` | `llm` | `import`, default `llm`). Old sessions' stored documents are invalid under the new model — they are migrated lazily (re-parsed from `tex_source` on first access, never overwritten).
- **Frontend rewrites:** `components/document/*` become editable. Add optimistic-update store, drag-and-drop layer (dnd-kit or equivalent), hover toolbars, per-op "edited by you / AI" badges, conflict indicator when an LLM patch lands while the user has unsaved edits.
- **Frontend additions:** `hooks/useDocumentEdit.ts` (mutation + optimistic update), `components/document/EditToolbar.tsx`, `components/document/FieldChip.tsx`, `stores/documentStore.ts` (in-flight user edits + LLM ack reconciliation).
- **No new external dependencies** beyond a small dnd library (existing `@dnd-kit/core` is acceptable) for the frontend; pure-Python recognizer modules for the backend. `tree-sitter-latex` is no longer required (the byte-offset lexer is hand-written and template-agnostic).
- **Compatibility:** Tailoring modes (Polish / Refine / Rewrite) survive. Master resume is still `.tex`-only. Multi-format export still works. Auth, sessions, chat rail, sidebar, search modal, research pipeline — all untouched.

## Rollout

- Land behind a feature flag (`DOCUMENT_MODEL_V2=on`) so the legacy `DocNode` path remains available while the new pipeline is wired.
- Migrate session documents lazily: on first `GET /api/sessions/{id}` under V2, if `document_model_json` is in the legacy shape, re-parse `tex_source` with the new pipeline, store as `document_model_json_v2`, and serve the new shape.
- Once a session has produced a V2 document, all subsequent edits operate on V2 only.
