## MODIFIED Requirements

### Requirement: Build tailoring prompts with typed-JSON document contract
The system SHALL assemble LLM prompts that include: a typed-JSON view of the current resume's Region tree (sections → entries → fields with `text`/`spans`/`layout`, bullets with `text`/`spans`, skill rows with `category`/`items`), the full job description text, the user's per-session notes, the user's career context from settings, the company research summary, and the authorized tailoring mode. The LLM NEVER receives raw `.tex` source. Spans in the typed-JSON contract SHALL use the shape `{"range":[start,end],"formats":[...]}` (offsets into the field's or bullet's `text`).

#### Scenario: Build a Polish-mode tailoring prompt
- **WHEN** a session is configured with Polish mode
- **THEN** the system prompt authorizes micro-edits only (ReplaceText ops against existing bullets/fields), instructs the LLM NOT to use MoveSection/InsertSection/DeleteSection, and includes the typed-JSON resume contract with explicit spans and field roles

#### Scenario: Build a Refine-mode tailoring prompt
- **WHEN** a session is configured with Refine mode
- **THEN** the system prompt authorizes Polish-level actions plus MoveEntry/MoveBullet/InsertBullet/MoveField, and instructs the LLM to use `Ask` if missing information is needed

#### Scenario: Build a Rewrite-mode tailoring prompt
- **WHEN** a session is configured with Rewrite mode
- **THEN** the system prompt authorizes the full op catalog including InsertSection/DeleteSection/InsertEntry/MoveSection, instructs the LLM to restructure aggressively while preserving factual content, and includes the typed-JSON resume contract

#### Scenario: Include career context in every prompt (unchanged)
- **WHEN** the user has set a career context in Settings
- **THEN** every tailoring prompt for every session includes this context as standing background

#### Scenario: Document the op contract to the LLM
- **WHEN** a tailoring prompt is assembled
- **THEN** the prompt documents every available typed op with its request shape and constraints (e.g. `ReplaceText` requires `target`, `text`, `spans`; spans must be offsets into `text`), so the LLM produces valid typed ops rather than raw LaTeX

### Requirement: Stream LLM responses via SSE with typed-op payloads
The system SHALL stream the LLM's response (including progress events) to the frontend via Server-Sent Events. Progress phases: `researching`, `research_done`, `thinking`, `writing`, `done`. The `writing` phase SHALL emit partial typed-op JSON as it is parsed from the LLM stream, so the frontend can surface per-section progress ("writing bullets for EXPERIENCE…") and start optimistic diffs before the full patch arrives. The `done` phase SHALL emit the validated patch (typed ops), the new document version ID, and a `DiffChangeSet`.

#### Scenario: Emit researching events (unchanged)
- **WHEN** a tailoring request is received and company research is needed
- **THEN** the SSE stream emits `researching` with company name, optional `research_progress` events per source scraped, and `research_done` with the summary

#### Scenario: Emit writing events with partial typed ops
- **WHEN** the LLM is streaming its typed-op JSON array response
- **THEN** the SSE stream emits `writing` events carrying the partial ops parsed so far (e.g. `{ops:[{op:"replace_text",target:"bul-2",…}]}`), enabling per-section progress hints

#### Scenario: Emit done event with full validated patch
- **WHEN** the LLM response is complete and the patch has been validated against the typed op catalog
- **THEN** the SSE stream emits `done` with the typed ops, the new `document_id` and `version`, and a `DiffChangeSet` describing the transition; a `Patch` row with `source="llm"` is recorded

### Requirement: Retry on invalid typed-op response
The system SHALL validate the LLM's typed-op response against the op catalog. If validation fails (unknown op, missing required field, invalid id reference, oversized text), the system SHALL send a second LLM request containing the validation errors and the offending response, asking the LLM to fix and return valid typed ops. Retries SHALL be limited to one; on second failure the system SHALL emit an `error` SSE event with the raw response and validation errors so the user can inspect.

#### Scenario: Retry after malformed response
- **WHEN** the LLM returns a JSON array containing an op `"replace_textt"` (typo)
- **THEN** the chat endpoint sends a retry request citing "Unknown op 'replace_textt'", and if the second response is valid, applies the patch

#### Scenario: Surface raw response after retry failure
- **WHEN** the LLM returns a malformed response AND the retry also fails validation
- **THEN** the endpoint emits `{"event":"error","data":{"message":"Patch retry failed: <reasons>","raw_response":<raw>}}` and does NOT mutate the document

### Requirement: OpenAI new-model compatibility (preserved)
The system SHALL continue detecting newer OpenAI model families (model id starts with `o`, or contains `gpt-4.1`/`gpt-4.5`/`gpt-5`/`gpt-5-mini`) and sending `max_completion_tokens` instead of `max_tokens`. For these models the adapter SHALL NOT send `temperature` or `top_p` (non-default values are rejected). Error handling for HTTP failures, API errors, and empty responses SHALL continue producing meaningful messages.

#### Scenario: Call gpt-5-mini with correct parameters
- **WHEN** the active LLM provider's model is `gpt-5-mini`
- **THEN** the OpenAI adapter sends `max_completion_tokens` and omits `temperature`/`top_p` from the request body