## Why

The current diff view is completely broken. It uses a fragile path-mapping system where the backend (`ContentDiffer`) emits JSON paths like `sections.EXPERIENCE.entries[0].bullets[0].text` and the frontend (`buildPathToIdMap`) maintains 80+ path variants mapped to UUID node IDs. Any path format mismatch silently breaks the entire diff — no annotations render. Manual edits on the canvas produce no diff at all because `ContentDiffer` is only called during LLM proposals. The system is overengineered (word-level LCS, context providers, per-field gutter markers) relative to its value, and the path matching is inherently fragile.

## What Changes

- **Delete the entire existing diff system**: `ContentDiffer` class (260 lines backend), `DiffView.tsx` (301 lines), `DiffMark.tsx`, `DiffActions.tsx`, `wordDiff.tsx`, all `diffBorderClass`/`diffGutterClass`/`diffGutter`/`useDiff` calls in 10+ renderer files, `pending_diff_json` DB column, `latestDiff` in sessionStore
- **Replace with field-level snapshot diff**: Compare master resume vs current session document at render time. No path mapping, no node IDs. A `computeFieldDiffs(old, new)` function walks both content trees by matching IDs and returns a flat `Map<string, {old, new}>`.
- **Snapshot for reject**: Store the document state before each LLM proposal as `snapshot`. Manual edits update the snapshot (manual edits are auto-accepted). Reject reverts to snapshot (undoing only the LLM's contribution, preserving manual edits). Accept clears the snapshot.
- **New endpoint**: `PATCH /api/master-resume/content` to update master resume content directly from session content (no LLM tex parsing).
- **Changes view only**: Diff highlights are only visible when the user toggles to "Changes" view (the toggle already exists in DocumentTopBar). The diff always shows master vs current (cumulative).

## Capabilities

### New Capabilities

- `field-level-diff`: Compute and render field-level diffs between master resume and session document. Word-level highlights for text fields (bullet text, basics fields). Added/removed/modified indicators on sections, entries, bullets, skill rows.
- `snapshot-revert`: Store document snapshot before LLM proposals. Reject reverts to snapshot. Manual edits update snapshot so they survive rejection.

### Modified Capabilities

None — no existing capability specs defined.

## Impact

- **Backend**: Delete `ContentDiffer` class in `app/services/editing/content_ops.py`. Add `PATCH /api/master-resume/content` endpoint in `app/api/sessions.py`. Drop `pending_diff_json` column via Alembic migration.
- **Frontend**: Delete 5 files (~700 lines) in `components/diff/` and `lib/wordDiff.tsx`. Create 3 files (~250 lines): `lib/fieldDiff.ts`, `components/diff/DiffContext.tsx`, `components/diff/DiffOverlay.tsx`. Modify `sessionStore.ts`, `DocumentCanvas.tsx`, `DocumentTopBar.tsx`, and all renderers to use new diff context.
- **No API breaking changes**: The SSE event format doesn't change. The session document endpoints don't change. Only the diff computation and rendering are replaced.
