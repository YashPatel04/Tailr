## Context

The app has a session archive feature (`is_archived` boolean on the `Session` model) that is write-only — users can archive from the sidebar and chat header, but the UI provides no path to view or restore archived sessions. The grouped sessions endpoint (`GET /api/sessions/grouped`) filters out archived sessions. The flat sessions endpoint (`GET /api/sessions`) returns everything but is only used by the search modal.

## Goals / Non-Goals

**Goals:**
- Let users view archived sessions from the sidebar
- Let users unarchive sessions (toggle `is_archived` back to `false`)
- Keep archived sessions searchable (already works via `useSessions()`)
- Lazy-load archived data only when requested

**Non-Goals:**
- Bulk unarchive or bulk archive
- Permanent delete from archive
- Archive search filtering (search already covers all sessions)
- Pagination for archived sessions (unlikely to have many; revisit if needed)

## Decisions

### 1. Separate endpoint `GET /api/sessions/archived`

**Why**: The grouped endpoint serves the main sidebar and is called frequently. Mixing archived sessions into it would add unnecessary payload to every sidebar load. A separate endpoint loaded on-demand keeps the hot path clean.

**Alternatives considered**:
- Extend `/api/sessions/grouped` with a 5th `archived` key — rejected because it forces archived data into every sidebar refresh
- Reuse `/api/sessions` with a query param `?archived=true` — rejected because that endpoint is already used by search and changing its semantics is risky

### 2. Collapsible "Archived" group in `SidebarHistory`

**Why**: Matches the existing pattern for time-based groups (Today, Yesterday, etc.) — each is a collapsible section with a toggle button. Users already understand this interaction.

**Behavior**: Collapsed by default. On first expand, fetches from `/api/sessions/archived` via `useQuery` with `enabled` tied to the expanded state. Subsequent expands use cached data with stale-while-revalidate.

### 3. Unarchive action on sidebar items + chat header toggle

**Why**: Symmetry with the existing archive action. The sidebar item shows ↩ on hover (next to the existing archive and delete icons). The chat header menu shows "Unarchive" when `session.is_archived` is true.

### 4. Search modal badge for archived sessions

**Why**: Search already includes archived sessions. A subtle "(archived)" label on the result item prevents confusion when users see sessions they thought were gone.

## Risks / Trade-offs

- **Stale cache after unarchive**: When a user unarchives from the sidebar, the archived list needs to remove that item and the active list needs to add it. Both query keys must be invalidated. → Invalidate `["sessions", "grouped"]`, `["sessions", "archived"]`, and `["sessions"]` on both archive and unarchive actions.

- **No pagination on archived endpoint**: If a user archives hundreds of sessions, the response could be large. → Acceptable for now; revisit with cursor pagination if load times become an issue.
