## Why

Multiple deletion operations in the sidebar and settings UI leave the frontend stale. After deleting a chat session, the company count badge, grouped history, and active session state don't update. After deleting a master resume, the UI still shows the old resume until page reload. These bugs degrade trust in the app — users see phantom data after performing destructive actions.

## What Changes

- Invalidate `["companies"]` query cache after session delete/archive so company count badges update and companies vanish when count hits 0
- Invalidate `["sessions", "grouped"]` query cache after session delete so the sidebar history list refreshes immediately
- Clear master resume query cache after deletion so the UI reflects the empty state without reload
- Redirect to `/` and clear active session store when user deletes the session they're currently viewing

## Capabilities

### New Capabilities

- `session-deletion-ux`: Handles all UI state updates after chat session deletion — cache invalidation, active session cleanup, and redirect behavior
- `master-resume-deletion-ux`: Handles UI state update after master resume deletion — cache clearing so the empty state renders immediately

### Modified Capabilities

<!-- No existing specs to modify -->

## Impact

- **Frontend files**: `SidebarHistoryItem.tsx`, `SettingsModal.tsx`, `settings/master-resume/page.tsx`
- **React Query cache keys affected**: `["sessions"]`, `["sessions", "grouped"]`, `["companies"]`, `["master-resume"]`
- **Zustand store**: `sessionStore.activeSessionId` cleared on active session deletion
- **No API changes**: Backend already returns correct data; issue is purely frontend cache staleness
