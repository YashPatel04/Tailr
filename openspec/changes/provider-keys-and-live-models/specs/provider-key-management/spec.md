## ADDED Requirements

### Requirement: Provider stores only key credentials
The system SHALL store provider records with only: name, provider_type, api_key_encrypted, base_url. The system SHALL NOT store model name, temperature, top_p, max_tokens, or is_default on the provider record.

#### Scenario: Create a new provider
- **WHEN** a user submits a provider with name "My OpenAI Key", provider_type "openai", and an API key
- **THEN** the system creates a provider record with only name, provider_type, api_key_encrypted, and timestamps
- **AND** no model or parameter fields are stored

#### Scenario: Edit an existing provider
- **WHEN** a user updates a provider's name or API key
- **THEN** only the name, api_key_encrypted, and updated_at are modified
- **AND** no model or parameter fields exist to modify

### Requirement: Provider CRUD endpoints
The system SHALL provide standard CRUD endpoints for provider key management: GET /api/providers (list), POST /api/providers (create), GET /api/providers/{id} (read), PUT /api/providers/{id} (update), DELETE /api/providers/{id} (delete).

#### Scenario: List providers
- **WHEN** a user requests GET /api/providers
- **THEN** the system returns all providers for the authenticated user with id, name, provider_type, api_key_last_four, base_url, created_at, updated_at
- **AND** no model or parameter fields are included in the response

#### Scenario: Delete provider
- **WHEN** a user deletes a provider
- **THEN** the provider and its cached model list are removed
- **AND** existing chat messages referencing this provider retain their llm_provider_id (nullable FK with SET NULL)

### Requirement: Provider test validates key via model listing
The system SHALL repurpose the provider test endpoint (POST /api/providers/{id}/test) to validate the API key by calling the provider's list-models API instead of sending a chat message.

#### Scenario: Test succeeds
- **WHEN** a user tests a provider with a valid API key
- **THEN** the system calls the provider's list-models API and returns success with the count of available models

#### Scenario: Test fails
- **WHEN** a user tests a provider with an invalid API key
- **THEN** the system returns an error with the failure reason (e.g., 401 Unauthorized)
