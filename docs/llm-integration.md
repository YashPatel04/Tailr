# LLM Integration — How AI Edits Your Resume

## Supported Providers

The app supports three LLM providers. Each has an adapter class behind a common interface (`LLMAdapter` in `backend/app/services/llm/adapters/base.py:17`):

| Provider | Adapter | API Endpoint |
|----------|---------|-------------|
| OpenAI | `OpenAIAdapter` | `{base_url}/v1/chat/completions` |
| Anthropic | `AnthropicAdapter` | `api.anthropic.com/v1/messages` |
| Ollama | `OllamaAdapter` | `{base_url}/api/chat` |

A **custom** provider type also routes through `OpenAIAdapter`, letting any OpenAI-compatible API (e.g. local llamafile, self-hosted vLLM) work as a drop-in.

The factory in `backend/app/services/llm/factory.py:9` maps the provider type string from the database to the correct adapter. API keys are decrypted at runtime from the encrypted database field.

## Chat Flow (tailor.py)

When a user sends a message in a session, the backend starts an **SSE (Server-Sent Events) stream** that sends structured events as progress unfolds. The full flow lives in `backend/app/api/tailor.py:53` (`chat_stream`).

### Step-by-step

1. **`researching`** — The company name from the session is sent to `research_company()` (`backend/app/services/research/summarizer.py:11`), which scrapes the company's careers page, engineering blog, and relevant subreddits in parallel. A keyword-matching pass extracts values, hiring signals, and tone guidance. The result is cached in `session.research_summary_json` so subsequent messages skip the scrape.

2. **`research_done`** — Emitted once research completes (or immediately if cached). Carries the research summary.

3. **`thinking`** — A brief status event while the prompt is being assembled.

4. **`writing`** — The LLM is called with `stream=False` (we collect the full response before emitting results).

5. **LLM response parsing** — The raw text is cleaned (code fences stripped), then parsed as JSON with `_extract_content_ops()` (`tailor.py:38`). The result must be a JSON array of operations or an object with an `"operations"` key.

6. **Content operations applied** — The operations list is converted to typed `ContentOp` objects via `ops_from_list()`, then applied to a copy of the resume via `ContentApplier.apply()`. A diff between old and new content is computed with `ContentDiffer.diff()`.

7. **Error recovery** — If applying operations raises an exception, the LLM is called once more with a fix-up message containing the specific error. If that also fails, an `error` SSE event is emitted.

8. **`proposal`** — The operations and diff are stored on the session (`pending_operations_json`, `pending_diff_json`) and emitted as a single SSE event.

9. **User accepts or declines** — The frontend renders the proposal for review. On **Accept**, `POST /{session_id}/proposal/accept` applies operations for real, creates a new `SessionDocument` version, and records a `Patch` row. On **Decline**, `POST /{session_id}/proposal/decline` just records a chat message noting the decline.

## The Prompt (build_tailor_prompt_v3)

Defined in `backend/app/services/llm/prompts.py:110`.

The function assembles two messages: a large system message and a short user message.

### System message contents

- **Career context** (optional) — from `current_user.career_context`. If set, inserted as a `CAREER CONTEXT:` block at the top.
- **Research summary** — the JSON from company research, serialized with `indent=2`.
- **Job description** — from `session.job_description`.
- **Tailoring mode** — one of `polish`, `refine`, or `rewrite`, from `session.tailoring_mode`.
- **Mode instruction** — a natural-language paragraph describing expectations for that mode (see `MODE_INSTRUCTIONS` dict at `prompts.py:9`).
- **Resume content** — the full `ResumeContent` model serialized as pretty-printed JSON (not raw LaTeX).

### Mode instructions

| Mode | Behaviour | Op count |
|------|-----------|----------|
| `polish` | Surgical micro-edits. Don't reorder. Change only what needs changing. | 3–7 |
| `refine` | May reorder and reorganize. Focus on impact. | Flexible |
| `rewrite` | Aggressive restructure while preserving facts. | Flexible |

### Operation types

The system prompt defines 15 operation types, all using path-based addressing (section labels + 0-based integer indices):

- **Bullet ops**: `update_bullet`, `add_bullet`, `delete_bullet`, `reorder_bullets`
- **Entry ops**: `add_entry`, `delete_entry`, `move_entry`, `update_field`
- **Section ops**: `add_section`, `delete_section`, `move_section`
- **Skills ops**: `update_skill_row`
- **Basics ops**: `update_basics_field` (targets `name`, `email`, `phone`, `location`, `summary`)
- **Meta**: `ask` (for requesting missing information from the user)

### Surgical editing rules

The prompt includes defensive rules to prevent the LLM from returning a full rewrite disguised as operations:
- Maximum **15 operations** per response.
- Only emit operations that make actual, meaningful changes.
- Never re-emit a bullet with identical text.
- Do not return the entire document as operations.
- The prompt includes explicit examples of **bad** (returning 40+ unchanged bullets) vs. **good** (making 3–15 targeted changes) response patterns.

### User message

The user message is `session.notes` (if set) or the default `"Tailor this resume for the job description."`.

## Proposal System

### How proposals flow

1. The backend computes operations + diff and stores them on the session row (`pending_operations_json`, `pending_diff_json`).
2. A `proposal` SSE event is emitted with `operations`, `diff`, and a human-readable `message`.
3. The frontend stores the proposal in a session store and renders a `ProposalMessage` component showing the diff in a reviewable canvas.

### Accepting

`POST /api/sessions/{session_id}/proposal/accept` with the operations list in the request body.

The endpoint (`tailor.py:193`):
- Loads the latest `SessionDocument` for the session.
- Applies the operations to produce new `ResumeContent`.
- Renders new `.tex` from the updated content.
- Creates a new `SessionDocument` with an incremented version number, linked to the previous doc via `parent_doc_id`.
- Creates a `Patch` record linking source and target documents.
- Creates a `ChatMessage` with role `assistant` recording the patch ID.

### Declining

`POST /api/sessions/{session_id}/proposal/decline` (no body needed).

Records a simple chat message (`"Proposal declined. How can I help?"`) and returns. The pending operations on the session remain untouched (they are overwritten on the next chat message anyway).
