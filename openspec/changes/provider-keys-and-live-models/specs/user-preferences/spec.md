## ADDED Requirements

### Requirement: User preference columns
The system SHALL store default generation parameters on the user record: default_temperature (FLOAT, default 0.7), default_max_tokens (INT, default 4096), default_top_p (FLOAT, default 1.0).

#### Scenario: New user gets defaults
- **WHEN** a new user account is created
- **THEN** the user record has default_temperature=0.7, default_max_tokens=4096, default_top_p=1.0

#### Scenario: Existing users get defaults via migration
- **WHEN** the migration runs on existing user records
- **THEN** all existing users get default_temperature=0.7, default_max_tokens=4096, default_top_p=1.0

### Requirement: User preferences API
The system SHALL provide GET /api/user/preferences and PUT /api/user/preferences endpoints for reading and updating the user's default generation parameters.

#### Scenario: Read preferences
- **WHEN** a user requests GET /api/user/preferences
- **THEN** the system returns { default_temperature, default_max_tokens, default_top_p }

#### Scenario: Update preferences
- **WHEN** a user requests PUT /api/user/preferences with { default_temperature: 0.5 }
- **THEN** the system updates only the provided fields
- **AND** returns the full updated preferences object

#### Scenario: Validation
- **WHEN** a user submits a temperature outside the range 0.0-2.0
- **THEN** the system returns 422 with a validation error

### Requirement: Preferences used in LLM calls
The system SHALL use the user's stored preferences as the default parameters when creating LLM adapters for chat calls.

#### Scenario: Chat uses user preferences
- **WHEN** a chat message is sent and the user has default_temperature=0.5, default_max_tokens=8192
- **THEN** the LLM adapter is created with temperature=0.5 and max_tokens=8192
- **AND** these values are passed to the provider's API
