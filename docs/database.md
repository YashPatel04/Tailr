# Database — Schema and Models

PostgreSQL 16 (see `docker-compose.yml`). All tables use UUID primary keys and PostgreSQL
JSONB for semi-structured data. The database is accessed asynchronously via a SQLAlchemy 2.0
async engine with the asyncpg driver and NullPool (see `backend/app/db.py`).

## Tables

### users

Core user account. Auth is OAuth-only; `password_hash` and `is_verified` were removed
alongside the email auth tables in migration `c7c4776d50fc`.

| Column              | Type         | Notes                            |
| ------------------- | ------------ | -------------------------------- |
| id                  | UUID         | PK                               |
| email               | varchar(320) | unique, indexed                  |
| oauth_provider      | varchar(20)  | e.g. "google", "github"          |
| oauth_id            | varchar(128) | external provider ID             |
| career_context      | text         | user-supplied background summary |
| default_temperature | float        | default 0.7                      |
| default_max_tokens  | integer      | default 4096                     |
| default_top_p       | float        | default 1.0                      |
| created_at          | timestamptz  | server default now()             |
| updated_at          | timestamptz  | auto-updated                     |

### master_resumes

One master resume per user (unique on user_id). The canonical source for all tailoring sessions.

| Column          | Type         | Notes                                         |
| --------------- | ------------ | --------------------------------------------- |
| id              | UUID         | PK                                            |
| user_id         | UUID FK      | unique (one-per-user), CASCADE on delete      |
| filename        | varchar(256) | original filename                             |
| original_format | varchar(10)  | source document format                        |
| content_json    | JSONB        | structured content extracted by LLM, NOT NULL |
| page_count      | integer      | default 0                                     |
| created_at      | timestamptz  |                                               |
| updated_at      | timestamptz  | auto-updated                                  |

### llm_providers

User-configured LLM backends. API keys are stored encrypted. Model selection and generation
parameters are no longer stored here — they moved to `sessions` and `chat_messages`
(migration `f2a3b4c5d6e7`).

| Column            | Type         | Notes                                                     |
| ----------------- | ------------ | --------------------------------------------------------- |
| id                | UUID         | PK                                                        |
| user_id           | UUID FK      | CASCADE on delete                                         |
| name              | varchar(128) | display name                                              |
| provider_type     | varchar(20)  | e.g. "openai", "anthropic", "ollama"                      |
| api_key_encrypted | text         | encrypted at rest, nullable (provider may not need a key) |
| base_url          | varchar(512) | custom endpoint override                                  |
| created_at        | timestamptz  |                                                           |
| updated_at        | timestamptz  | auto-updated                                              |

### sessions

A tailoring session — one job application's context.

| Column                  | Type         | Notes                                                |
| ----------------------- | ------------ | ---------------------------------------------------- |
| id                      | UUID         | PK                                                   |
| user_id                 | UUID FK      | indexed, CASCADE on delete                           |
| master_resume_id        | UUID FK      | SET NULL on delete                                   |
| company_name            | varchar(256) |                                                      |
| role_title              | varchar(256) |                                                      |
| job_description         | text         | nullable                                             |
| tailoring_mode          | varchar(20)  | default "polish"                                     |
| current_provider_id     | UUID FK      | SET NULL on delete, provider in use for this session |
| current_model           | varchar(128) | model in use for this session                        |
| notes                   | text         |                                                      |
| research_summary_json   | JSONB        | cached company research from LLM                     |
| tags                    | JSONB        | array of strings                                     |
| is_archived             | boolean      | default false                                        |
| pending_operations_json | JSONB        | proposed diff operations awaiting user approval      |
| created_at              | timestamptz  |                                                      |
| updated_at              | timestamptz  | auto-updated                                         |

### session_documents

Versioned documents within a session. Self-referential version chain via `parent_doc_id`.

| Column        | Type         | Notes                                          |
| ------------- | ------------ | ---------------------------------------------- |
| id            | UUID         | PK                                             |
| session_id    | UUID FK      | indexed, CASCADE on delete                     |
| doc_type      | varchar(20)  | document kind within the session               |
| version       | integer      | incrementing counter                           |
| content_json  | JSONB        | structured content, NOT NULL                   |
| parent_doc_id | UUID self-FK | SET NULL on delete, points to previous version |
| is_final      | boolean      | default false                                  |
| created_at    | timestamptz  |                                                |

### patches

Audit log of LLM-suggested document changes within a session.

| Column           | Type        | Notes                                     |
| ---------------- | ----------- | ----------------------------------------- |
| id               | UUID        | PK                                        |
| session_id       | UUID FK     | indexed, CASCADE on delete                |
| source_doc_id    | UUID FK     | SET NULL on delete, document before patch |
| target_doc_id    | UUID FK     | SET NULL on delete, document after patch  |
| operations_json  | JSONB       | the diff operations suggested by LLM      |
| raw_llm_response | text        | raw LLM output for debugging              |
| user_message     | text        | chat message that triggered this patch    |
| applied          | boolean     | whether user accepted the patch           |
| user_feedback    | varchar(20) | "accepted", "rejected", etc.              |
| created_at       | timestamptz |                                           |

### chat_messages

Per-session chat history between user and LLM.

| Column          | Type         | Notes                                                   |
| --------------- | ------------ | ------------------------------------------------------- |
| id              | UUID         | PK                                                      |
| session_id      | UUID FK      | indexed, CASCADE on delete                              |
| role            | varchar(20)  | "user", "assistant", "system"                           |
| content         | text         | message body                                            |
| doc_type        | varchar(20)  | default "resume"                                        |
| metadata_json   | JSONB        | optional metadata (tokens, timing)                      |
| patch_id        | UUID FK      | SET NULL on delete, links to related patch              |
| llm_provider_id | UUID FK      | SET NULL on delete, provider that generated the message |
| model           | varchar(128) | model used to generate the message                      |
| created_at      | timestamptz  |                                                         |

There is a composite index `ix_chat_messages_session_doc_type` on `(session_id, doc_type)`.

### refresh_tokens

JWT refresh token management with rotation support.

| Column                 | Type         | Notes                                     |
| ---------------------- | ------------ | ----------------------------------------- |
| id                     | UUID         | PK                                        |
| user_id                | UUID FK      | indexed, CASCADE on delete                |
| token_hash             | varchar(128) | indexed, hashed token value               |
| expires_at             | timestamptz  | expiry timestamp                          |
| revoked                | boolean      | default false                             |
| replaced_by_token_hash | varchar(128) | chain to replacement token after rotation |
| created_at             | timestamptz  |                                           |

## Key Relationships

- **User → MasterResume**: one-to-one (unique on user_id). One canonical resume per user.
- **User → LLMProvider**: one-to-many. Users configure multiple LLM providers.
- **User → Session**: one-to-many. Each session represents one job application tailoring.
- **Session → SessionDocument**: one-to-many, versioned. Each edit produces a new row. The version chain is traced via `parent_doc_id`.
- **Session → Patch**: one-to-many. Complete audit log of all LLM-suggested changes.
- **Session → ChatMessage**: one-to-many. Full chat transcript per session.
- **ChatMessage → Patch**: each assistant message can link to the patch it generated.
- **ChatMessage → LLMProvider**: each assistant message records which provider (and model) generated it.

## Migrations

Schema changes are managed by Alembic with async support (see `backend/alembic/env.py`).
The migration chain, head is `a1b2c3d4e5f6`:

1b575b88483a -> c1a2b3c4d5e6 -> d7e8f9a0b1c2 -> e1f2a3b4c5d6 -> f2a3b4c5d6e7 ->
a3b4c5d6e7f8 -> c7c4776d50fc -> d8e9f0a1b2c3 -> a1b2c3d4e5f6

1. **initial** (`1b575b88483a`) — Creates all core tables: users, email_verifications,
   llm_providers, master_resumes, password_resets, refresh_tokens, sessions,
   session_documents, patches, chat_messages. In this initial shape, users carried
   `password_hash`/`is_verified`, llm_providers carried `model`/`temperature`/`top_p`/
   `max_tokens`/`is_default`, master_resumes carried `tex_source`/`vocabulary_map_json`,
   session_documents carried `document_model_json`/`tex_source`, and sessions carried
   `llm_provider_id`. Dated 2026-07-19.

2. **add_content_json** (`c1a2b3c4d5e6`) — Adds `content_json` (JSONB, nullable) to both
   `master_resumes` and `session_documents`. Dated 2026-07-20.

3. **add_proposal_columns** (`d7e8f9a0b1c2`) — Adds `pending_operations_json` and
   `pending_diff_json` to `sessions`. These hold proposed document changes awaiting user
   approval. Dated 2026-07-20.

4. **remove_latex_columns** (`e1f2a3b4c5d6`) — Drops `tex_source` and `vocabulary_map_json`
   from `master_resumes` and `document_model_json` and `tex_source` from `session_documents`.
   Makes `content_json` NOT NULL on both tables. Dated 2026-07-22.

5. **provider_keys_and_live_models** (`f2a3b4c5d6e7`) — Adds `default_temperature`,
   `default_max_tokens`, and `default_top_p` to `users`. Adds `llm_provider_id` (FK, SET NULL)
   and `model` to `chat_messages`. Drops `model`, `temperature`, `top_p`, `max_tokens`, and
   `is_default` from `llm_providers`, and drops `llm_provider_id` from `sessions`. Dated 2026-07-29.

6. **add_session_current_model** (`a3b4c5d6e7f8`) — Adds `current_provider_id` (FK, SET NULL)
   and `current_model` to `sessions`. Dated 2026-07-29.

7. **remove_email_auth_columns_and_tables** (`c7c4776d50fc`) — Drops the `email_verifications`
   and `password_resets` tables. Makes `default_temperature`, `default_max_tokens`, and
   `default_top_p` on `users` NOT NULL. Drops `password_hash` and `is_verified` from `users`.
   Dated 2026-07-31.

8. **add_doc_type_to_chat_messages** (`d8e9f0a1b2c3`) — Adds `doc_type` (default "resume") to
   `chat_messages` and a composite index on `(session_id, doc_type)`. Dated 2026-07-31.

9. **drop_pending_diff_json** (`a1b2c3d4e5f6`) — Drops `pending_diff_json` from `sessions`.
   Current head. Dated 2026-08-01.

Run migrations with:

```
docker compose exec backend alembic upgrade head
```
