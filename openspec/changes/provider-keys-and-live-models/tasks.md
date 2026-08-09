## 1. Database Migration

- [x] 1.1 Create Alembic migration: add `default_temperature`, `default_max_tokens`, `default_top_p` columns to `users` table
- [x] 1.2 Create Alembic migration: add `llm_provider_id` (UUID FK) and `model` (VARCHAR) columns to `chat_messages` table
- [x] 1.3 Create Alembic migration: backfill existing chat_messages with provider_id and model from their session's llm_provider_id and llm_providers.model
- [x] 1.4 Create Alembic migration: drop `model`, `temperature`, `top_p`, `max_tokens`, `is_default` columns from `llm_providers` table
- [x] 1.5 Create Alembic migration: drop `llm_provider_id` column from `sessions` table

## 2. Backend Models

- [x] 2.1 Update `User` model in `models.py`: add `default_temperature`, `default_max_tokens`, `default_top_p` columns with defaults
- [x] 2.2 Update `LLMProvider` model in `models.py`: remove `model`, `temperature`, `top_p`, `max_tokens`, `is_default` columns
- [x] 2.3 Update `Session` model in `models.py`: remove `llm_provider_id` column and relationship
- [x] 2.4 Update `ChatMessage` model in `models.py`: add `llm_provider_id` (FK to llm_providers) and `model` columns

## 3. User Preferences API

- [x] 3.1 Create `GET /api/user/preferences` endpoint to return user's default_temperature, default_max_tokens, default_top_p
- [x] 3.2 Create `PUT /api/user/preferences` endpoint to update user preferences with validation (temperature 0.0-2.0, max_tokens 1-128000, top_p 0.0-1.0)

## 4. Provider API Simplification

- [x] 4.1 Update `POST /api/providers` endpoint: remove model, temperature, top_p, max_tokens, is_default from request schema
- [x] 4.2 Update `PUT /api/providers/{id}` endpoint: remove model, temperature, top_p, max_tokens, is_default from request schema
- [x] 4.3 Update `GET /api/providers` and `GET /api/providers/{id}` response schemas: remove model and parameter fields
- [x] 4.4 Update `POST /api/providers/{id}/test` to validate key by calling list-models API instead of chat

## 5. Live Model Discovery

- [x] 5.1 Add `list_models()` method to `OpenAIAdapter` — calls GET {base_url}/v1/models, filters to chat-capable models
- [x] 5.2 Add `list_models()` method to `AnthropicAdapter` — calls GET https://api.anthropic.com/v1/models with proper headers
- [x] 5.3 Add `list_models()` method to `OllamaAdapter` — calls GET {base_url}/api/tags
- [x] 5.4 Add abstract `list_models()` to `LLMAdapter` base class
- [x] 5.5 Create `GET /api/providers/{id}/models` endpoint: decrypt key, call adapter.list_models(), cache in Redis with 15-min TTL under key `models:{provider_id}`
- [x] 5.6 Add Redis cache invalidation: delete `models:{provider_id}` when provider is updated or deleted

## 6. LLM Factory Update

- [x] 6.1 Update `get_adapter()` signature to accept `model: str`, `temperature: float`, `max_tokens: int`, `top_p: float` separately from provider
- [x] 6.2 Update adapter constructors to accept model and params as separate arguments
- [x] 6.3 Update all adapter `chat()` methods to use the passed model name instead of self.model

## 7. Chat Endpoint Update

- [x] 7.1 Update `POST /api/sessions/{id}/chat` request schema: add optional `llm_provider_id` and `model` fields
- [x] 7.2 Update provider resolution: load provider by `llm_provider_id` from request body (or from last message in session as fallback)
- [x] 7.3 Update adapter instantiation: load user preferences, call `get_adapter(provider, model, temperature, max_tokens, top_p)`
- [x] 7.4 Save assistant messages with `llm_provider_id` and `model` from the request
- [x] 7.5 Update message query endpoints to include `llm_provider_id` and `model` in response

## 8. Session Endpoints Update

- [x] 8.1 Update `POST /api/sessions`: remove `llm_provider_id` from request schema
- [x] 8.2 Update all provider resolution in `sessions.py` (JD analysis, master resume upload, cover letter generation) to use user preferences + accept model in request
- [x] 8.3 Update session detail response to not include provider info (model is per-message now)

## 9. Frontend Types and Hooks

- [x] 9.1 Update `LLMProvider` TypeScript interface: remove model, temperature, top_p, max_tokens, is_default
- [x] 9.2 Create `UserPreferences` TypeScript interface: default_temperature, default_max_tokens, default_top_p
- [x] 9.3 Create `useModels(providerId)` hook: calls GET /api/providers/{id}/models, handles 503
- [x] 9.4 Create `useAllModels()` hook: fetches models from all providers in parallel
- [x] 9.5 Create `useUserPreferences()` and `useUpdatePreferences()` hooks
- [x] 9.6 Update `ChatMessage` interface to include `llm_provider_id` and `model`

## 10. Frontend Settings Modal

- [ ] 10.1 Simplify provider add/edit form: remove model, temperature, max_tokens, is_default fields
- [ ] 10.2 Add "Preferences" section to settings: temperature slider, max_tokens input, top_p input with save button
- [ ] 10.3 Update provider test button to use new list-models-based test endpoint

## 11. Frontend Model Picker

- [ ] 11.1 Create `ModelPicker` component: dropdown that displays models grouped by provider, with unavailable provider handling
- [ ] 11.2 Integrate `ModelPicker` into `ChatRailHeader`: replace static provider badge
- [ ] 11.3 Integrate `ModelPicker` into `SessionSetupForm`: replace provider dropdown
- [ ] 11.4 Integrate `ModelPicker` into `JDSetupForm`: add model selection
- [ ] 11.5 Store selected model/provider in chat state (zustand store) for next message

## 12. Chat Model-Change Dividers

- [ ] 12.1 Create `ModelChangeDivider` component: styled divider showing "─── Model changed to {model} ───"
- [ ] 12.2 Update `ChatMessageList`: compare consecutive messages' model fields, insert divider when model changes
- [ ] 12.3 Pass selected model/provider in chat message payload (llm_provider_id, model from store)

## 13. Cleanup and Testing

- [ ] 13.1 Remove dead code: old provider resolution logic that referenced session.llm_provider_id
- [ ] 13.2 Update backend tests for new provider CRUD (no model/params)
- [ ] 13.3 Add backend tests for model listing endpoint with mocked provider APIs
- [ ] 13.4 Add backend tests for user preferences endpoint
- [ ] 13.5 Add frontend tests for ModelPicker component
- [ ] 13.6 Verify end-to-end: create provider → list models → send chat with model → switch model → model divider renders
