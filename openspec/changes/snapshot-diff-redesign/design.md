## Context

The diff feature spans two layers:

- **Backend**: `ContentDiffer` (`content_ops.py:620-881`) compares old vs new `ResumeContent` and produces a `{"changes": [...]}` dict. Each change has a `path` string, a `kind`, and optionally `old`/`new` values. Only invoked during LLM proposals (`tailor.py`, `document.py`).
- **Frontend**: `DiffView.tsx` wraps document content in a `DiffContext` provider. `buildPathToIdMap(content)` creates a `Map<string, string>` from 80+ path pattern variants to node UUIDs. `findChange(nodeId)` looks up changes by path. Renderers call `useDiff(nodeId)` to get `DiffState` and render gutter markers, colored borders, and inline word diffs.

**Why it's broken:**
1. Path format mismatch: backend emits `sections.EXPERIENCE.entries[0]...`, frontend expects `sections[0].EXPERIENCE.entries[0]...`. Changes never match.
2. Manual edits invisible: `ContentDiffer` is only called for LLM proposals. Canvas edits go through `ContentEditor.apply_ops()` with no diff computation.
3. Overengineered: word-level LCS, context providers, 80+ path variants — all for showing "the LLM changed 3 bullets."

**The master resume** is stored per-user at `MasterResume.content_json`. A `GET /api/master-resume` endpoint already exists. Sessions start with a copy of the master resume as their document.

## Goals / Non-Goals

**Goals:**
- Replace the entire diff system with a simple field-level comparison between master resume and session document
- Show word-level highlights on text fields (bullet text, basics fields) in Changes view
- Accept = dismiss (clear snapshot, changes stay). Reject = revert to snapshot (undo LLM changes, preserve manual edits)
- All edits (manual + LLM) show in Changes view as cumulative diff vs master
- Changes view only — no diff highlights in the normal editing view

**Non-Goals:**
- Updating the master resume on accept (master stays immutable during session work)
- Side-by-side old/new document comparison
- Tracking which changes came from LLM vs manual edits
- Semantic entry/bullet matching (matching is by ID, same as current)
- Diff across arbitrary document versions (only master vs current)

## Decisions

### Decision 1: Frontend-only diff computation

**Choice:** Compute diffs on the frontend by comparing master resume content vs session document content.

**Rationale:** Both objects are already available on the frontend (master via `useMasterResume()`, session via `useSessionDocument()`). No backend changes needed for diff computation. The comparison is a simple tree walk — no heavy processing. Avoids API changes and keeps the diff logic colocated with the rendering.

**Alternative considered:** Backend computes diffs and sends them via SSE. Rejected because it adds API complexity, requires backend changes for every diff format tweak, and doesn't solve the manual edit problem (manual edits don't go through the backend diff path).

### Decision 2: ID-based matching, not positional

**Choice:** Match sections, entries, bullets, and skill rows by their `id` field. Not by position/index.

**Rationale:** IDs are stable across edits. Positional matching breaks when items are reordered, inserted, or deleted. The current `ContentDiffer` uses positional matching for some things (bullet comparison by index) which is fragile.

**Implementation:** Build `Map<id, entity>` for old and new collections. Iterate new, look up in old by ID. If not found → added. If found → compare fields. After iterating new, any old entities not in new → removed.

### Decision 3: Snapshot stored in sessionStore, not server

**Choice:** Store the `snapshot` (pre-LLM state) in the frontend `sessionStore`. Not persisted to the database.

**Rationale:** The snapshot is only needed for the reject action within the current browser session. If the user refreshes, the snapshot is lost — but so is the context of "what did the LLM just propose." The reject action becomes unavailable (no snapshot to revert to), which is acceptable. Persisting snapshots server-side adds DB complexity for a feature that's inherently session-scoped.

**Alternative considered:** Store `baseline_content` in a DB column on sessions. Rejected because it adds migration complexity and the snapshot is ephemeral by nature.

### Decision 4: Snapshot lifecycle — manual edits update snapshot

**Choice:** When the user makes a manual edit, update the snapshot to the current state (before applying the edit). Manual edits are "auto-accepted."

**Rationale:** If the user manually edits bullet1, then the LLM proposes changes to bullet2 and bullet3, rejecting should undo only the LLM's changes. The manual edit must survive rejection. By updating the snapshot on manual edit, the snapshot always reflects "the last state the user explicitly accepted."

**Lifecycle:**
- Manual edit → snapshot = current (before edit), then apply edit
- LLM proposal → snapshot = current (before LLM applies), then apply LLM changes
- Accept → snapshot = null
- Reject → document = snapshot, snapshot = null

### Decision 5: Diff display as master vs current

**Choice:** The diff always shows master resume vs current session document. This is a cumulative diff of all changes, not just the most recent LLM proposal.

**Rationale:** The master resume is the stable reference. The user wants to see "what has this session done to my resume" — whether from manual edits or LLM proposals. This is simpler than tracking per-proposal diffs.

**Implication:** After accept, the Changes view still shows diffs (because master hasn't changed). Manual edits also show as diffs. This is intentional.

### Decision 6: Word-level diff via LCS on text strings

**Choice:** For text fields (bullet text, basics fields), compute a word-level LCS diff to highlight which words changed.

**Rationale:** Field-level highlights ("this bullet changed") are useful but coarse. Word-level highlights ("these specific words changed within the bullet") are much more actionable for resume review. The existing `wordDiff.tsx` LCS implementation is sound — it just needs to be decoupled from the path-mapping system.

**Implementation:** Reuse the LCS algorithm from `wordDiff.tsx`, simplified. Split text on whitespace, compute LCS, render removed words with strikethrough and added words with green background.

## Risks / Trade-offs

- **[Risk] Snapshot lost on page refresh** → Mitigation: Acceptable. The reject action becomes unavailable, but the user can still see the diff. If server-side persistence is needed later, it can be added without changing the diff computation.

- **[Risk] Cumulative diff can be noisy** → Mitigation: Changes view is a toggle, not always visible. The user opts in to see diffs. Could add per-section collapse in a future iteration if needed.

- **[Risk] Manual edits mixed with LLM changes in diff** → Mitigation: This is intentional per requirements. The user sees all changes vs master. Reject only undoes the LLM's contribution (via snapshot). No visual distinction between manual and LLM changes — that's a non-goal.

- **[Risk] Performance on large documents** → Mitigation: `computeFieldDiffs` is O(n) where n = total fields. For a typical resume (5 sections, 15 entries, 40 bullets), this is ~100 comparisons per render. Negligible. The word-level LCS is O(m*k) per field where m,k = word counts. For typical bullet text (~20 words), this is ~400 operations. Also negligible.

## Migration Plan

1. Deploy backend with new `PATCH /api/master-resume/content` endpoint + Alembic migration to drop `pending_diff_json`
2. Deploy frontend with new diff system (old system deleted, new system wired up)
3. No data migration needed — existing sessions work as-is (diff just shows master vs current)

## Open Questions

- Should the "Changes" badge in DocumentTopBar show the count of changed fields, or just a binary "has changes" indicator?
