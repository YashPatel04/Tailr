## Context

The current `llm_providers` table stores provider_type, api_key, model name, temperature, top_p, max_tokens, and is_default in a single row. This means one row = one (key + model + params) bundle. Users who want multiple models from the same provider must duplicate the API key across multiple rows. There is no way to discover available models — users type model names manually. The chat UI shows a static provider badge with no model switching.

The system uses PostgreSQL 16, Redis 7, FastAPI with SQLAlchemy async (asyncpg), and Next.js 15 (App Router) with React 19. AES-256-GCM encryption is used for API keys via `backend/app/utils/crypto.py`.

## Goals / Non-Goals

**Goals:**

- Store API keys once per provider, not per model
- Discover available models at runtime from provider APIs
- Let users switch models between any chat message
- Store generation parameters (temperature, max_tokens, top_p) as global user preferences
- Show model-change indicators as styled dividers in the chat stream

**Non-Goals:**

- Per-message parameter overrides (temperature stays global for now)
- Auto-detection of provider type from API key
- Model usage analytics or cost tracking
- Caching model lists beyond Redis TTL (no DB persistence of model metadata)

## Decisions

### D1: Strip `llm_providers` to key-only storage

Remove `model`, `temperature`, `top_p`, `max_tokens`, `is_default` from the table. A provider becomes just a named credential: name + type + encrypted key + optional base_url.

**Why not keep model as optional?** It creates ambiguity — if model is stored, which takes precedence, the stored value or the user's live selection? Clean separation is better.

### D2: Live model discovery via provider APIs

Add `list_models()` method to each adapter. New endpoint `GET /api/providers/{id}/models` calls the provider's native list-models API and returns results. Cache in Redis with 15-minute TTL.

Provider-specific approach:

- **OpenAI / Custom (DeepSeek, Groq, Together)**: `GET {base_url}/v1/models` with Bearer auth. Client-side filter to exclude non-chat models (dall-e*, whisper*, tts*, text-embedding*, ft:*).
- **Anthropic**: `GET https://api.anthropic.com/v1/models` with x-api-key + anthropic-version headers. No filtering needed — all returned models are chat-capable.
- **Ollama**: `GET {base_url}/api/tags` with no auth. Returns locally pulled models. No filtering needed.

**Why not hardcode model lists?** Every provider has a live listing API. Hardcoding goes stale and loses user-specific fine-tuned models. The 15-min cache prevents API spam while staying fresh.

**Why not persist model metadata in DB?** Extra complexity for little gain. Model lists change rarely during a session. Redis TTL is sufficient.

### D3: Generation parameters as global user preferences

Add `default_temperature` (FLOAT, 0.7), `default_max_tokens` (INT, 4096), `default_top_p` (FLOAT, 1.0) to the `users` table. New `GET/PUT /api/user/preferences` endpoints.

**Why global instead of per-session?** Users rarely change these between sessions. Per-session storage adds UI complexity for a feature most users never touch. Global prefs with a settings panel is simpler and covers 95% of use cases.

**Why not per-message?** Too granular. If users need per-message overrides later, that's a separate feature that can layer on top.

### D4: Model tracked per message, not per session

Remove `llm_provider_id` from `sessions`. Add `llm_provider_id` (UUID FK) and `model` (VARCHAR) to `chat_messages`.

**Why per-message?** Users can switch models mid-conversation (e.g., start with gpt-4o, switch to claude for a specific task). Each message records which model generated it.

**Why store both provider_id and model?** Same model name could come from different providers if the user has multiple keys of the same type. Storing both ensures reproducibility.

### D5: Model-change dividers in chat stream

When the user changes the model and sends a message, the frontend inserts a styled divider element into the chat stream between the previous message and the new one. The divider is rendered client-side based on comparing the current message's model with the previous message's model. No extra DB rows needed — the divider is derived from the message metadata.

**Why not store dividers as messages?** They're not content — they're presentation. Deriving them from message metadata keeps the DB clean and avoids special message types.

**Design:**

```
┌─────────────────────────────────────────────┐
│  ─── Model changed to claude-sonnet-4 ───   │
├─────────────────────────────────────────────┤
│  Assistant response using claude-sonnet-4... │
└─────────────────────────────────────────────┘
```

### D6: Model picker groups by provider

The model picker dropdown fetches models from all configured providers in parallel, then renders them grouped:

```
▾ gpt-4o
├── OpenAI (sk-...7a2f)
│   ├── gpt-4o          ◀── selected
│   ├── gpt-4o-mini
│   └── o3
├── Anthropic (ak-...b3e1)
│   ├── claude-sonnet-4
│   └── claude-haiku-4
└── DeepSeek (ds-...9c4d)
    ├── deepseek-chat
    └── deepseek-reasoner
```

Selection sends `{ llm_provider_id, model }` to the backend.

### D7: Redis cache invalidation

Cache key: `models:{provider_id}`. TTL: 900s (15 min).

Invalidation triggers:

- Provider API key updated → delete cache key
- Provider deleted → delete cache key (key is auto-deleted with provider)
- TTL expiry → stale data served for max 15 min, acceptable

**Why not invalidate on every request?** The whole point is to avoid hitting provider APIs on every model picker open. 15-min staleness is fine — model lists change rarely.

### D8: Unavailable provider handling

When `GET /api/providers/{id}/models` fails (invalid key, network error, provider down):

- Return 503 with `{ "error": "provider_unavailable", "provider_id": "..." }`
- Frontend shows the provider group as grayed-out with "Unavailable" badge
- Other providers continue to work normally
- No retry logic — user must fix the key or wait

## Risks / Trade-offs

**[Risk] OpenAI model list is noisy** → Client-side filter by ID prefix. Accept that we may miss edge-case models or include some non-chat models. Users can always type a model name manually as fallback (future enhancement).

**[Risk] Migration complexity for existing data** → 5-step Alembic migration: add user prefs columns, add message columns, backfill messages from session provider refs, drop provider columns, drop session FK. Test thoroughly on a copy of production data.

**[Risk] Users with duplicate provider rows (same key, different models)** → After migration, they'll have redundant provider rows. Not harmful — just clutter. Users can clean up in settings. Could add a merge utility later if needed.

**[Risk] Anthropic pagination** → The Anthropic models API uses cursor-based pagination. First implementation fetches one page (up to 1000 models). If Anthropic exceeds this in the future, we'd need to paginate. Acceptable for now — they have <20 models.

**[Trade-off] No per-message parameter overrides** → Simpler implementation, less flexibility. Can be layered on later by accepting optional `temperature`/`max_tokens` in the chat request body.

## Migration Plan

1. Run Alembic migration (add columns, backfill, drop columns)
2. Deploy backend with new endpoints + updated factory
3. Deploy frontend with new settings UI + model picker
4. No feature flags needed — the migration is atomic

**Rollback**: Restore from DB backup. The migration drops columns, so rollback requires restoring the old schema and data. Take a DB snapshot before migration.

## Open Questions

- Should there be a "test" button per provider in the new simplified settings? The current test endpoint sends "Hello" to the provider. With models being live-discovered, testing could instead just call list_models and report success/failure. → Keep the test button, repurpose it to validate the key by calling list_models instead of chat.
