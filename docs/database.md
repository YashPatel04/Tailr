# Database — Schema and Models

All tables use UUID primary keys and PostgreSQL JSONB for semi-structured data.
The database is accessed asynchronously via SQLAlchemy 2.0 with asyncpg and NullPool
(connection pooling is unnecessary since FastAPI runs as a single-threaded async server).

## Tables

### users
Core user account.

| Column           | Type              | Notes                              |
|------------------|-------------------|------------------------------------|
| id               | UUID              | PK                                 |
| email            | varchar(320)      | unique, indexed                    |
| password_hash    | varchar(128)      | nullable (OAuth users have none)   |
| is_verified      | boolean           | default false                      |
| oauth_provider   | varchar(20)       | e.g. "google", "github"            |
| oauth_id         | varchar(128)      | external provider ID               |
| career_context   | text              | user-supplied background summary   |
| created_at       | timestamptz       | server default now()               |
| updated_at       | timestamptz       | auto-updated                       |

### master_resumes
One master resume per user (unique on user_id). The canonical LaTeX source for all tailoring sessions.

| Column              | Type           | Notes                                       |
|---------------------|----------------|---------------------------------------------|
| id                  | UUID           | PK                                          |
| user_id             | UUID FK        | unique (one-per-user), CASCADE on delete    |
| filename            | varchar(256)   | original filename                           |
| original_format     | varchar(10)    | always "tex"                                |
| tex_source          | text           | full LaTeX source                           |
| content_json        | JSONB          | structured content extracted by LLM         |
| vocabulary_map_json | JSONB          | word-choice mapping for vocabulary swaps    |
| page_count          | integer        | default 0                                   |
| created_at          | timestamptz    |                                             |
| updated_at          | timestamptz    | auto-updated                                |

### llm_providers
User-configured LLM backends. API keys are stored encrypted.

| Column            | Type           | Notes                                |
|-------------------|----------------|--------------------------------------|
| id                | UUID           | PK                                   |
| user_id           | UUID FK        | CASCADE on delete                    |
| name              | varchar(128)   | display name                         |
| provider_type     | varchar(20)    | e.g. "openai", "anthropic", "ollama" |
| api_key_encrypted | text           | encrypted at rest, nullable for Ollama |
| base_url          | varchar(512)   | custom endpoint override             |
| model             | varchar(128)   | e.g. "gpt-4-1106-preview"           |
| temperature       | float          | default 0.7                          |
| top_p             | float          | default 1.0                          |
| max_tokens        | integer        | default 4096                         |
| is_default        | boolean        | one default per user                 |
| created_at        | timestamptz    |                                      |
| updated_at        | timestamptz    | auto-updated                         |

### sessions
A tailoring session — one job application's context.

| Column                  | Type           | Notes                                          |
|-------------------------|----------------|-------------------------------------------------|
| id                      | UUID           | PK                                              |
| user_id                 | UUID FK        | indexed, CASCADE on delete                      |
| master_resume_id        | UUID FK        | SET NULL on delete                              |
| company_name            | varchar(256)   | used for grouping/company views                 |
| role_title              | varchar(256)   |                                                 |
| job_description         | text           | nullable (JD scraping may fail)                 |
| tailoring_mode          | varchar(20)    | default "polish"                                |
| llm_provider_id         | UUID FK        | SET NULL on delete, the provider used for this session |
| notes                   | text           |                                                 |
| research_summary_json   | JSONB          | cached company research from LLM                |
| tags                    | JSONB          | array of strings                                |
| is_archived             | boolean        | default false                                   |
| pending_operations_json | JSONB          | proposed diff operations awaiting user approval |
| pending_diff_json       | JSONB          | proposed document diff awaiting user approval   |
| created_at              | timestamptz    |                                                 |
| updated_at              | timestamptz    | auto-updated                                    |

### session_documents
Versioned documents within a session. Self-referential version chain via parent_doc_id.

| Column              | Type           | Notes                                        |
|---------------------|----------------|----------------------------------------------|
| id                  | UUID           | PK                                           |
| session_id           | UUID FK        | indexed, CASCADE on delete                   |
| doc_type            | varchar(20)    | always "resume"                              |
| version             | integer        | incrementing counter                         |
| document_model_json | JSONB          | legacy document tree structure               |
| content_json        | JSONB          | newer structured content (LLM-extracted)     |
| tex_source           | text           | full LaTeX source at this version            |
| parent_doc_id       | UUID self-FK   | SET NULL on delete, points to previous version |
| is_final            | boolean        | default false                                |
| created_at          | timestamptz    |                                              |

### patches
Audit log of LLM-suggested document changes within a session.

| Column           | Type           | Notes                                         |
|------------------|----------------|-----------------------------------------------|
| id               | UUID           | PK                                            |
| session_id       | UUID FK        | indexed, CASCADE on delete                    |
| source_doc_id    | UUID FK        | SET NULL on delete, document before patch     |
| target_doc_id    | UUID FK        | SET NULL on delete, document after patch      |
| operations_json  | JSONB          | the diff operations suggested by LLM          |
| raw_llm_response | text           | raw LLM output for debugging                  |
| user_message     | text           | chat message that triggered this patch        |
| applied          | boolean        | whether user accepted the patch               |
| user_feedback    | varchar(20)    | "accepted", "rejected", etc.                  |
| created_at       | timestamptz    |                                               |

### chat_messages
Per-session chat history between user and LLM.

| Column        | Type         | Notes                          |
|---------------|--------------|--------------------------------|
| id            | UUID         | PK                             |
| session_id    | UUID FK      | indexed, CASCADE on delete     |
| role          | varchar(20)  | "user", "assistant", "system"  |
| content       | text         | message body                   |
| metadata_json | JSONB        | optional metadata (tokens, timing) |
| patch_id      | UUID FK      | SET NULL on delete, links to related patch |
| created_at    | timestamptz  |                                |

### refresh_tokens
JWT refresh token management with rotation support.

| Column                | Type          | Notes                                     |
|-----------------------|---------------|-------------------------------------------|
| id                    | UUID          | PK                                        |
| user_id               | UUID FK       | indexed, CASCADE on delete                |
| token_hash            | varchar(128)  | indexed, hashed token value               |
| expires_at            | timestamptz   | expiry timestamp                          |
| revoked               | boolean       | default false                             |
| replaced_by_token_hash | varchar(128) | chain to replacement token after rotation |

### email_verifications and password_resets
Standard auth support tables. Both follow the same pattern: `id` (UUID PK), `user_id` (FK to users), `token_hash`, `expires_at`, and `used` boolean.

## Key Relationships

- **User → MasterResume**: one-to-one (unique on user_id). One canonical resume per user.
- **User → LLMProvider**: one-to-many. Users configure multiple LLM providers; one is marked default.
- **User → Session**: one-to-many. Each session represents one job application tailoring.
- **Session → SessionDocument**: one-to-many, versioned. Each edit produces a new row. The version chain is traced via `parent_doc_id`.
- **Session → Patch**: one-to-many. Complete audit log of all LLM-suggested changes.
- **Session → ChatMessage**: one-to-many. Full chat transcript per session.
- **ChatMessage → Patch**: each assistant message can link to the patch it generated.

## Migrations

Schema changes are managed by Alembic with async support. The migration chain:

1. **initial** (`1b575b88483a`) — Creates all core tables: users, master_resumes, llm_providers, sessions, session_documents, patches, chat_messages, refresh_tokens, email_verifications, password_resets. Dated 2026-07-19.

2. **add_content_json** (`c1a2b3c4d5e6`) — Adds `content_json` (JSONB) to both `master_resumes` and `session_documents`. This stores LLM-extracted structured content separately from the legacy `document_model_json`. Dated 2026-07-20.

3. **add_proposal_columns** (`d7e8f9a0b1c2`) — Adds `pending_operations_json` and `pending_diff_json` to `sessions`. These hold proposed document changes that await user approval before being applied. Dated 2026-07-20.

Run migrations with:
```
docker exec resume_builder-backend-1 alembic upgrade head
```
