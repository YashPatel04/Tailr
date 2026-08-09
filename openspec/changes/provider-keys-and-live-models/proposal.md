## Why

Currently, each LLM provider row bundles the API key, model name, and generation parameters into a single record. If a user wants to use three OpenAI models (gpt-4o, gpt-4o-mini, o3), they must create three separate provider rows with the same API key duplicated three times. Changing a key means updating every row. There is no way to discover available models from a provider — users must type model names manually. This makes multi-model usage painful and key management error-prone.

## What Changes

- **Strip `llm_providers` down to key storage only.** Remove `model`, `temperature`, `top_p`, `max_tokens`, and `is_default` columns. A provider row becomes just: name, provider_type, api_key_encrypted, base_url.
- **Add live model discovery.** New endpoint `GET /api/providers/{id}/models` calls each provider's list-models API (OpenAI, Anthropic, Ollama all support this natively), filters to chat-capable models, and caches results in Redis for 15 minutes.
- **Move generation parameters to user preferences.** Add `default_temperature`, `default_max_tokens`, `default_top_p` to the `users` table. New endpoints to read/update these preferences.
- **Track model per message, not per session.** Remove `llm_provider_id` from `sessions`. Add `llm_provider_id` and `model` to `chat_messages`. Users can switch models between any two messages.
- **Add model picker to chat UI.** Replace the static provider badge in `ChatRailHeader` with a dropdown that fetches available models from all configured providers, grouped by provider. Model changes mid-conversation render as styled divider messages in the chat stream.
- **Add model picker to session creation.** Both `SessionSetupForm` and `JDSetupForm` get a model picker instead of a provider picker.
- **Simplify provider settings.** The settings modal's provider form drops model name, temperature slider, max tokens input, and default checkbox. It becomes just: name, type, API key, base URL (conditional).
- **Handle unavailable providers.** If a provider's API key is invalid or the API is down, show it as "Unavailable" in the model picker and skip it.

## Capabilities

### New Capabilities

- `provider-key-management`: CRUD for provider API keys only (no model/params). Includes the simplified provider settings UI.
- `live-model-discovery`: Fetching available models from provider APIs at runtime. Caching in Redis. Filtering to chat-capable models. Handling unavailable providers.
- `user-preferences`: Global default generation parameters (temperature, max_tokens, top_p) stored per-user. Settings UI for managing them.
- `per-message-model-selection`: Model picker in chat header and session creation. Model tracked per message. Model-change dividers rendered in chat stream.

### Modified Capabilities

## Impact

- **Database**: Alembic migration touching 4 tables (users, llm_providers, sessions, chat_messages). Data backfill required for existing messages.
- **Backend API**: Provider endpoints simplified. New endpoints for model listing and user preferences. Chat endpoint accepts model + provider per request.
- **LLM Factory**: `get_adapter()` signature changes to accept model and params separately from provider.
- **Frontend**: Settings modal restructured. ChatRailHeader gets model picker. Session setup forms updated. Chat message list renders model-change dividers.
- **Redis**: New cache keys for model lists (`models:{provider_id}`, TTL 15 min).
