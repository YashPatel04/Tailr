## Context

The resume builder's LLM cowork feature is a proposal-based tailoring system: the user creates a session with company/role/JD, the LLM researches the company and generates structured content operations, and the user accepts or declines. This works for the edit flow but doesn't support the research/advice phase that users naturally want before committing to resume changes.

**Current architecture:**
- `POST /api/sessions` creates a session with 6 required fields (company, role, JD, mode, provider, notes)
- `POST /api/sessions/{id}/chat` is the SSE endpoint that runs: research → prompt assembly → LLM call → ops parsing → diff → proposal event
- `SessionSetupForm.tsx` is the frontend form that auto-fires the first chat message on creation
- `ProgressMessage.tsx` shows phase indicators (researching/thinking/writing) as simple inline messages
- `ProposalMessage.tsx` renders accept/decline buttons inline in chat
- System prompt in `prompts.py` always generates structured operations — no conversational mode exists

**Key constraints:**
- Backend uses SQLAlchemy async with asyncpg, FastAPI, SSE for streaming
- Frontend uses Next.js 15 App Router, Zustand for state, React Query for data
- Chat rail is always visible (280-520px), not collapsible
- Tailoring mode (polish/refine/rewrite) is set once at session creation and stored on the session model

## Goals / Non-Goals

**Goals:**
- Let users research and ask questions before committing to resume edits (Plan Mode)
- Reduce setup friction from 6 fields to 1 primary input (JD)
- Make the chat rail collapsible to give canvas full attention
- Show research and thinking phases as expandable, informative cards
- Enhance proposals with structured what/why explanations and reply-to-refine
- Allow mode and tailoring level switching mid-chat

**Non-Goals:**
- Skills system (deferred to future change)
- Separate LLM provider per mode (same provider for both modes)
- Streaming LLM responses in Plan Mode (non-streaming is acceptable for v1)
- Real-time collaborative editing (single-user sessions)
- Mobile-responsive chat rail (desktop-first)

## Decisions

### D1: Plan Mode as a separate system prompt, not a separate endpoint

**Decision:** Reuse the existing `POST /api/sessions/{id}/chat` endpoint for both modes. Add a `mode` field to the request body. The backend selects the appropriate system prompt based on mode.

**Rationale:** A separate endpoint would duplicate the SSE streaming infrastructure, research caching, and message persistence logic. Mode is a property of the conversation turn, not the session — the same session supports both modes.

**Alternatives considered:**
- Separate `/api/sessions/{id}/plan` endpoint — rejected: duplicates 80% of the chat endpoint code
- Mode stored on session model — rejected: prevents mid-chat switching without a separate endpoint

### D2: LLM extraction via a dedicated "analyze" endpoint

**Decision:** New `POST /api/sessions/analyze` endpoint that accepts JD text or URL, calls the LLM to extract company/role/title, and returns structured JSON. Session creation remains a separate step after user confirms extracted fields.

**Rationale:** Separating analysis from creation gives the user a chance to review and correct extracted fields before committing. The analyze endpoint is lightweight (no session, no research, no document copying) and can be called repeatedly if the user edits the JD.

**Alternatives considered:**
- Extract on session creation — rejected: user can't review/correct before committing
- Frontend-only extraction (regex) — rejected: unreliable for varied JD formats

### D3: Chat rail collapse reuses sidebar pattern

**Decision:** Mirror the existing sidebar collapse implementation: CSS `transition-[width]` with `w-[52px]` collapsed state, toggle button, localStorage persistence. Add `chatRailCollapsed` to the `layout` store.

**Rationale:** Consistent interaction pattern. The sidebar collapse is already proven and the user knows how it works. The resize handle disappears when collapsed (canvas gets full width).

**Alternatives considered:**
- Floating chat overlay (Notion-style) — rejected: breaks the three-column layout model
- Chat as a drawer that slides over canvas — rejected: loses the side-by-side view

### D4: Expandable research/thinking cards as chat messages

**Decision:** Research and thinking phases render as special message types in `ChatMessageList`, not as separate UI components. Each has a collapsible header (icon + label + chevron) and a body (research summary or thinking text). Collapsed by default.

**Rationale:** Keeping them in the chat stream maintains chronological context. The user sees "Research → Think → Proposal" as a natural sequence. Making them expandable avoids cluttering the chat with long research summaries.

**Alternatives considered:**
- Separate "Research" panel outside chat — rejected: breaks the conversational flow
- Always-expanded — rejected: too much vertical space for repeated research blocks

### D5: Enhanced proposals as structured chat messages

**Decision:** Replace `ProposalMessage.tsx` with a new component that renders inside the chat message list (not as a separate overlay). The LLM response includes `explanation` (what), `reasoning` (why), and `operations` (ops). The component shows all three plus accept/decline/reply actions. Reply sends a new chat message with the user's feedback, LLM generates revised ops.

**Rationale:** Claude-style inline proposals keep the user in the conversation flow. The reply-to-refine loop avoids the "decline → dead end" pattern. Storing rejected proposals in history gives the user a record of what was tried.

**Alternatives considered:**
- Modal overlay — rejected: breaks flow, user can't see canvas behind it
- Separate "Proposal" tab — rejected: adds navigation complexity

### D6: Mode state in sessionStore, not URL

**Decision:** Store `activeMode: "plan" | "edit"` in the Zustand `sessionStore`. Mode switches are local UI state, not persisted to the backend session model. The mode is sent with each chat request.

**Rationale:** Mode is a conversation-level concern, not a session-level one. The user might switch modes multiple times in a single session. Persisting it on the session would require a PATCH request on every toggle. Keeping it local makes switching instant.

**Alternatives considered:**
- Persist mode on session model — rejected: adds latency to mode switches, unnecessary persistence
- URL query param — rejected: breaks when navigating between sessions

### D7: Tailoring level notification via system message

**Decision:** When the user changes tailoring level mid-chat, inject a system message into the chat stream: "Mode changed from Polish to Rewrite. You may now:" followed by the new mode's behavioral instructions. The LLM acknowledges and adjusts.

**Rationale:** This is the simplest approach — the LLM already processes system messages. The notification gives the LLM explicit context about the change. No need for a separate API endpoint or prompt template.

**Alternatives considered:**
- Restart the conversation with a new system prompt — rejected: loses context
- Silent mode change (no notification) — rejected: LLM might not adjust behavior

## Risks / Trade-offs

**[Risk] Plan Mode LLM might still generate ops** → Mitigation: System prompt explicitly forbids structured operations in Plan Mode. Backend validation rejects any ops returned in Plan Mode and falls back to plain text response.

**[Risk] LLM extraction accuracy varies by JD format** → Mitigation: Extraction endpoint returns structured JSON with confidence indicators. If extraction fails or is ambiguous, the endpoint returns a clarifying question. Frontend shows extracted fields as editable — user can always correct.

**[Risk] Chat rail collapse loses mode/tailoring state visibility** → Mitigation: Mode badge remains visible in the collapsed rail header. Mode bar reappears when rail expands.

**[Risk] Reply-to-refine loop could iterate indefinitely** → Mitigation: Cap at 5 iterations per proposal. After 5, the LLM suggests accepting the current state or starting fresh.

**[Risk] Research always firing adds latency to Plan Mode sessions** → Mitigation: Research is cached on the session (`research_summary_json`). Second and subsequent messages in the same session skip research. First message in either mode pays the research cost.

## Migration Plan

1. **Backend-first**: Add `mode` field to chat endpoint, add Plan Mode system prompt, add `/api/sessions/analyze` endpoint. Existing Edit Mode behavior unchanged.
2. **Frontend**: Replace setup form, add mode toggle, add collapsible rail, update proposal component. Feature-flag the new UI behind a `llm-cowork-redesign` flag initially.
3. **Rollback**: Remove feature flag to revert to old UI. Backend changes are additive and backward-compatible.

## Open Questions

- Should Plan Mode responses be stored as a different `ChatMessage.role` (e.g., "assistant-plan") or use the same "assistant" role with metadata? → Recommendation: same role with `metadata_json.mode` field.
- Should the "Analyze" endpoint reuse the same LLM provider as the session, or use a faster/cheaper model? → Recommendation: use the session's configured provider for consistency.
- Should rejected proposals have a "Reopen" action? → Recommendation: no, the user can just start a new tailoring request.
