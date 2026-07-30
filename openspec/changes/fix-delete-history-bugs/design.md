## Context

The frontend uses React Query for server state and Zustand for client state. When destructive actions occur (delete session, delete master resume), the handlers call `apiRequest` then `invalidateQueries` — but only for the primary query key, missing related caches. This leaves stale data in sidebar company counts, grouped history, and master resume views.

Key files:
- `app/components/sidebar/SidebarHistoryItem.tsx` — session delete/archive handlers
- `app/components/sidebar/SidebarProjects.tsx` — company list with session_count badge
- `app/components/sidebar/SidebarHistory.tsx` — grouped session history
- `app/components/settings/SettingsModal.tsx` — master resume delete in modal
- `app/settings/master-resume/page.tsx` — master resume delete on settings page
- `app/hooks/queries.ts` — query hook definitions
- `app/stores/sessionStore.ts` — Zustand store for active session

## Goals / Non-Goals

**Goals:**
- After session delete/archive: company badges, grouped history, and company list all reflect the deletion immediately
- After master resume delete: UI shows empty state without page reload
- After deleting the currently active session: user is redirected to `/`
- All fixes use React Query cache patterns already established in the codebase

**Non-Goals:**
- Backend API changes (already correct)
- Optimistic updates (overkill for these small mutations)
- Refactoring query hooks into shared utilities
- Touching the archive flow in `ChatRailHeader.tsx` (out of scope for this change)

## Decisions

### 1. Use `invalidateQueries` for session-related caches, `setQueryData` for master resume

**Decision:** After session delete/archive, invalidate `["sessions"]`, `["sessions", "grouped"]`, and `["companies"]`. After master resume delete, call `setQueryData(["master-resume"], null)`.

**Rationale:** Session and company data are fetched by multiple components — invalidation ensures all consumers refetch. Master resume is a singleton; after deletion the GET returns 404, which React Query treats as error (not data=null). Explicitly setting `null` bypasses the 404 problem and immediately renders the empty state.

**Alternatives considered:**
- `removeQueries` for master resume: Works but causes a flash of loading state. `setQueryData(null)` is instant.
- Optimistic update for sessions: Adds complexity for minimal gain — the mutations are fast.

### 2. Check `isActive` before redirect, clear store, then navigate

**Decision:** In `handleDelete`, after the API call succeeds, check if `session.id === activeSessionId`. If so, call `useSessionStore.getState().setActiveSessionId(null)` (or equivalent) and `router.push("/")`.

**Rationale:** The store needs to be cleared before navigation so the target page doesn't try to load a stale session ID. The `isActive` check is already computed at component mount, so no extra work needed.

### 3. Co-locate invalidation in existing handlers

**Decision:** Add the missing `invalidateQueries` calls directly in `SidebarHistoryItem.tsx`'s `handleDelete` and `handleArchive`. No new hooks or abstractions.

**Rationale:** The handlers are small (3-4 lines). Extracting a shared `useDeleteSession` hook would be over-engineering for this scope.

## Risks / Trade-offs

- **Race condition on rapid deletes**: If user deletes multiple sessions quickly, invalidation may refetch stale-then-fresh data. Low risk — mutations are sequential due to `await`, and React Query deduplicates concurrent refetches.
- **Master resume `setQueryData(null)` vs actual 404**: If the API changes to return 200 with `{data: null}` instead of 404, `setQueryData(null)` still works. No coupling to HTTP status.
- **`router.push("/")` after deleting active session**: User loses their place. Acceptable — the session is gone; `/` is the natural landing.
