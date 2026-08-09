## Why

The diff view — a core feature for reviewing LLM-proposed resume changes — renders no visual annotations on any document elements. The backend computes diffs correctly and the frontend has all the rendering components wired up, but a path format mismatch between the backend diff engine and the frontend's node-ID mapper prevents any change from being matched to its corresponding UI element. This has been broken since the feature was introduced.

## What Changes

- Fix the path format mismatch in `buildPathToIdMap` (frontend) so it accepts both backend conventions: dot-label-first (`sections.EXPERIENCE.entries[0]...`) and bracket-index-first (`sections[0].EXPERIENCE.entries[0]...`)
- Add basics field mapping (`basics.name`, `basics.email`, etc.) so header-level diffs render annotations
- Backend: align `_compare_sections` metadata path to use consistent convention (currently uses dot-label format that doesn't match either convention)
- Ensure the `content` prop passed to `DiffView` is populated when the diff is displayed (handle edge case where document query hasn't refreshed before diff renders)

## Capabilities

### New Capabilities

- `diff-rendering`: Visual diff annotations (gutter markers, colored borders, inline word diffs) render correctly on all document elements when a proposal is presented

### Modified Capabilities

None — no existing capability specs defined.

## Impact

- **Frontend**: `app/components/diff/DiffView.tsx` (buildPathToIdMap, findChange), `app/components/document/ResumeHeader.tsx` (consume diff context for basics fields)
- **Backend**: `app/services/editing/content_ops.py` (normalize path format in ContentDiffer to be consistent)
- No API changes, no new dependencies, no breaking changes
