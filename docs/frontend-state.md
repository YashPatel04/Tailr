# Frontend State — How Data Flows

## Stores

### sessionStore (Zustand)

```
{
  activeSessionId: string | null    // currently selected session
  activeDocType: "resume" | "cover_letter"
  viewMode: "diff" | "final"       // toggles diff overlay vs normal editing
  setupOpen: boolean                // setup wizard visibility
  isStreaming: boolean             // SSE streaming active
  latestDocument: SessionDocument | null
  latestDiff: DiffChangeSet | null // diff data from the most recent proposal
  pendingProposal: PendingProposal | null  // { message, operations, diff, patch_summary }
  progressPhase: string            // current SSE phase label
  progressMessage: string          // human-readable progress text
}
```

Actions: `setActiveSession`, `setDocType`, `setViewMode`, `setStreaming`, `setLatestDiff`, `setPendingProposal`, `clearProposal`, `setProgress`.

The store holds all volatile session-level UI state. No document content is stored here — content lives in React Query cache.

## Data Queries (React Query)

| Hook | Query Key | Endpoint | Returns |
|------|-----------|----------|---------|
| `useSessionDocument(id, docType)` | `["sessions", id, "document", docType]` | `GET /api/sessions/{id}` | Extracts `latest_document` and destructures into `{ content (ResumeContent), documentModel (legacy), ...metadata }` |
| `useSessionMessages(id)` | `["sessions", id, "messages"]` | `GET /api/sessions/{id}/messages` | Chat message history |
| `useMasterResume()` | `["master-resume"]` | `GET /api/master-resume` | User's uploaded master resume |
| `useSessions()` | `["sessions"]` | `GET /api/sessions` | All sessions |
| `useSession(id)` | `["sessions", id]` | `GET /api/sessions/{id}` | Single session metadata |

All queries are enabled only when their required params (e.g., `sessionId`) are non-null. Invalidation of the `["sessions"]` key refreshes the session list; invalidation of `["sessions", id]` or `["sessions", id, "document", docType]` refreshes document content.

## SSE Hook (useSessionSSE)

`useSessionSSE(sessionId)` connects an EventSource to `POST /api/sessions/{id}/chat` using `@microsoft/fetch-event-source`. Returns a `sendMessage(content)` function.

**Event handling:**

| Event | Action |
|-------|--------|
| `researching` | Sets progress to "Researching..." |
| `research_done` | Sets progress to "Research complete" |
| `thinking` | Sets progress to "Thinking..." |
| `writing` | Sets progress to "Writing changes..." |
| `proposal` | Stops streaming, sets `viewMode` to "diff", stores `latestDiff` and `pendingProposal`, invalidates session queries |
| `done` | Stops streaming, sets `viewMode` to "diff", stores `latestDiff`, invalidates session queries |
| `error` | Stops streaming, shows error toast |

The hook auto-aborts the previous EventSource controller when `sessionId` changes via a cleanup `useEffect`.

## Optimistic Editing (editQueue)

The `editQueue` module provides a single function: `queueEdit(op)`. It works like this:

1. **Queue**: Each edit pushes an operation object into an in-memory array.
2. **Debounce**: A 2-second timer is reset on every push. When the timer fires, all queued ops are flushed.
3. **Immediate cache update**: Before queueing, components call `queryClient.setQueryData()` to update React Query cache instantly (optimistic UI).
4. **Flush**: `flushEdits()` sends `PATCH /api/sessions/{id}/document` with `{ operations: [...] }`.

Operations use a flat schema keyed by section label + entry/bullet indices:

| Operation | Fields |
|-----------|--------|
| `update_field` | `section_label, entry_index, field, value` |
| `update_bullet` | `section_label, entry_index, bullet_index, text, spans` |
| `delete_bullet` | `section_label, entry_index, bullet_index` |
| `add_bullet` | `section_label, entry_index, after_index, text, spans` |
| `move_section` | `from_index, to_index` |
| `move_entry` | `section_label, from_index, to_index` |
| `reorder_bullets` | `section_label, entry_index, order` (array of new indices) |

Cache updates mirror the operation logic: `structuredClone` the content, mutate the clone, and set it back into the query cache under the `["sessions", id, "document", docType]` key.

## Proposal Flow

```
1. User sends chat message
       │
2. SSE "proposal" event fires
       │
3. Store updated: viewMode="diff", latestDiff=<diff>, pendingProposal=<proposal>
       │
4. DocumentCanvas renders DiffView (shows ChangesSummary panel)
       │
5. ProposalMessage renders Accept / Decline buttons
       │
   ┌─── Accept ───┐          ┌─── Decline ───┐
   │               │          │                │
   │ POST          │          │ POST           │
   │ /proposal/    │          │ /proposal/     │
   │ accept        │          │ decline        │
   │ (body: ops)   │          │                │
   │               │          │                │
   │ viewMode →    │          │ Clear          │
   │ "final"       │          │ proposal       │
   │ Clear         │          │                │
   │ proposal      │          │                │
   │ Invalidate     │         │ Invalidate     │
   │ queries       │          │ messages       │
   └───────────────┘          └────────────────┘
```

**On Accept**: The `operations` array from the pending proposal is sent to the server via `POST /api/sessions/{id}/proposal/accept`. On success, the view switches back to "final" mode and all session/document queries are invalidated to fetch the applied changes.

**On Decline**: A simple `POST /api/sessions/{id}/proposal/decline` clears the pending proposal and invalidates messages. The document content remains unchanged.

## API Client (apiRequest)

All network calls go through `apiRequest(method, path, body?, opts?)` in `lib/api.ts`. It:

1. Fetches a CSRF token from `GET /api/health` and caches it
2. Attaches `X-CSRF-Token` header to every request
3. On 401 responses, attempts a token refresh via `POST /api/auth/refresh`
4. Updates the cached CSRF token from `X-CSRF-Token` response headers
5. Returns parsed JSON (or a Blob when `rawResponse: true`)
