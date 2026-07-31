## 1. Backend: Request Deduplication

- [x] 1.1 Add `request_id: str | None = None` field to `ChatMessageRequest` model in `backend/app/api/tailor.py`
- [x] 1.2 Add `import time` to `backend/app/api/tailor.py`
- [x] 1.3 Create module-level `_recent_request_ids: dict[str, float]` and `DEDUP_WINDOW_SECONDS = 60` constants in `backend/app/api/tailor.py`
- [x] 1.4 Implement `_is_duplicate(request_id: str | None) -> bool` helper function that checks/cleans the dedup set and returns whether the request is a duplicate
- [x] 1.5 Add dedup check at the start of `chat_stream` endpoint — before the session lookup — returning HTTP 409 with `{"detail": "Duplicate request"}` if duplicate
- [x] 1.6 Add `import time` and verify no circular imports

## 2. Backend: Error Response Consistency

- [x] 2.1 Verify that the "no LLM provider" error path (line 155-159) returns HTTP 422 instead of emitting an SSE error event — move the check before `StreamingResponse` creation
- [x] 2.2 Verify that the "no document found" error path (line 190-195) returns HTTP 422 instead of emitting an SSE error event — move the check before `StreamingResponse` creation
- [x] 2.3 Wrap the `event_stream` generator's outer try/except to emit `event: error` SSE events consistently (already done, verify format)

## 3. Frontend: SSE Parsing Utility

- [x] 3.1 Create `frontend/app/lib/sseParser.ts` with the `parseSSEStream` function
- [x] 3.2 Implement `SSEEvent` type: `{ event: string; data: string }`
- [x] 3.3 Implement `parseSSELines(buffer: string): { events: SSEEvent[]; remainder: string }` — splits buffer on `\n\n`, parses `event:` and `data:` lines from each chunk
- [x] 3.4 Implement `parseSSEStream(stream: ReadableStream, onEvent: (event: SSEEvent) => void, signal: AbortSignal): Promise<void>` — reads stream with `getReader()`, buffers chunks, calls `parseSSELines`, dispatches events, handles abort
- [x] 3.5 Add unit tests for `parseSSELines` in `frontend/app/lib/__tests__/sseParser.test.ts` — test complete messages, partial messages, multiple messages in one chunk, empty data

## 4. Frontend: Consolidate SSE Hook into Zustand Store

- [x] 4.1 Add SSE-related state to `sessionStore.ts`: `controllerRef` (as a module-level `let` variable, not Zustand state), `sendMessage` function
- [x] 4.2 Move the `sendMessage` implementation from `useSessionSSE.ts` into the Zustand store — uses `parseSSEStream` instead of `fetchEventSource`
- [x] 4.3 `sendMessage` implementation: generate `request_id` (UUID), abort previous controller, create new controller, call `fetch` with POST body including `request_id`, check `response.ok`, call `parseSSEStream`, handle errors in outer try/catch
- [x] 4.4 Handle non-2xx responses: if `response.status === 409`, show "Duplicate request" toast; otherwise show "Connection failed" toast with status code
- [x] 4.5 In `onEvent` callback, replicate the existing `switch (event.event)` logic from `useSessionSSE.ts` — handle `researching`, `research_done`, `thinking`, `writing`, `proposal`, `done`, `error`
- [x] 4.6 Ensure cleanup on error/abort: `setStreaming(false)`, `setProgress("", "")`, `queryClient.invalidateQueries`
- [x] 4.7 Export `sendMessage` as a selector from the store: `useSessionStore(s => s.sendMessage)`

## 5. Frontend: Update Components to Use Store

- [x] 5.1 Update `ChatRail.tsx`: replace `const { sendMessage } = useSessionSSE(activeSessionId)` with `const sendMessage = useSessionStore(s => s.sendMessage)`
- [x] 5.2 Update `EnhancedProposal.tsx`: replace `const { sendMessage } = useSessionSSE(activeSessionId)` with `const sendMessage = useSessionStore(s => s.sendMessage)`
- [x] 5.3 Remove `import { useSessionSSE } from "@/hooks/useSessionSSE"` from both files
- [x] 5.4 Verify that `ChatInput` still receives `sendMessage` correctly via props (no change needed — it already receives `onSend` prop)

## 6. Frontend: Remove fetchEventSource Dependency

- [x] 6.1 Remove `@microsoft/fetch-event-source` from `frontend/package.json` dependencies
- [x] 6.2 Run `npm install` to update lockfile
- [x] 6.3 Verify no remaining imports of `@microsoft/fetch-event-source` in the codebase via grep
- [x] 6.4 Delete or archive `frontend/app/hooks/useSessionSSE.ts` (no longer used)

## 7. Verification

- [x] 7.1 Run `npm run lint` in `frontend/` to verify no lint errors
- [x] 7.2 Run `poetry run ruff check .` in `backend/` to verify no lint errors
- [x] 7.3 Run `npm test` in `frontend/` to verify existing tests pass
- [x] 7.4 Run `poetry run pytest` in `backend/` to verify existing tests pass
- [ ] 7.5 Manually verify: send a chat message and confirm exactly one POST request in browser Network tab
- [ ] 7.6 Manually verify: simulate network error (disconnect) and confirm no retry requests
- [ ] 7.7 Manually verify: send two rapid messages and confirm both are processed (not deduped — different request_ids)
