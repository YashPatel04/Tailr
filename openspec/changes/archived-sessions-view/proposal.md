## Why

Users can archive sessions from the sidebar and chat header, but once archived there is no way to see or restore them. The archive action is a one-way trip to /dev/null — the session data stays in the database but the UI has no path back to it. This makes the archive feature feel risky and incomplete.

## What Changes

- New `GET /api/sessions/archived` backend endpoint returning archived sessions ordered by `updated_at` desc
- New "Archived" collapsible group at the bottom of `SidebarHistory`, collapsed by default
- Lazy-loading: archived sessions only fetched when the user expands the section
- Unarchive action (↩) on each archived session item, toggling `is_archived` back to `false`
- Chat rail header shows "Unarchive" instead of "Archive" when viewing an archived session
- Search modal already includes archived sessions via `useSessions()` — add a visual badge to distinguish them

## Capabilities

### New Capabilities

- `archived-sessions`: View, expand, unarchive, and search archived sessions from the sidebar and search modal

### Modified Capabilities

(none — no existing spec requirements are changing)

## Impact

- **Backend**: New route in `app/api/sessions.py`. No schema changes — uses existing `is_archived` column.
- **Frontend**: Changes to `SidebarHistory`, `SidebarHistoryItem` (or new component), `ChatRailHeader`, `SearchModal`, and `hooks/queries.ts`.
- **No breaking changes**: Existing endpoints and data model untouched.
