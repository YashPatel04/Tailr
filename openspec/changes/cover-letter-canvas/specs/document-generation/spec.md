## MODIFIED Requirements

### Requirement: Cover letter generation uses session model

The `POST /api/sessions/{id}/generate-cover-letter` endpoint SHALL use the session's selected model instead of a hardcoded model.

#### Scenario: Use session's selected model
- **WHEN** the session has `current_provider_id` and `current_model` set
- **THEN** the generation uses that provider and model

#### Scenario: Fallback to first available provider
- **WHEN** the session has no selected model
- **THEN** the generation uses the user's first available LLM provider with `gpt-4o` as the model fallback

### Requirement: Cover letter generation includes research context

The cover letter prompt SHALL include the session's research summary (values, hiring signals, tone guidance) when available.

#### Scenario: Research included in prompt
- **WHEN** the session has `research_summary_json` populated
- **THEN** the cover letter prompt includes a research block with values, hiring signals, and tone guidance

#### Scenario: No research available
- **WHEN** the session has no research summary
- **THEN** the cover letter prompt omits the research block and generation proceeds without it

### Requirement: Cover letter edit prompt for chat-driven editing

The tailor endpoint SHALL use a cover letter-specific prompt when `doc_type` is "cover_letter". The prompt SHALL include the current cover letter content (salutation, paragraphs, closing), company info, role, research, and tailoring mode.

#### Scenario: Cover letter edit prompt
- **WHEN** the user sends a message in the cover letter chat with edit mode active
- **THEN** the backend builds a prompt that includes the structured cover letter content and instructs the LLM to return `{ explanation, reasoning, operations }` with cover letter operations

#### Scenario: Tailoring modes apply to cover letters
- **WHEN** the user has tailoring mode set to "rewrite"
- **THEN** the cover letter edit prompt instructs the LLM to restructure paragraphs aggressively; for "polish", only micro-edits
