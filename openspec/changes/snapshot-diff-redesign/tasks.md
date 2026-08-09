## 1. Delete old diff system

- [x] 1.1 Delete `frontend/app/components/diff/DiffView.tsx` (301 lines)
- [x] 1.2 Delete `frontend/app/components/diff/DiffMark.tsx` (41 lines)
- [x] 1.3 Delete `frontend/app/components/diff/DiffActions.tsx` (45 lines)
- [x] 1.4 Delete `frontend/app/lib/wordDiff.tsx` (114 lines)
- [x] 1.5 Delete `frontend/tests/components/DiffTooltip.test.tsx` and `frontend/tests/components/DiffView.test.tsx`
- [x] 1.6 Remove `ContentDiffer` class from `backend/app/services/editing/content_ops.py` (lines 620-881)
- [x] 1.7 Remove `ContentDiffer` imports from `backend/app/api/tailor.py` and `backend/app/api/document.py`
- [x] 1.8 Remove diff computation calls in `tailor.py` (lines ~469-477) and `document.py` (lines ~94-95, 125)

## 2. Backend: add master resume content endpoint

- [x] 2.1 Add `PATCH /api/master-resume/content` endpoint in `backend/app/api/sessions.py` — accepts `{ content_json: {...} }`, updates `MasterResume.content_json` directly
- [x] 2.2 Add Alembic migration to drop `pending_diff_json` column from `sessions` table

## 3. Frontend: create field-level diff computation

- [x] 3.1 Create `frontend/app/lib/fieldDiff.ts` with `computeFieldDiffs(master, session)` function — returns `Map<string, { kind, old?, new? }>` by walking sections/entries/bullets/skill_rows matched by ID
- [x] 3.2 Add `wordDiff(oldText, newText)` function to `fieldDiff.ts` — simplified LCS algorithm for word-level diffing on text fields
- [x] 3.3 Add `DiffChange` type to `frontend/app/types/index.ts` — `{ kind: "added" | "removed" | "modified", old?: string, new?: string }`

## 4. Frontend: create diff context and overlay

- [x] 4.1 Create `frontend/app/components/diff/DiffContext.tsx` — React context providing `changes: Map<string, DiffChange>` and `useFieldChanges(entityId)` hook
- [x] 4.2 Create `frontend/app/components/diff/DiffOverlay.tsx` — change count badge + Accept/Reject buttons (visible only when snapshot exists)
- [x] 4.3 Add `snapshot` field to `frontend/app/stores/sessionStore.ts` — `snapshot: ResumeContent | null`, `setSnapshot()`, `clearSnapshot()`

## 5. Frontend: wire up DocumentCanvas and DocumentTopBar

- [x] 5.1 Update `DocumentCanvas.tsx` to fetch master resume via `useMasterResume()`, compute diffs via `computeFieldDiffs()`, and wrap content in `DiffContext.Provider` when in Changes view
- [x] 5.2 Update `DocumentCanvas.tsx` to render `DiffOverlay` (Accept/Reject buttons) when snapshot exists
- [x] 5.3 Update `DocumentTopBar.tsx` to show change count badge on the "Changes" toggle button

## 6. Frontend: update renderers to use new diff context

- [x] 6.1 Update `ResumeHeader.tsx` — remove old diff imports, use `useFieldChanges("basics")` for basics field highlights
- [x] 6.2 Update `SectionRenderer.tsx` — remove old diff imports, use `useFieldChanges(sectionId)` for section-level highlights
- [x] 6.3 Update `EntryRenderer.tsx` — remove old diff imports, use `useFieldChanges(entryId)` for entry-level highlights
- [x] 6.4 Update `BulletRenderer.tsx` — remove old diff imports, use `useFieldChanges(bulletId)` for bullet-level word-diff highlights
- [x] 6.5 Update `SkillRowRenderer.tsx` — remove old diff imports, use `useFieldChanges(rowId)` for skill row highlights
- [x] 6.6 Remove all `diffBorderClass`/`diffGutterClass`/`diffGutter`/`renderDiffText`/`useDiff`/`useDiffChanges` imports from `EditableField.tsx`, `RichEditableField.tsx`, `SortableSection.tsx`, `SortableEntry.tsx`, `SortableBullet.tsx`, `SortableSkillRow.tsx`

## 7. Frontend: wire up snapshot lifecycle

- [x] 7.1 In `sessionStore.ts` SSE handler: snapshot current document content before applying LLM changes (on "proposal" event)
- [x] 7.2 In `DocumentCanvas.tsx`: snapshot current content before applying manual edits (on `queueEdit` call)
- [x] 7.3 Wire Accept button: `clearSnapshot()` + toast
- [x] 7.4 Wire Reject button: `PATCH /api/sessions/:id/document` with snapshot content, `clearSnapshot()`, invalidate queries + toast

## 8. Verify end-to-end

- [ ] 8.1 Verify: Changes view shows diff highlights on all changed fields (sections, entries, bullets, skill rows, basics)
- [ ] 8.2 Verify: Word-level diff renders on modified bullet text
- [ ] 8.3 Verify: Accept clears snapshot, document stays as-is
- [ ] 8.4 Verify: Reject reverts document to snapshot, manual edits preserved
- [ ] 8.5 Verify: Changes view toggle works (diff highlights only visible in Changes view)
- [ ] 8.6 Verify: Change count badge shows on "Changes" button when diffs exist
- [ ] 8.7 Verify: Backend `PATCH /api/master-resume/content` endpoint works
