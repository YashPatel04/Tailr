# Frontend State — How Data Flows

## Stores

### sessionStore (Zustand)

```
{
  activeSessionId: string | null        // currently selected session
  activeDocType: "resume" | "cover_letter"
  viewMode: "changes" | "final"         // toggles diff review vs normal editing
  setupOpen: boolean                     // setup wizard visibility
  isStreaming: boolean                   // SSE streaming active
  streamingDocType: "resume" | "cover_letter" | null  // doc type being streamed
  latestDocument: SessionDocument | null // set from the "done" SSE event's document_id
  snapshot: ResumeContent | null         // document content captured when a proposal arrives
  pendingProposal: PendingProposal | null // { message, operations, patch_summary, explanation?, reasoning? }
  progressPhase: string                  // "researching" | "research_done" | "thinking" | "writing"
  progressMessage: string                // human-readable progress text
  saveStatus: "idle" | "queued" | "saving" | "saved" | "error"
  editingFieldId: string | null          // inline editor currently focused
  activeMode: "plan" | "edit"            // plan = proposals only; edit = direct document ops
  tailoringMode: "polish" | "refine" | "rewrite"
  selectedProviderId: string | null
  selectedModel: string | null
}
```

Actions: `setActiveSession`, `setDocType`, `setViewMode`, `setSetupOpen`, `setStreaming`, `setLatestDocument`, `setSnapshot`/`clearSnapshot`, `setPendingProposal`/`clearProposal`, `setProgress`, `setSaveStatus`, `setEditingFieldId`, `setActiveMode`, `setTailoringMode`, `setSelectedModel`, `sendMessage`.

Notes:

- Switching sessions (`setActiveSession`) resets `pendingProposal`, `snapshot`, `viewMode` back to `"final"`, and clears progress.
- `pendingProposal` is `{ message, operations, patch_summary, explanation?, reasoning? }`. `operations` is the server's patch used on Accept; the visual diff is not part of this payload (see Proposal Flow).
- Document content is not stored here except for the one-shot `snapshot` captured at proposal time — content lives in the React Query cache.

## Data Queries (React Query)

| Hook                                                    | Query Key                                              | Endpoint                                                               | Returns                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `useCurrentUser(opts?)`                                 | `["user", "me"]`                                       | `GET /api/users/me`                                                    | `User`; `retry: false`; `noAuthRedirect` option                                                                                                |
| `useProviders()`                                        | `["providers"]`                                        | `GET /api/providers`                                                   | `LLMProvider[]`                                                                                                                                |
| `useModels(providerId)`                                 | `["providers", providerId, "models"]`                  | `GET /api/providers/{id}/models`                                       | `{ models: ModelInfo[], cached }`; enabled only when `providerId` set; `staleTime` 5 min; `retry: false`                                       |
| `useAllModels(providers?)`                              | `["all-models", <comma-joined provider ids>]`          | per-provider `GET /api/providers/{id}/models` via `Promise.allSettled` | `[{ providerId, models, available }]`; `[]` when no providers                                                                                  |
| `useUserPreferences()`                                  | `["user", "preferences"]`                              | `GET /api/users/me/preferences`                                        | `UserPreferences`                                                                                                                              |
| `useSessions(opts?)`                                    | `["sessions"]`                                         | `GET /api/sessions`                                                    | All sessions                                                                                                                                   |
| `useSession(id)`                                        | `["sessions", id]`                                     | `GET /api/sessions/{id}`                                               | Single session metadata                                                                                                                        |
| `useSessionDocument(sessionId, docType)`                | `["sessions", id, "document", docType]`                | `GET /api/sessions/{id}` (same endpoint as `useSession`)               | Extracts `latest_document`; returns `null` unless `document_type === docType`; returns `{ ...doc, content }` with `content` as `ResumeContent` |
| `useSessionMessages(id, docType)`                       | `["sessions", id, "messages", docType]`                | `GET /api/sessions/{id}/messages?doc_type=`                            | Chat message history                                                                                                                           |
| `useMasterResume()`                                     | `["master-resume"]`                                    | `GET /api/master-resume`                                               | User's uploaded master resume; `retry: false`                                                                                                  |
| `useGroupedSessions()` / `useArchivedSessions(enabled)` | `["sessions", "grouped"]` / `["sessions", "archived"]` | `GET /api/sessions/grouped` / `.../archived`                           | Grouped / archived session lists                                                                                                               |
| `useCompanies()` / `useTags()`                          | `["companies"]` / `["tags"]`                           | `GET /api/companies` / `GET /api/tags`                                 | Companies / tags                                                                                                                               |

All queries are enabled only when their required params (e.g., `sessionId`, `providerId`) are non-null. Note the messages key includes `docType` — `sendMessage` writes its optimistic user message under the same `["sessions", id, "messages", docType]` key. Invalidation of `["sessions"]` refreshes the session list; invalidation of `["sessions", id]`, `["sessions", id, "document", docType]`, or the messages key refreshes the affected data.

## Chat Streaming (sendMessage in sessionStore)

Chat lives in the store action `sendMessage(content, queryClient, proposalContext?)` — there is no separate SSE hook. It:

1. Aborts any in-flight stream via a module-level `AbortController` and creates a fresh one; generates a `request_id` via `crypto.randomUUID()`.
2. Sets `isStreaming: true`, `streamingDocType` to the active doc type, clears progress.
3. Optimistically appends the user message to the `["sessions", id, "messages", docType]` cache.
4. POSTs to `{base}/api/sessions/{id}/chat` with the CSRF header, `Accept: text/event-stream`, and body `{ content, role: "user", doc_type, mode, tailoring_mode, proposal_context, llm_provider_id, model, request_id }`.
5. Consumes `response.body` as an SSE stream with `parseSSEStream` from `lib/sseParser` (plain fetch + `ReadableStream` reader — not EventSource and not `@microsoft/fetch-event-source`).

**Event handling:**

| Event           | Action                                                                                                                                                                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `researching`   | Sets `progressPhase` to `"researching"` with the payload message (or "Researching...")                                                                                                                                                                                                                                              |
| `research_done` | Sets `progressPhase` to `"research_done"`, message "Research complete"                                                                                                                                                                                                                                                              |
| `thinking`      | Sets `progressPhase` to `"thinking"`                                                                                                                                                                                                                                                                                                |
| `writing`       | Sets `progressPhase` to `"writing"`                                                                                                                                                                                                                                                                                                 |
| `proposal`      | Stops streaming. If `data.mode === "plan"`: only invalidates messages. Otherwise snapshots the cached document content into `snapshot` (if not already set), sets `viewMode` to `"changes"`, stores `pendingProposal` (message, operations, patch_summary, explanation, reasoning), invalidates `["sessions"]` and the messages key |
| `done`          | Stops streaming; if `data.document_id` present, sets `latestDocument` from it; invalidates `["sessions"]` and the messages key                                                                                                                                                                                                      |
| `error`         | Aborts the stream, stops streaming, shows an error toast, invalidates the messages key                                                                                                                                                                                                                                              |

Non-OK responses: HTTP 409 shows a "Duplicate request" toast (server-side `request_id` dedup); other statuses show `Connection failed ({status})`. Stream aborts (`AbortError`) are swallowed.

## Optimistic Editing (editQueue)

The `editQueue` module (`lib/editQueue.ts`) tracks `SaveStatus` in the store and works like this:

1. **Queue**: `queueEdit(op, inverseOp?)` pushes an operation tagged with the current `activeSessionId` into an in-memory array and sets `saveStatus` to `"queued"`. An optional `inverseOp` is recorded for undo.
2. **Debounce**: a 2-second timer is reset on every push. When it fires, `flushEdits()` sends `PATCH /api/sessions/{id}/document` with `{ operations: [...], doc_type }` and sets `saveStatus` to `"saving"`.
3. **Immediate cache update**: before queueing, components call `queryClient.setQueryData()` to mutate a `structuredClone` of the content and set it back into the `["sessions", id, "document", docType]` key (optimistic UI).
4. **Result**: on success `saveStatus` becomes `"saved"` then returns to `"idle"` after 3s; on failure `"error"` and the ops are re-queued. Ops for other sessions are kept aside and flushed separately.

Undo/redo: ops and their inverses are stacked per session (history cap 50, `MAX_HISTORY`). `undo()` sends the inverse ops, `redo()` replays the forward ops; `clearHistory()` runs on session switch; `retrySave()` flushes immediately. The canvas binds Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z.

Operations use a flat schema keyed by section label + entry/bullet indices:

| Operation           | Fields                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `update_field`      | `section_label, entry_index, field, value`                                                                                 |
| `update_bullet`     | `section_label, entry_index, bullet_index, text, spans`                                                                    |
| `delete_bullet`     | `section_label, entry_index, bullet_index`                                                                                 |
| `add_bullet`        | `section_label, entry_index, after_index, text, spans`                                                                     |
| `reorder_bullets`   | `section_label, entry_index, order` (array of new indices)                                                                 |
| `update_entry_urls` | `section_label, entry_index, urls`                                                                                         |
| `move_section`      | `from_index, to_index`                                                                                                     |
| `move_entry`        | `section_label, from_index, to_index`                                                                                      |
| `move_skill_row`    | `section_label, from_index, to_index`                                                                                      |
| `add_entry`         | `section_label, after_index, title`                                                                                        |
| `add_section`       | `label, after_index`                                                                                                       |
| `add_skill_row`     | `section_label, after_index, category, items`                                                                              |
| `delete_entry`      | `section_label, entry_index`                                                                                               |
| `delete_section`    | `section_label`                                                                                                            |
| `set_content`       | `content` (full `ResumeContent`); **frontend-only, no such backend op** — sent by "Reject all" and rejected by the backend |

Structural inserts are inconsistent: the canvas bottom-insert menu (`add_section`, `add_entry`, `add_skill_row`) sends via `apiRequest` directly and invalidates the document query, while `SectionRenderer`'s inline `add_skill_row` goes through `queueEdit` like other edits.

## Proposal Flow

```
1. User sends chat message (sendMessage)
       │
2. SSE "proposal" event fires (edit mode)
       │
3. Store: snapshot=<cached content>, viewMode="changes",
   pendingProposal={ message, operations, patch_summary, explanation, reasoning }
       │
4. DocumentCanvas computes field diffs CLIENT-SIDE:
   computeFieldDiffs(master.content_json, doc.content) → Map<string, DiffChange>
       │
5. DiffProvider + DiffOverlay render the changes; EnhancedProposal
   renders explanation / reasoning / summary with accept / decline / reply
```

**Field diffs are computed client-side, not received from the server.** `computeFieldDiffs(masterContent, content)` in `lib/fieldDiff.ts` walks basics fields, sections, entries, bullets, and skill rows keyed by id and returns a `Map<string, DiffChange>` where `DiffChange` is `{ kind: "added" | "removed" | "modified", old?, new? }`. Keys look like `basics:name`, `s:{sectionId}`, `s:{sectionId}:e:{entryId}:f:{field}`, `s:{sectionId}:e:{entryId}:b:{bulletId}`, `s:{sectionId}:sr:{skillRowId}`. `DocumentCanvas` memoizes it only while `viewMode === "changes"` and feeds it to `DiffProvider`/`DiffOverlay` (with a change count). In changes mode editing and drag-reorder are disabled. `snapshot` (captured at proposal time) is the pre-proposal content used for revert.

**Accept (EnhancedProposal)**: `POST /api/sessions/{id}/proposal/accept` with body = `pendingProposal.operations`. On success: clear proposal + snapshot, `viewMode` → `"final"`, invalidate `["sessions"]`, the document key, and the messages key.

**Decline (EnhancedProposal)**: `POST /api/sessions/{id}/proposal/decline`. On success: clear proposal, invalidate the messages key. Document content is unchanged.

**Reply to refine**: re-sends the message with `proposal_context` = previous proposal message + user feedback. Limited to 5 refinements, after which only Accept/Decline remain.

**Canvas diff bar (DiffOverlay)**: "Accept all" only clears `snapshot` (no request — the diff view just closes). "Reject all" sends `PATCH /api/sessions/{id}/document` with `{ operations: [{ op: "set_content", content: snapshot }] }` to restore the pre-proposal content, then invalidates the document key. `set_content` is not a defined backend op, so this request fails (HTTP 500) and the revert never happens — the flow is broken.

## API Client (apiRequest)

All network calls go through `apiRequest(method, path, body?, opts?)` in `lib/api.ts`. It:

1. Lazily bootstraps a CSRF token via `GET /api/health`, reading it from the `X-CSRF-Token` response header. The token and any in-flight bootstrap promise are cached module-level.
2. Attaches `X-CSRF-Token` to every request; sets `Content-Type: application/json` unless the body is `FormData`; always uses `credentials: "include"`.
3. On 401: with `opts.noAuthRedirect` it throws `"Not authenticated"`; otherwise it calls `POST /api/auth/refresh` (concurrent refreshes share a single promise), then retries the request once. If the refresh fails, it redirects `window.location` to `/login`.
4. Refreshes the cached CSRF token from any `X-CSRF-Token` response header on every response.
5. On non-2xx, parses the error from `detail` (a string or an array of messages joined with `; `).
6. Returns `undefined` for 204, a Blob when `opts.rawResponse` is set, and parsed JSON otherwise.

`getApiBaseUrl()` (`lib/env.ts`) returns `NEXT_PUBLIC_API_BASE_URL` (required, throws if unset) and prefixes every URL, including the health/refresh calls.

## next.config.js

Rewrites `GET/POST /api/auth/:path*` to `${INTERNAL_API_URL || NEXT_PUBLIC_API_BASE_URL}/api/auth/:path*` so same-origin `/api/auth/*` requests (e.g. refresh) reach the backend. All other API traffic uses the absolute base URL from `getApiBaseUrl()`.
