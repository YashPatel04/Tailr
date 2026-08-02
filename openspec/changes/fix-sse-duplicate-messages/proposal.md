## Why

When a user sends a chat message, it appears in the UI 4–6 times, each with a full LLM response. The root cause is `@microsoft/fetch-event-source`'s built-in retry loop: when a connection fails or returns an error, it automatically retries the POST request indefinitely. Each retry is processed by the backend as a new message — saving a new user message to the DB, calling the LLM, and saving a new assistant message. The current `onerror` handler's `throw err` stops the retry loop, but the library's `controller.abort()` call in `onerror` resolves the outer promise (via the abort listener), masking errors and allowing the user to trigger new requests while the backend is still processing previous ones. Additionally, there is no backend idempotency protection, no custom `onopen` to catch non-2xx responses, and two independent hook instances (`ChatRail` and `EnhancedProposal`) each with their own `sendMessage` and `controllerRef`.

## What Changes

- **Replace `@microsoft/fetch-event-source` with plain `fetch` + manual SSE parsing** — eliminates the opaque retry loop entirely, giving full control over the request lifecycle with zero automatic retry behavior.
- **Consolidate to a single `useSessionSSE` hook instance** — move the hook's state into Zustand or use React context so that `ChatRail` and `EnhancedProposal` share one `sendMessage` function and one `AbortController` ref, preventing parallel independent requests.
- **Add request deduplication on the backend** — include a `request_id` (UUID) in the POST body; the backend checks for recent duplicate `request_id` values before processing, rejecting duplicates with a 409.
- **Add custom `onopen` status check (if library is kept as fallback)** — verify `response.ok` before proceeding with stream processing; throw on non-2xx to trigger error handling.
- **Improve error handling in `sendMessage`** — ensure that on error, `setStreaming(false)` is called, the promise rejects properly, and the outer catch block handles cleanup consistently.

## Capabilities

### New Capabilities

- `sse-client-replacement`: Plain fetch + ReadableStream SSE client that replaces `@microsoft/fetch-event-source`, with manual SSE line parsing, single-request enforcement, and proper abort/cleanup lifecycle.
- `request-deduplication`: Backend idempotency mechanism using `request_id` to prevent duplicate message processing from retries or parallel requests.

### Modified Capabilities

- `chat-streaming`: The existing chat SSE endpoint at `POST /api/sessions/{id}/chat` — requirements change to accept and validate `request_id`, reject duplicates, and return consistent error status codes.

## Impact

- **Frontend files**: `frontend/app/hooks/useSessionSSE.ts` (rewrite), `frontend/app/components/chat/ChatRail.tsx` (update hook usage), `frontend/app/components/chat/EnhancedProposal.tsx` (update hook usage), `frontend/app/stores/sessionStore.ts` (add SSE state if consolidating hook), `frontend/package.json` (remove `@microsoft/fetch-event-source` dependency).
- **Backend files**: `backend/app/api/tailor.py` (add `request_id` field to `ChatMessageRequest`, add dedup check before processing).
- **Dependencies**: `@microsoft/fetch-event-source` removed from frontend.
- **API**: `POST /api/sessions/{id}/chat` gains optional `request_id` field; returns 409 on duplicate.
- **No breaking changes** for existing clients — `request_id` is optional; omitting it skips dedup check.
