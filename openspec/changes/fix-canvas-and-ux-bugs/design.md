## Context

The document-model-overlay change built a v2 pipeline (lexer → recognizer catalog → Region tree → surgical serializer → typed ops → applier). The `create_session` endpoint correctly uses `parse_resume()` and stores a v2 Region tree. However, the `tailor` endpoint — which runs the LLM and creates subsequent document versions — still uses the old `doc_node_from_dict()` conversion path, which strips entry field data. The GET session endpoint's `_convert_document_model()` correctly converts v2 trees to frontend-compatible shapes, but the frontend receives the degraded old-format trees from the tailor path.

Additionally, the DOCX/TXT exporters never implemented proper tree-walking — they dump raw LaTeX lines — and the frontend has several standalone UX bugs (diff view not connected, auto-tailor fires twice, dark mode bubble invisible, empty state always shows upload prompt).

## Goals / Non-Goals

**Goals:**
- Fix the tailor-to-storage pipeline so all stored document models are valid v2 Region trees with populated entry fields
- Fix the DOCX and TXT exporters to emit formatted content from the document model tree
- Fix the duplicate auto-tailor submission
- Wire the changes/final diff view in the canvas
- Fix the dark mode user message bubble visibility
- Fix the empty state message when a master resume exists

**Non-Goals:**
- Rewriting the tailor's LLM prompt to use typed ops (that's the full `llm-integration` spec, out of scope here)
- Full manual editing UI (that's the `manual-editing` spec)
- Migrating existing sessions to v2 (they get re-parsed lazily on next access)
- Changing the diff engine or op catalog

## Decisions

### D1: Re-parse after tailor, don't upgrade the applier

**Chosen:** After the old applier produces `new_tex`, call `parse_resume(new_tex)` to produce a fresh v2 Region tree, then serialize that tree's `.model_dump()` as `document_model_json`.

**Alternatives considered:**
- *Port the tailor to use applier_v2.* Would require updating the LLM prompt to emit typed ops, updating `extract_patch`, and porting the old `PatchApplier`/`PatchValidator` paths. High risk, large scope — belongs in the full `llm-integration` spec.
- *Fix `doc_node_from_dict` to preserve fields.* The old DocNode model fundamentally has no `fields` attribute — it stores `title`/`dates`/`text` on the node itself. Adding a parallel field store would be fragile and would still lose data when the old serializer runs.

Re-parsing costs ~10ms per tailor call. The trade-off is negligible.

### D2: DOCX/TXT: walk document model, not tex_source

**Chosen:** Read `doc.document_model_json`, traverse the tree, and emit formatted content per node type.

**Alternatives considered:**
- *Stripping LaTeX commands with regex.* Fragile, template-dependent, misses nested braces.
- *Using a third-party LaTeX-to-text converter.* Adds a dependency for a solved problem — the document model already has extracted text.

### D3: Diff view: store diff in sessionStore, conditionally render

**Chosen:** The SSE `done` event already carries a `diff` payload. Store it in `useSessionStore` as `latestDiff`. In `DocumentCanvas`, when `viewMode === "diff"` and `latestDiff` exists, wrap the tree in `<DiffView>` with the diff context. Each renderer calls `useDiff(nodeId)` to determine styling.

**Alternatives considered:**
- *Compute diff on the frontend from two versions.* Requires fetching both versions, adds latency, duplicates backend logic.
- *Remove the diff view entirely.* The toggle exists in the toolbar so it's intended to work.

### D4: Auto-tailor: fire directly, not via effect

**Chosen:** Remove the `useEffect` in `ChatRail.tsx`. `SessionSetupForm.handleSubmit` calls `sendMessage(prompt)` directly after session creation.

**Alternatives considered:**
- *Add more guards to the effect.* The root problem is reactive state churn — adding guards is whack-a-mole.
- *Use a one-shot promise.* Same as direct call, but more ceremony.

## Risks / Trade-offs

- **[Risk] Re-parsing produces a different Region tree than the old DocNode tree.** The old applier modifies tex_source and the old DocNode, but we discard the old DocNode and re-parse. If the old applier's mutated tree and the re-parsed tree disagree on structure, the stored model may not reflect the LLM's intent. → **Mitigation:** Re-parsing is a lossless operation on tex_source — the Region tree faithfully represents the text. The typed ops detail (which bullet was modified) is preserved in the Patch row, not the document model.
- **[Risk] DOCX/TXT exporters may not handle opaque regions.** Opaque regions (unknown LaTeX constructs) have no typed payload. → **Mitigation:** Skip opaque regions in DOCX/TXT for v1. The spec already says this.
- **[Risk] Diff view may show empty diff if no parent version exists.** The first document version has no parent to diff against. → **Mitigation:** If `parent_doc_id` is null, the diff is `null` and the diff tab is greyed out or falls back to "no changes yet."
