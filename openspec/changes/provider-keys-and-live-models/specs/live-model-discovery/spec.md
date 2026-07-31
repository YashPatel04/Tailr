## ADDED Requirements

### Requirement: Fetch available models from provider API
The system SHALL call each provider's native list-models API to retrieve available models at runtime. The system SHALL support OpenAI-compatible (GET {base_url}/v1/models), Anthropic (GET https://api.anthropic.com/v1/models), and Ollama (GET {base_url}/api/tags) endpoints.

#### Scenario: Fetch models from OpenAI provider
- **WHEN** a user requests GET /api/providers/{id}/models for an OpenAI provider
- **THEN** the system calls GET {base_url}/v1/models with Bearer auth
- **AND** filters the response to chat-capable models (excluding dall-e*, whisper*, tts*, text-embedding*, text-moderation*, ft:*)
- **AND** returns a list of { id, display_name } objects

#### Scenario: Fetch models from Anthropic provider
- **WHEN** a user requests GET /api/providers/{id}/models for an Anthropic provider
- **THEN** the system calls GET https://api.anthropic.com/v1/models with x-api-key and anthropic-version headers
- **AND** returns all models from the response (no filtering needed)

#### Scenario: Fetch models from custom provider (DeepSeek, Groq, Together)
- **WHEN** a user requests GET /api/providers/{id}/models for a custom provider
- **THEN** the system calls GET {base_url}/v1/models with Bearer auth
- **AND** returns the models from the response

#### Scenario: Fetch models from Ollama provider
- **WHEN** a user requests GET /api/providers/{id}/models for an Ollama provider
- **THEN** the system calls GET {base_url}/api/tags with no auth
- **AND** returns locally available models

### Requirement: Cache model lists in Redis
The system SHALL cache fetched model lists in Redis with a 15-minute TTL under the key pattern `models:{provider_id}`.

#### Scenario: Cache hit
- **WHEN** a model list is requested and a valid cache entry exists
- **THEN** the system returns the cached list without calling the provider API

#### Scenario: Cache miss
- **WHEN** a model list is requested and no cache entry exists
- **THEN** the system calls the provider API, caches the result with 900s TTL, and returns the list

#### Scenario: Cache invalidation on provider update
- **WHEN** a provider's API key or base_url is updated
- **THEN** the system deletes the corresponding Redis cache key

### Requirement: Handle unavailable providers
The system SHALL handle provider API failures gracefully by returning a 503 error with a descriptive message.

#### Scenario: Provider API is down
- **WHEN** a model list is requested and the provider API returns a network error or timeout
- **THEN** the system returns HTTP 503 with { error: "provider_unavailable", provider_id: "..." }

#### Scenario: Provider API key is invalid
- **WHEN** a model list is requested and the provider API returns 401
- **THEN** the system returns HTTP 503 with { error: "provider_unavailable", provider_id: "..." }

#### Scenario: Frontend displays unavailable provider
- **WHEN** the frontend receives a 503 for a provider's model list
- **THEN** the provider group in the model picker is grayed out with an "Unavailable" label
- **AND** other providers remain selectable
