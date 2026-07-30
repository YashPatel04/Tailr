## Context

The session page at `app/(app)/session/[id]/page.tsx` uses `useParams()` to get the session ID, calls `setActiveSession(params.id)`, and renders `DocumentCanvas`. There is no check that the session ID corresponds to an actual session. The `useSession` hook already exists in `queries.ts` and returns an error state for 404s.

## Goals / Non-Goals

**Goals:**
- Redirect to `/` when navigating to a non-existent session
- Minimal code change — leverage existing `useSession` hook

**Non-Goals:**
- Custom 404 page
- Loading state during existence check
- Soft-404 handling (empty but 200 response)

## Decisions

### 1. Use useSession hook for existence check

**Decision:** Call `useSession(params.id)` in the session page. If `isError` is true (404 from API), redirect to `/` via `router.replace("/")`.

**Rationale:** The hook already fetches the session and handles error states. No new API calls or logic needed. Using `replace` instead of `push` avoids polluting browser history with the invalid URL.

### 2. Render null while checking

**Decision:** If the session is loading (`isLoading`), render nothing. The redirect happens fast enough that a loading spinner would flash distracting.

**Rationale:** The canvas would just show empty state anyway during loading.

## Risks / Trade-offs

- **Race condition**: User navigates to valid session while previous redirect is in flight → React handles this via cleanup; no issue.
- **Network flakiness**: Temporary 500 could trigger redirect → Acceptable. User can retry; the session list is always accessible.
