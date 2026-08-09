## 1. Fix path format normalization in DiffView

- [x] 1.1 Add dot-label-first path variants to `buildPathToIdMap` in `app/components/diff/DiffView.tsx` — for each section, entry, and bullet, insert additional map keys using the backend's `sections.{label}.entries[{i}]...` convention alongside the existing `sections[{i}].{label}.entries[{i}]...` keys
- [x] 1.2 Add basics field path entries to `buildPathToIdMap` using a sentinel node ID `"basics"` for all `basics.name`, `basics.email`, `basics.phone`, `basics.location`, and `basics.summary` paths

## 2. Render basics-level diff annotations

- [x] 2.1 Update `ResumeHeader` (`app/components/document/ResumeHeader.tsx`) to consume diff context via `useDiff("basics")` and display gutter markers, colored borders, and inline word diffs on name, email, phone, location, and summary fields when they appear in the change set
- [x] 2.2 Add `basics` fields to `buildPathToIdMap` in `DiffView.tsx` if not already covered by task 1.2

## 3. Backend path format consistency (optional hardening)

- [x] 3.1 Normalize the metadata comparison path in `ContentDiffer._compare_sections` (`backend/app/services/editing/content_ops.py:388-393`) from `sections.{label}.metadata` to use the same bracket-index convention as section add/remove paths, or ensure the frontend handles both

## 4. Verify end-to-end

- [ ] 4.1 Manually verify: trigger a chat proposal, confirm the summary bar shows change counts, confirm gutter markers appear on changed sections/entries/bullets, confirm inline word diffs render on modified bullet text
- [ ] 4.2 Verify diff mode disables drag-and-drop and inline editing on all annotated elements
- [ ] 4.3 Verify basics field changes (name, email, phone, location, summary) render diff annotations in ResumeHeader
