## Why

The LLM cowork feature currently operates as a single-mode edit proposer — the user sends a prompt, the LLM generates structured operations, and the user accepts or declines. This linear flow doesn't match how users actually think about resume tailoring: they want to research first, ask questions, understand the company/role, and _then_ make edits. The current setup form also has 6 fields before any interaction starts, creating unnecessary friction. Major AI products (Notion, Claude Code, Cursor, ChatGPT Canvas) have converged on multi-mode delegation — separating thinking from doing — and users increasingly expect this pattern.

## What Changes

- **JD-first setup form**: Replace the 6-field form with a single job description input (paste text or URL). Company name, role title, and other fields are auto-extracted via LLM, then shown for user confirmation before session creation.
- **Plan Mode + Edit Mode**: Introduce two distinct LLM interaction modes. Plan Mode is conversational — the LLM researches, advises, and answers questions without proposing edits. Edit Mode is the current proposal flow with polish/refine/rewrite tailoring levels. Both modes share the same session and the LLM has full access to resume JSON in both.
- **Mode selector in chat rail**: A Plan/Edit toggle and tailoring level pills at the bottom of the chat rail. Users can switch modes at any time; the LLM receives a system notification when modes change. Tailoring levels are baked into the system prompt and persist on the session but are changeable mid-chat.
- **Collapsible chat rail**: The chat rail collapses to a 52px icon strip, matching the existing sidebar collapse pattern. Canvas gets full width when collapsed.
- **Expandable research/thinking states**: Research and thinking phases in chat history are expandable cards — collapsed by default, click to see full research summary or LLM reasoning. Always visible in the chat stream regardless of mode.
- **Enhanced inline proposals**: Proposals render inline in chat (Claude-style, not a modal) with structured "What I'm proposing" and "Why these changes" sections alongside the operations summary. Users can accept, decline, or reply to refine the proposal. Rejected proposals remain in chat history.
- **LLM mode switch suggestions**: The LLM can suggest switching between Plan and Edit modes when it detects the user's intent doesn't match the current mode (e.g., asking research questions in Edit Mode). Suggestions appear as inline banners with "Switch" and "Stay" buttons.
- **LLM extraction with fallback**: When the LLM cannot extract company/role from the JD or cannot scrape a URL, it returns a clarifying question to the user instead of failing silently.

## Capabilities

### New Capabilities

- `plan-mode`: Conversational LLM mode for research, advice, and Q&A without edit proposals. Shares session with Edit Mode. LLM has full resume JSON access. Includes mode switch suggestions.
- `jd-first-setup`: Redesigned session setup flow. Single JD input (text or URL), LLM-powered auto-extraction of company/role, confirmation step before session creation.
- `collapsible-chat-rail`: Chat rail collapse/expand with 52px collapsed state, matching sidebar pattern. Canvas resizes to fill available space.
- `expandable-chat-phases`: Research and thinking phases displayed as expandable cards in chat history. Click to expand/collapse. Shows sources for research, reasoning for thinking.
- `enhanced-proposals`: Inline proposal cards with what/why sections, operations summary, accept/decline/reply actions. Rejected proposals persist in chat history. Reply triggers revised proposal from LLM.

### Modified Capabilities

- `session-management`: Session creation flow changes — auto-extracted fields, mode selection at creation, research always fires on session start regardless of mode.
- `tailoring-modes`: Polish/refine/rewrite levels now baked into system prompt, switchable mid-chat via UI toggle with LLM system notification.

## Impact

- **Backend**: New LLM system prompts for Plan Mode (conversational, no ops). Modified session creation endpoint to accept JD-only input and return extracted fields. New mode notification in SSE stream. Proposal response needs `explanation` + `reasoning` fields alongside existing `operations`.
- **Frontend**: New setup form component replacing `SessionSetupForm`. New mode toggle and tailoring pills in chat rail. New expandable research/thinking cards. New proposal card component. Chat rail collapse logic in `AppShell` and `layout` store. Mode state in `sessionStore`.
- **LLM prompts**: Plan Mode needs a separate system prompt that forbids structured ops and encourages conversational research/advice. Edit Mode system prompt gets the tailoring level baked in with mode-switch acknowledgment.
- **No breaking API changes**: Existing session/chat/proposal endpoints are extended, not replaced. Backward compatible.
