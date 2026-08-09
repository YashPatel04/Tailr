## 1. Backend

- [x] 1.1 Add `GET /api/sessions/archived` endpoint in `backend/app/api/sessions.py` returning archived sessions ordered by `updated_at` desc

## 2. Frontend — Queries

- [x] 2.1 Add `useArchivedSessions` hook in `frontend/app/hooks/queries.ts` using `useQuery` with query key `["sessions", "archived"]` and `enabled` parameter for lazy loading

## 3. Frontend — Sidebar

- [x] 3.1 Create `SidebarArchivedItem` component in `frontend/app/components/sidebar/` with unarchive (↩) action on hover
- [x] 3.2 Add collapsible "Archived" group to `SidebarHistory` at the bottom, collapsed by default, lazy-fetching on expand
- [x] 3.3 Invalidate `["sessions", "grouped"]`, `["sessions", "archived"]`, and `["sessions"]` caches on archive and unarchive actions in `SidebarHistoryItem` and `SidebarArchivedItem`

## 4. Frontend — Chat Header

- [x] 4.1 Update `ChatRailHeader` to show "Unarchive" when `session.is_archived` is true, with action to toggle `is_archived` back to `false`

## 5. Frontend — Search

- [x] 5.1 Add "(archived)" badge to archived session results in `SearchModal`
