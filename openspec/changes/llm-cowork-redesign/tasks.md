## 1. Backend: Analyze Endpoint

- [x] 1.1 Create `POST /api/sessions/analyze` endpoint in `backend/app/api/sessions.py` that accepts `{ job_description?: string, job_description_url?: string }`
- [x] 1.2 Implement LLM-powered extraction: call the configured LLM provider to extract company_name, role_title from JD text
- [x] 1.3 Implement URL scraping fallback: if URL provided, scrape it first, then extract from scraped content
- [x] 1.4 Return `{ company_name, role_title, extracted: true }` on success or `{ extracted: false, question: "..." }` on failure
- [x] 1.5 Add input validation: at least one of job_description or job_description_url must be provided

## 2. Backend: Plan Mode System Prompt

- [x] 2.1 Create `PLAN_MODE_SYSTEM_PROMPT` in `backend/app/services/llm/prompts.py` — conversational resume advisor, explicitly forbids structured operations
- [x] 2.2 Add `mode` field to the chat request model in `backend/app/api/tailor.py`
- [x] 2.3 Modify the chat endpoint to select Plan Mode or Edit Mode prompt based on `mode` field
- [x] 2.4 When mode is "plan": skip ops parsing, skip ContentApplier, skip ContentDiffer — return plain text response as assistant message
- [x] 2.5 When mode is "plan": still fire research if not cached, include research summary in Plan Mode prompt
- [x] 2.6 Store mode in ChatMessage `metadata_json.mode` field
- [x] 2.7 Add mode-switch notification system message injection when tailoring level changes mid-chat

## 3. Backend: Enhanced Proposal Response

- [x] 3.1 Add `explanation` and `reasoning` fields to the LLM prompt output schema in `prompts.py`
- [x] 3.2 Update `_extract_content_ops()` in `tailor.py` to parse explanation and reasoning alongside operations
- [x] 3.3 Update the `proposal` SSE event to include explanation, reasoning, and operations
- [x] 3.4 Add reply-to-refine support: when user sends a follow-up message with context of a previous proposal, include the prior proposal and user feedback in the prompt
- [x] 3.5 Implement iteration cap: track proposal reply count per session, cap at 5

## 4. Frontend: JD-First Setup Form

- [x] 4.1 Create `JDSetupForm.tsx` component replacing `SessionSetupForm.tsx` — single JD input (text/URL toggle), "Analyze Job Posting" button
- [x] 4.2 Create `useAnalyzeMutation` hook calling `POST /api/sessions/analyze`
- [x] 4.3 Create `ExtractedFields.tsx` component showing company/role as editable fields with edit affordance, tailoring level selector, and "Start Session" button
- [x] 4.4 Implement two-step flow: JD input → analyze → show extracted fields → confirm → create session
- [x] 4.5 Handle extraction failure: show LLM's clarifying question, allow user to manually fill fields
- [x] 4.6 Wire "Start Session" to `POST /api/sessions` with confirmed fields, then auto-fire first chat message
- [x] 4.7 Remove `SessionSetupForm.tsx` references from `ChatRail.tsx`, replace with `JDSetupForm`

## 5. Frontend: Mode Toggle and Tailoring Bar

- [x] 5.1 Add `activeMode: "plan" | "edit"` to `sessionStore.ts`
- [x] 5.2 Create `ModeBar.tsx` component with Plan/Edit toggle and tailoring level pills (polish/refine/rewrite)
- [x] 5.3 Place ModeBar at the bottom of the chat rail, above the chat input
- [x] 5.4 Mode toggle sends `mode` field with each chat message via `useSessionSSE`
- [x] 5.5 Tailoring level pills update the session's tailoring mode and inject system notification on change
- [x] 5.6 Wire mode toggle and tailoring pills to the backend chat endpoint

## 6. Frontend: Collapsible Chat Rail

- [x] 6.1 Add `chatRailCollapsed` to `layout.ts` store with localStorage persistence
- [x] 6.2 Update `AppShell.tsx` to support collapsed chat rail at 52px, hide resize handle when collapsed
- [x] 6.3 Add collapse/expand toggle button to `ChatRailHeader.tsx`
- [x] 6.4 Show mode badge (Plan/Edit) in collapsed rail state
- [x] 6.5 Add CSS transition for smooth collapse/expand animation matching sidebar pattern
- [x] 6.6 Canvas expands to fill available space when rail is collapsed

## 7. Frontend: Expandable Research/Thinking Cards

- [x] 7.1 Create `ResearchCard.tsx` component with expandable header (icon, label, chevron) and collapsible body
- [x] 7.2 Create `ThinkingCard.tsx` component with expandable header and collapsible body
- [x] 7.3 Integrate cards into `ChatMessageList.tsx` — render based on message metadata phase
- [x] 7.4 Research card shows: key findings, source links (collapsible)
- [x] 7.5 Thinking card shows: LLM reasoning about resume fit and strategy (collapsible)
- [x] 7.6 Cards default to collapsed, click to toggle
- [x] 7.7 Replace `ProgressMessage.tsx` inline phase display with card-based display

## 8. Frontend: Enhanced Proposal Component

- [x] 8.1 Create `EnhancedProposal.tsx` replacing `ProposalMessage.tsx` — inline in chat with what/why/summary sections
- [x] 8.2 Render "What I'm proposing" section from LLM explanation field
- [x] 8.3 Render "Why these changes" section from LLM reasoning field
- [x] 8.4 Render operations summary as pills (count + description)
- [x] 8.5 Add Accept, Decline, View Diff, and Reply input actions
- [x] 8.6 Reply sends a follow-up chat message with proposal context, LLM generates revised proposal
- [x] 8.7 Show "Accepted" / "Declined" states on proposal cards after user action
- [x] 8.8 Rejected proposals remain visible in chat history

## 9. Frontend: Mode Switch Suggestions

- [x] 9.1 Parse `mode_suggestion` from LLM response in `useSessionSSE`
- [x] 9.2 Create `ModeSuggestBanner.tsx` component with "Switch" and "Stay" buttons
- [x] 9.3 Render banner inline below the LLM message that contains the suggestion
- [x] 9.4 "Switch" button updates `activeMode` in sessionStore
- [x] 9.5 "Stay" button dismisses the banner

## 10. Integration and Testing

- [x] 10.1 Test Plan Mode: verify LLM does not return ops, response stored as assistant message with mode metadata
- [x] 10.2 Test Edit Mode: verify existing proposal flow still works with enhanced what/why
- [x] 10.3 Test mode switching: verify LLM receives system notification on mode change
- [x] 10.4 Test JD-first flow: analyze endpoint returns extracted fields, session creation works
- [x] 10.5 Test collapsible rail: collapse/expand, persistence, canvas resize
- [x] 10.6 Test expandable cards: research and thinking cards expand/collapse correctly
- [x] 10.7 Test reply-to-refine: user can iterate on proposals, cap enforced at 5
- [x] 10.8 Test extraction failure: LLM returns clarifying question, user can fill manually
- [x] 10.9 Run backend lint and typecheck: `poetry run ruff check . && poetry run ruff format --check .`
- [x] 10.10 Run frontend lint and typecheck: `npm run lint && npx prettier --check .`
