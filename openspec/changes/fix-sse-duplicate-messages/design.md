## Context

The chat feature uses `@microsoft/fetch-event-source` (v2.0.1) for SSE communication. The frontend sends a POST request to `POST /api/sessions/{id}/chat` and processes a stream of typed SSE events (`researching`, `research_done`, `thinking`, `writing`, `proposal`, `done`, `error`). The library has an opaque retry loop that, on connection errors, automatically retries the POST — causing the backend to process each retry as a new message. The current `onerror` handler's `throw err` stops the retry loop, but `controller.abort()` before the throw resolves the outer promise via the abort listener, masking errors. Two independent hook instances (`ChatRail.tsx:22` and `EnhancedProposal.tsx:13`) each create their own `sendMessage` and `controllerRef`, enabling parallel independent requests.

**Current architecture:**
```
ChatInput ──sendMessage──▶ useSessionSSE (ChatRail instance)
                              └── fetchEventSource(POST)
                                    └── onerror: controller.abort() + throw err

EnhancedProposal ──sendMessage──▶ useSessionSSE (EnhancedProposal instance)
                                    └── fetchEventSource(POST)
                                          └── onerror: controller.abort() + throw err
```

**Backend:** FastAPI `StreamingResponse` with async generator. User message saved to DB at line 81-89 (before event stream starts). No request deduplication.

## Goals / Non-Goals

**Goals:**
- Eliminate all duplicate message processing from SSE requests
- Single request at a time — no concurrent requests possible
- Full control over request lifecycle (no opaque retry behavior)
- Backend rejects duplicate requests within a configurable time window
- Clean error handling — errors propagate correctly, streaming state resets consistently

**Non-Goals:**
- Changing the SSE event protocol or event types
- Adding streaming LLM responses (current backend calls `adapter.chat(stream=False)`)
- Implementing automatic retry with exponential backoff (explicit retry UX is a future feature)
- Changing the chat API endpoint path or authentication mechanism

## Decisions

### Decision 1: Replace `fetchEventSource` with plain `fetch` + manual SSE parsing

**Choice:** Use `fetch()` with `ReadableStream` reader and manual SSE line parsing.

**Why:**
- `fetchEventSource`'s retry loop is the root cause of duplicate messages. The library's `onerror` → `throw err` path works but the `controller.abort()` → `resolve()` interaction masks errors.
- The SSE protocol is simple: `event: <type>\ndata: <json>\n\n`. Manual parsing is ~30 lines.
- POST-based SSE doesn't benefit from the library's auto-reconnect (designed for GET EventSource).
- Plain `fetch` gives explicit control: one request, one response, one reader, done.

**Alternatives considered:**
- **Keep library, fix handlers:** Remove `controller.abort()` from `onerror`, let `throw err` handle exit. Add custom `onopen` for status checks. Risk: library behavior is still opaque; future library updates could reintroduce issues.
- **Use `eventsource-parser` npm package:** Parses SSE streams but still requires manual `fetch` setup. Adds a dependency for ~20 lines of parsing logic. Not worth it.

**Implementation:**
```typescript
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", ... },
  body: JSON.stringify(payload),
  signal: controller.signal,
})

if (!response.ok) {
  // handle error, no retry
  return
}

const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ""

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  // parse complete SSE messages from buffer
  const messages = buffer.split("\n\n")
  buffer = messages.pop()! // keep incomplete last message
  for (const msg of messages) {
    // extract event: and data: lines
    // call appropriate handler
  }
}
```

### Decision 2: Single hook instance via Zustand store

**Choice:** Move `sendMessage` function and `controllerRef` into the Zustand `sessionStore` so both `ChatRail` and `EnhancedProposal` share one instance.

**Why:**
- Two independent `useSessionSSE` calls create two independent `controllerRef`s. Aborting one doesn't affect the other.
- Zustand is already used for session state. Adding SSE state there is natural.
- Eliminates the possibility of parallel requests from different components.

**Alternatives considered:**
- **React Context:** Creates a provider wrapper. More ceremony for the same result. Zustand is already the pattern in this codebase.
- **Singleton module-level state:** Works but doesn't integrate with React's lifecycle. Harder to clean up on unmount.

**Implementation:**
- Add `sendMessage` and `controllerRef` to `sessionStore`
- Remove `useSessionSSE` hook (or refactor it to just call the store)
- `ChatRail` and `EnhancedProposal` both call `useSessionStore(s => s.sendMessage)`

### Decision 3: Backend request deduplication via `request_id`

**Choice:** Accept optional `request_id` (UUID) in `ChatMessageRequest`. Check a short-lived in-memory set of recent `request_id` values. Reject duplicates with 409.

**Why:**
- Belt-and-suspenders: even if the frontend is fixed, a browser extension, proxy, or user double-click could send duplicates.
- In-memory set with TTL (60 seconds) is sufficient — no need for Redis or DB persistence.
- Optional field: existing clients that don't send `request_id` are unaffected.

**Alternatives considered:**
- **Database unique constraint on `request_id`:** Requires schema migration. Overkill for a transient dedup check.
- **Redis-based dedup:** Adds Redis dependency for this feature alone. The app uses Redis for rate limiting but dedup is better kept in-process.
- **Idempotency key in HTTP header:** Standard pattern but the frontend already sends custom headers (CSRF). Adding another header is fine but a body field is simpler for this case.

**Implementation:**
```python
_recent_request_ids: dict[str, float] = {}  # request_id -> timestamp
DEDUP_WINDOW_SECONDS = 60

def _is_duplicate(request_id: str | None) -> bool:
    if not request_id:
        return False
    now = time.time()
    # cleanup old entries
    expired = [k for k, v in _recent_request_ids.items() if now - v > DEDUP_WINDOW_SECONDS]
    for k in expired:
        del _recent_request_ids[k]
    if request_id in _recent_request_ids:
        return True
    _recent_request_ids[request_id] = now
    return False
```

### Decision 4: SSE parsing as a standalone utility function

**Choice:** Extract SSE parsing into a pure function `parseSSELines(buffer: string) => { events: SSEEvent[], remainder: string }`.

**Why:**
- Testable in isolation.
- Reusable if other parts of the app need SSE parsing.
- Keeps `sendMessage` focused on request lifecycle, not parsing details.

## Risks / Trade-offs

**[Risk] Manual SSE parsing edge cases** → Mitigation: The SSE spec is simple (lines starting with `event:`, `data:`, `id:`, `:` for comments). Our backend only uses `event:` and `data:`. Parser handles `\n\n` delimiters and partial lines in buffers. Unit test the parser.

**[Risk] In-memory dedup doesn't survive server restarts** → Mitigation: Acceptable. The dedup window is 60 seconds. A restart during an active chat session is rare and the worst case is one duplicate message.

**[Risk] In-memory dedup doesn't work across multiple backend workers** → Mitigation: The app runs a single Uvicorn worker in Docker. If scaled to multiple workers, switch to Redis-based dedup (already in the stack for rate limiting).

**[Risk] Consolidating hook to Zustand store changes component re-render behavior** → Mitigation: `sendMessage` is a stable reference (created once in the store). Components that select it only re-render if the function reference changes (it won't). The streaming state is already in Zustand.

**[Trade-off] No automatic retry** → Users must manually resend on network errors. This is acceptable for an MVP — explicit retry UX can be added later with a "Retry" button that uses the same `request_id`.

## Migration Plan

1. **Deploy backend first** — add `request_id` field (optional) and dedup logic. No breaking changes.
2. **Deploy frontend** — replace `fetchEventSource` with plain `fetch`, consolidate hook. Remove `@microsoft/fetch-event-source` from `package.json`.
3. **Rollback** — revert frontend to use `fetchEventSource` (still in `node_modules` until `npm install` re-runs). Backend changes are backward-compatible.

## Open Questions

- Should the `sendMessage` function in the store be a method on the store or a standalone function imported by the store? (Recommendation: store method, so it has direct access to `setStreaming`, `setProgress`, etc.)
- Should we add a "Retry" button on error that reuses the same `request_id`? (Recommendation: yes, as a follow-up.)
