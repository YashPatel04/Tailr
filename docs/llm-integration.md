# LLM Integration — How AI Edits Your Resume

## Supported Providers

The app supports three LLM providers plus a custom type. Each is an adapter behind a common interface (`LLMAdapter` in `backend/app/services/llm/adapters/base.py:22`), exposing `chat(messages, stream=False)` and `list_models()`:

| Provider  | Adapter            | Chat API Endpoint                       |
| --------- | ------------------ | --------------------------------------- |
| OpenAI    | `OpenAIAdapter`    | `{base_url}/v1/chat/completions`        |
| Anthropic | `AnthropicAdapter` | `https://api.anthropic.com/v1/messages` |
| Ollama    | `OllamaAdapter`    | `{base_url}/api/chat`                   |

A **custom** provider type also routes through `OpenAIAdapter` (`factory.py:41`), letting any OpenAI-compatible API (e.g. local llamafile, self-hosted vLLM) work as a drop-in.

`get_adapter()` (`backend/app/services/llm/factory.py:9`) maps the stored `provider_type` string to the adapter. API keys are decrypted at runtime from the encrypted `api_key_encrypted` DB field. Callers pass temperature/max_tokens/top_p from the user's settings; the factory defaults are `0.7` / `4096` / `1.0`.

### Provider management (`backend/app/api/providers.py`)

- CRUD at `/api/providers`; `provider_type` is validated against `^(openai|anthropic|ollama|custom)$` (`providers.py:24`). API keys are encrypted at rest via `encrypt()`.
- `POST /api/providers/{id}/test` calls `adapter.list_models()` and returns `{"status": "ok", "model_count": n}`.
- `GET /api/providers/{id}/models` lists models. Results are cached in Redis under `models:{provider_id}` for `CACHE_TTL = 900` seconds (`providers.py:19`) and invalidated on update/delete; cached hits return `"cached": true`.

## Chat Flow (`backend/app/api/tailor.py`)

`POST /api/sessions/{session_id}/chat` (`chat_stream`, `tailor.py:91`) returns a `StreamingResponse` (`text/event-stream`) that emits named SSE events.

### Request body (`ChatMessageRequest`, `tailor.py:30`)

| Field                      | Default    | Notes                                                                        |
| -------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `content`                  | —          | The user's message                                                           |
| `role`                     | `"user"`   |                                                                              |
| `doc_type`                 | `"resume"` | `"resume"` or `"cover_letter"`                                               |
| `mode`                     | `"edit"`   | `"plan"` or `"edit"`                                                         |
| `tailoring_mode`           | —          | `polish`/`refine`/`rewrite`; persisted to the session when changed           |
| `proposal_context`         | —          | Appended as an extra user message after `content`                            |
| `llm_provider_id`, `model` | —          | Model-selection override                                                     |
| `request_id`               | —          | Dedup key; a repeated ID within a 60s window returns `409 Duplicate request` |

Provider/model resolution order: request → `session.current_provider_id`/`current_model` → last assistant message's provider/model → the user's first provider. With none set, returns `422 Select a model from the dropdown before sending.`

### SSE events

| Event           | Emitted when                                                 | Payload                                                            |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `researching`   | Start of every chat turn                                     | `{"message": "Researching {company}..."}`                          |
| `research_done` | Research finished or loaded from cache                       | `{"summary": {...}}`                                               |
| `thinking`      | Prompt assembly                                              | `{"message": "Thinking..."}`                                       |
| `writing`       | LLM call begins (all branches except cover-letter plan mode) | `{"message": "Writing changes..."}` or `"Editing cover letter..."` |
| `proposal`      | LLM result ready (plan and edit mode)                        | see below                                                          |
| `done`          | Cover-letter create/edit finished                            | `{"document_id": ...}` or `{"message": "No cover letter yet"}`     |
| `error`         | Any failure (parse, apply, retry, unhandled)                 | `{"message": ...}`                                                 |

### Step-by-step

1. **Duplicate check** — `_is_duplicate()` (`tailor.py:46`) rejects a reused `request_id` within a 60-second window (in-memory, per-process; `DEDUP_WINDOW_SECONDS = 60`).
2. **`researching`** — `research_company()` (`backend/app/services/research/summarizer.py:10`) scrapes the company's careers page, engineering blog, and relevant subreddits in parallel. The result is cached in `session.research_summary_json`; later turns skip the scrape.
3. **`research_done`** — carries the research dict (fresh or cached).
4. **`thinking`** — prompt assembly.
5. **`writing`** — `adapter.chat(messages, stream=False)` is awaited; the full response is collected before anything is emitted.
6. **Mode branch** — plan and edit diverge (below).

### Edit mode (resume)

1. Messages are built by `build_tailor_prompt_v3()`, plus `content` and `proposal_context`.
2. After `writing`, the raw text is cleaned (fenced code stripped) and parsed by `_extract_content_ops()` (`tailor.py:67`). Accepted shapes: a JSON array of operations, or an object with an `operations` key. A parse failure emits `error`.
3. `ops_from_list()` converts the raw dicts to typed `ContentOp` objects; `ContentApplier.apply()` produces the new `ResumeContent`.
4. On apply failure, the LLM is called once more with an assistant/user fix-up pair containing the specific error; a second failure emits `error`.
5. `session.pending_operations_json` is set to `{"ops": ops_list, "content_ops": ops_for_storage}` (`tailor.py:479`).
6. A `proposal` event is emitted with `{message, operations, diff: null, patch_summary: "{n} changes proposed", explanation, reasoning, mode: "edit"}`. No diff is computed server-side (`diff` is always `null`); the frontend reviews the operations.

### Plan mode (resume and cover letter)

`mode: "plan"` uses `build_plan_mode_prompt()` and `PLAN_MODE_SYSTEM_PROMPT` (`prompts.py:9`), which instructs the model to give conversational, markdown-formatted advice and never return JSON operations. The response is saved as an assistant message and emitted as a `proposal` event with empty `operations`, `diff: null`, and `mode: "plan"`.

### Cover-letter branch

`doc_type: "cover_letter"`:

- If no cover-letter document exists, an assistant message is saved and only a `done` event (`"No cover letter yet"`) is emitted — the user must generate one first.
- **Plan mode** uses an inline cover-letter advisor system prompt (not `PLAN_MODE_SYSTEM_PROMPT`); the reply is emitted as a plan-mode `proposal`.
- **Edit mode** builds messages with `build_cover_letter_edit_prompt()` (`prompts.py:316`), parses the ops JSON, and applies it via `ContentApplier.apply_cover_letter()`, with the same one-shot retry on failure. A new `SessionDocument` (version +1, `parent_doc_id` set) is persisted, and a `done` event with `document_id` is emitted.

## The Prompt (`build_tailor_prompt_v3`, `prompts.py:172`)

Returns a `[{system}, {user}]` message pair.

### System message contents

- **Career context** (optional) — from `current_user.career_context`; inserted as a `CAREER CONTEXT:` block.
- **Research summary** — `session.research_summary_json`, serialized with `indent=2`.
- **Job description** — `session.job_description`.
- **Tailoring mode** — `session.tailoring_mode` (default `polish`).
- **Mode instruction** — a natural-language paragraph from `MODE_INSTRUCTIONS` (`prompts.py:51`).
- **Resume content** — the `ResumeContent` model as pretty-printed JSON (not raw LaTeX).
- **Response contract** — return only a JSON object with `explanation`, `reasoning`, and `operations`.

### Mode instructions

| Mode      | Behaviour                                                                      | Op count |
| --------- | ------------------------------------------------------------------------------ | -------- |
| `polish`  | Surgical micro-edits; do not reorder sections; change only what needs changing | 3–7      |
| `refine`  | May reorder/reorganize; focus on impact; use `ask` if info is missing          | flexible |
| `rewrite` | Aggressive restructure while preserving facts; only ops for what changed       | flexible |

### Operation types

15 operations, all path-addressed (section `label` + 0-based integer indices):

- **Bullet**: `update_bullet`, `add_bullet`, `delete_bullet`, `reorder_bullets`
- **Entry**: `add_entry`, `delete_entry`, `move_entry`, `update_field`, `update_entry_urls`
- **Section**: `add_section`, `delete_section`, `move_section`
- **Skills**: `update_skill_row`
- **Basics**: `update_basics_field` (fields `name`, `email`, `phone`, `location` — there is no basics `summary` field)
- **Meta**: `ask` (requests missing information from the user)

### Surgical editing rules

- Max **15 operations** per response; aim for 3–15 targeted changes.
- Only emit operations that make actual, meaningful changes; never re-emit a bullet with identical text.
- Never return the entire document as operations. The prompt embeds explicit examples of bad (40+ unchanged bullets) vs good (3–15 targeted changes) responses.
- Follow the user's explicit instructions, including delete requests (`delete_section`/`delete_entry`/`delete_bullet`).
- `after_index: -1` inserts at position 0; `reorder_bullets.order` uses the OLD indices.
- Bold changes are reported via `bold_added`/`bold_removed` words; index-based `spans` are the fallback.

### User message

`build_tailor_prompt_v3` sets the user message to `session.notes or "Tailor this resume for the job description."`. `chat_stream` then appends `body.content` (and `body.proposal_context` when given) as additional user messages.

## Proposal System

### Accepting

`POST /api/sessions/{session_id}/proposal/accept` (`tailor.py:514`). The request body is a raw JSON array of operations (`list[dict]`).

The endpoint:

- Loads the latest `SessionDocument` for the session (`doc_type: "resume"`); `400` if the body is empty, `404` if no document.
- Re-applies the operations with `ContentApplier.apply()` to produce new `ResumeContent`.
- Creates a new `SessionDocument` with incremented `version` and `parent_doc_id` pointing at the previous doc.
- Records a `Patch` (`source_doc_id` → `target_doc_id`, `applied=True`) and an assistant `ChatMessage` carrying `patch_id` in its metadata.
- Returns `{"document_id": ..., "version": ..., "patch_id": ..., "changes_applied": n}`.

### Declining

`POST /api/sessions/{session_id}/proposal/decline` (`tailor.py:597`) — no body. Records the assistant message `"Proposal declined. How can I help?"` and returns `{"status": "declined"}`.

## Other LLM call sites

### Job description analysis (`backend/app/api/sessions.py`)

`POST /api/sessions/analyze` (`analyze_jd`, `sessions.py:53`) parses a JD — pasted text or fetched from a URL via `fetch_jd_text` — using `EXTRACT_FIELDS_PROMPT` (`sessions.py:41`), which asks for a JSON object with `company_name` and `role_title`, setting either to `null` when undetermined. It uses the user's first provider with model `gpt-4o` and the first 5000 chars of the JD. Returns `{extracted: true, company_name, role_title, source_url, jd_text}` on success, or `{extracted: false, question}` when the URL/text can't be read or neither field was found.

### Cover letter generation (`sessions.py:659`)

`POST /api/sessions/{session_id}/generate-cover-letter` renders the master resume to `.tex`, calls `build_cover_letter_prompt()` (`prompts.py:285`), and stores the reply as a `doc_type: "cover_letter"` document (version 1). Edit-mode follow-ups go through the chat endpoint using `build_cover_letter_edit_prompt()` (`prompts.py:316`), whose ops are `update_salutation`, `update_paragraph`, `add_paragraph`, `delete_paragraph`, `reorder_paragraphs`, `update_closing` (max 6 ops).

### Company research is NOT LLM-based (`backend/app/services/research/summarizer.py`)

`research_company()` (`summarizer.py:10`) runs `scrape_careers()`, `search_engineering_blog()`, and `search_subreddits()` in parallel, each under a 5-second timeout. It then keyword-matches the combined corpus: value keywords `[mission, values, culture, principles, believe]` → `values`, signal keywords `[hiring, looking for, seeking, join our team, we're growing]` → `hiring_signals`, and returns a fixed `tone_guidance` string. No LLM is involved. Fallbacks: default values `[Professionalism, Quality, Innovation]`, default signal `[Active hiring]`, and `{"values": [], "hiring_signals": [], "tone_guidance": "No research data available."}` when the corpus is empty.

### LLM-based `.tex` import (`backend/app/services/importers/tex_llm_importer.py`)

`import_from_tex()` (`tex_llm_importer.py:67`) sends the LaTeX source against `EXTRACTION_PROMPT` (`tex_llm_importer.py:8`), which asks for a `ResumeContent` JSON object and rejects markdown code fences. On JSON/validation failure it retries with a self-correction message (assistant reply + fix-up user message), up to 2 retries (3 attempts total), then raises `ImportError`. Invoked by `POST /api/master-resume/import` (SSE events `importing` → `extracting` → `import_done` | `error`) and by `POST /api/master-resume` (which returns `{"id", "content_json", "import_status": "imported"}`).
