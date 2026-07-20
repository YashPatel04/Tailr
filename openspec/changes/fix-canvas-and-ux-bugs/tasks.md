## 1. Fix canvas: re-parse after tailor (Bug #2)

- [x] 1.1 In `api/tailor.py`, after `new_tex = serialize_to_tex(new_document, vocab)`, call `parse_resume(new_tex.encode("utf-8"))` to get a fresh v2 Region tree
- [x] 1.2 Store `doc.root.model_dump()` as `document_model_json` instead of `json.loads(new_document.model_dump_json())`
- [x] 1.3 Wrap with try/except — if `parse_resume` fails, fall back to the old DocNode format and log the error
- [x] 1.4 Restart backend, create a new session, verify entries have populated titles/dates in the canvas

## 2. Fix duplicate auto-tailor submission (Bug #1)

- [x] 2.1 In `SessionSetupForm.tsx`, after `setActiveSession(session.id)`, call the auto-tailor message directly instead of `setAutoTailor(true)`
- [x] 2.2 Import and pass `sendMessage` from `useSessionSSE` to `SessionSetupForm`
- [x] 2.3 Remove the autoTailor `useEffect` from `ChatRail.tsx` (lines 18-32)
- [x] 2.4 Remove `shouldAutoTailor` / `setAutoTailor` from `sessionStore.ts` and `ChatRail.tsx`
- [ ] 2.5 Verify: create a new session, only one tailor message appears

## 3. Fix DOCX and TXT exports (Bug #3)

- [x] 3.1 In `api/export.py`, add a tree-walking helper that traverses `document_model_json` and yields typed nodes
- [x] 3.2 Rewrite the DOCX export block: sections → Heading 1, entries → bold title + dates + bullet list, skill rows → bold category + items, bullets → bullet paragraphs with span formatting via run properties
- [x] 3.3 Rewrite the TXT export block: sections → ALL-CAPS headers, bullets → `• text`, entries → `title — dates`, skill rows → `category: items`
- [ ] 3.4 Verify: export a tailored resume, open in Word / text editor, confirm formatted output (not raw LaTeX)

## 4. Wire the changes/final diff view (Bug #4)

- [x] 4.1 Add `latestDiff` state to `sessionStore.ts`
- [x] 4.2 In `useSessionSSE.ts`, on `done` event, store `data.diff` via `setLatestDiff(data.diff)`
- [x] 4.3 In `DocumentCanvas.tsx`, read `viewMode` and `latestDiff` from store; when `viewMode === "diff"` and `latestDiff` exists, wrap children in `<DiffView>`
- [x] 4.4 Pass `diffState` from `useDiff(node.id)` to `SectionRenderer`, `EntryRenderer`, and `BulletRenderer`
- [x] 4.5 Add conditional styling (e.g. bg-green-100 for added, bg-red-100 for removed) in renderers when `diffState` is set
- [ ] 4.6 Verify: after a tailor run, toggle to Changes tab and see highlighted diffs

## 5. Fix empty state message (Bug #5)

- [x] 5.1 In `DocumentEmptyState.tsx`, add `useMasterResume()` hook
- [x] 5.2 If master resume exists: show "Welcome back" heading, "Select a session or create a new one" message, and a "New session" button that calls `setSetupOpen(true)`
- [x] 5.3 If no master resume: keep the existing "Upload your master resume" UI
- [x] 5.4 Verify: with a master resume uploaded, the welcome page shows the welcome-back variant

## 6. Fix dark mode user message bubble (Bug #6)

- [x] 6.1 In `ChatMessage.tsx`, change user message `dark:bg-[#212121]` to `dark:bg-[#40414f]`
- [ ] 6.2 Verify: in dark mode, user messages have a visible bubble distinct from the panel background
