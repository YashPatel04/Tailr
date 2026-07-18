## ADDED Requirements

### Requirement: Manage multiple LLM providers
The system SHALL allow users to add, configure, test, and remove LLM providers via the Settings UI. Supported provider types out of the box SHALL include OpenAI, Anthropic, Ollama, and a generic "custom" type for arbitrary OpenAI-compatible APIs.

#### Scenario: Add an OpenAI provider
- **WHEN** a user adds an OpenAI provider with an API key, model name `gpt-4o`, and custom temperature
- **THEN** the provider is stored with the API key AES-GCM encrypted, displayed in the settings list with the key masked (last 4 chars only), and available for selection in tailoring sessions

#### Scenario: Add an Ollama provider
- **WHEN** a user adds an Ollama provider with a local base URL and model name `llama3:8b`
- **THEN** the provider is stored without an API key (Ollama is local), and is available for selection in tailoring sessions

#### Scenario: Test provider connectivity
- **WHEN** a user clicks "Test" on a configured provider
- **THEN** the system sends a minimal request to the provider's API and returns success or the specific error message

#### Scenario: Set a default provider
- **WHEN** a user marks one provider as default
- **THEN** new tailoring sessions pre-select that provider unless the user explicitly chooses another

### Requirement: Encrypt API keys at rest
The system SHALL encrypt all LLM API keys before storing them in the database using AES-GCM with the application's SECRET_KEY. Keys SHALL be decrypted only at request time when building LLM API calls. The full key SHALL NEVER be returned to the client or appear in logs.

#### Scenario: Encrypt key on save
- **WHEN** a user saves an API key
- **THEN** the key is encrypted with AES-GCM and stored as ciphertext in the database; the plaintext key is never logged

#### Scenario: Return masked key to client
- **WHEN** the frontend fetches provider configurations
- **THEN** the API response includes `api_key_last_four: "sk-…xyz1"` instead of the full key

### Requirement: Swap provider per tailoring session
The system SHALL allow the user to select which provider and model to use for each tailoring session independently. The selection SHALL be changeable mid-session before the next tailoring request.

#### Scenario: Choose provider when creating a session
- **WHEN** a user creates a new tailoring session
- **THEN** the session form includes a provider/model dropdown populated from the user's configured providers

#### Scenario: Change provider mid-session
- **WHEN** a user switches the provider for an existing session before sending the next message
- **THEN** the next LLM request uses the newly selected provider

### Requirement: Build tailoring prompts with full context
The system SHALL assemble LLM prompts that include: the document model of the current resume, the full job description text, the user's per-session notes, the user's career context from settings, the company research summary, and the authorized tailoring level. Each context component SHALL be clearly delimited in the prompt.

#### Scenario: Build a Level 1 tailoring prompt
- **WHEN** a session is configured with tailoring level 1
- **THEN** the system prompt authorizes micro-edits only (adjust words, tweak bullets, add/remove individual skills) and instructs the LLM not to reorganize sections

#### Scenario: Build a Level 2 tailoring prompt
- **WHEN** a session is configured with tailoring level 2
- **THEN** the system prompt authorizes Level 1 actions plus reordering/regrouping sections, and instructs the LLM to use the `ask` operation if missing information is needed

#### Scenario: Include career context in every prompt
- **WHEN** the user has set a career context in Settings ("5 years backend infra, targeting staff-level roles at startups")
- **THEN** every tailoring prompt for every session includes this context as standing background

### Requirement: Stream LLM responses via SSE
The system SHALL stream the LLM's response (including progress events) to the frontend via Server-Sent Events. Progress phases: `researching`, `research_done`, `thinking`, `writing`, `done`. Each phase SHALL carry structured data relevant to the phase.

#### Scenario: Emit researching events
- **WHEN** a tailoring request is received and company research is needed
- **THEN** the SSE stream emits `researching` with company name, followed by `research_progress` events per source scraped, followed by `research_done` with the summary

#### Scenario: Emit writing events with partial patches
- **WHEN** the LLM is streaming its JSON patch response
- **THEN** the SSE stream emits `writing` events with partial section completion information as they become available

#### Scenario: Emit done event with full patch
- **WHEN** the LLM response is complete and the patch has been validated
- **THEN** the SSE stream emits `done` with the validated patch, a change summary, and the new document version ID
