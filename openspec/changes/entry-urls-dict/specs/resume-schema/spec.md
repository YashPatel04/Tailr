## MODIFIED Requirements

### Requirement: Support semantic entry fields
Each `Entry` in a section SHALL support typed fields: `title` (required), `role`, `organization`, `dates`, `location` (all optional), `urls` (a `dict[str, str]` mapping URL to display mask, defaulting to empty dict), plus an ordered list of `Bullet` items. Each `Bullet` SHALL contain `text` and optional `spans` for formatting annotations. When a `urls` entry has an empty string value (`""`), the renderer SHALL display the URL itself as the clickable text.

#### Scenario: Entry with all fields
- **WHEN** an Entry is created with title="TrendAI", role="Software Engineering Intern", organization=None, dates="June 2026 – August 2026", location="Austin, TX", urls={"https://example.com": "Project Site"}, and 3 bullets
- **THEN** the Entry validates successfully with all fields accessible by name

#### Scenario: Entry with only title and bullets
- **WHEN** an Entry is created with title="CliquePay" and 1 bullet, with all other fields None
- **THEN** the Entry validates successfully (only title is required, urls defaults to empty dict)

#### Scenario: Entry with multiple URLs
- **WHEN** an Entry has urls={"https://github.com/me": "GitHub", "https://portfolio.dev": "Portfolio"}
- **THEN** both URLs are stored and accessible via dict iteration

#### Scenario: Entry with URL and empty mask
- **WHEN** an Entry has urls={"https://example.com": ""}
- **THEN** the renderer SHALL display "https://example.com" as the clickable text
