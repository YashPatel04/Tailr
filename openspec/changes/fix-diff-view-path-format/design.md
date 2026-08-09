## Context

The diff feature spans two layers:

- **Backend**: `ContentDiffer` (`content_ops.py:311-542`) compares old vs new `ResumeContent` and produces a `{"changes": [...]}` dict. Each change has a `path` string, a `kind` ("added"|"removed"|"modified"), and optionally `old`/`new` values.
- **Frontend**: `DiffView` (`DiffView.tsx`) wraps document content in a `DiffContext` provider. `buildPathToIdMap(content)` creates a `Map<string, string>` from path patterns to node UUIDs. `findChange(nodeId)` looks up changes by path. Renderers (`SectionRenderer`, `EntryRenderer`, `BulletRenderer`) call `useDiff(nodeId)` to get a `DiffState` and render gutter markers, colored borders, and inline word diffs.

**The bug:** Backend and frontend use incompatible path string conventions for the same concept. The backend produces paths with a dot-label-first pattern (`sections.EXPERIENCE.entries[0].bullets[0].text`) while the frontend map uses a bracket-index-first pattern (`sections[0].EXPERIENCE.entries[0].bullets[0].text`). `findChange()` can never resolve a backend path to a frontend node ID.

Additionally, `buildPathToIdMap` has no entries for `basics.*` paths, so header-level changes (name, email, phone, location, summary) never render annotations.

## Goals / Non-Goals

**Goals:**

- Every diff change produced by the backend SHALL be matchable to a frontend node ID
- Section-level, entry-level, bullet-level, and basics-level changes SHALL all render gutter markers, colored borders, and inline word diffs
- The fix SHALL NOT change the backend API contract (frontend-only path normalization)

**Non-Goals:**

- Side-by-side old/new document comparison view
- Diff browsing across arbitrary document versions
- Semantic (LCS-based) entry/bullet matching instead of positional
- Accept/Reject backend integration (buttons already exist but are no-ops — separate issue)

## Decisions

### Decision 1: Fix in frontend, not backend

**Choice:** Normalize paths in `buildPathToIdMap` / `findChange` on the frontend side.

**Rationale:** The backend path format is the API contract. Changing it risks breaking any other consumers (tests, SSE parsing, mobile clients). The frontend fix is confined to two functions in one file and can handle both formats transparently. If the backend ever changes its convention, the frontend normalization layer absorbs it.

**Alternative considered:** Normalize in backend `ContentDiffer` to always use bracket-index-first. Rejected because it's a breaking API change for no benefit — and section add/remove paths already use a different format (`sections[{idx}].{label}`) than field-level paths (`sections.{label}.entries[{idx}]`), so the backend itself is inconsistent.

### Decision 2: Build path map with multiple key variants

**Choice:** For each node, insert multiple path-format keys into the map instead of a single key.

**Rationale:** The backend uses at least two distinct path conventions depending on the change type:

- `sections[{idx}].{label}` — section add/remove
- `sections.{label}.entries[{idx}].bullets[{idx}]` — entry/bullet changes within matched sections

Adding both variants as keys in `buildPathToIdMap` makes `findChange` a simple `Map.get()` call (O(1)) rather than an O(n×m) loop with `includes()`.

### Decision 3: Map basics paths to a sentinel ID

**Choice:** Use a well-known sentinel ID (e.g., `"basics"`) for all `basics.*` path keys. `ResumeHeader` consumes diff via `useDiff("basics")` and checks individual field changes.

**Rationale:** Basics fields (`name`, `email`, `phone`, `location`, `summary`) don't have UUIDs — they're a flat dict, not identifiable nodes. But they're rendered by `ResumeHeader`, which can consume the collective diff state for the "basics" sentinel. The alternative of creating a separate `BasicsDiffContext` would duplicate the pattern unnecessarily.

## Risks / Trade-offs

- [Risk] A single `"basics"` sentinel ID collapses all basics field changes into one diff state → mitigation: `ResumeHeader` iterates `diff.changes` directly for basics fields rather than relying on `useDiff` alone
- [Risk] Future backend path format changes could re-break the mapping → mitigation: the multi-variant approach makes it easy to add new format keys without changing lookup logic
