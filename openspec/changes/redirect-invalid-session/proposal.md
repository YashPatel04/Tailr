## Why

Navigating to a session URL with a fake or deleted ID (e.g. `/session/sfsfdgsdfgd`) leaves the user on a broken page with no feedback. The session page blindly sets `activeSessionId` and renders `DocumentCanvas` without checking if the session exists. Users have no way to recover without manually editing the URL.

## What Changes

- Session page fetches the session by ID and redirects to `/` if it doesn't exist (404 or error)

## Capabilities

### New Capabilities

- `session-existence-guard`: Session page validates that the session ID corresponds to a real session before rendering, redirecting to `/` on failure

### Modified Capabilities

<!-- No existing specs to modify -->

## Impact

- **Modified files**: `app/(app)/session/[id]/page.tsx`
- **No API changes**: The session GET endpoint already returns 404 for invalid IDs
- **No new dependencies**: Uses existing `useSession` hook and `router.push`
