## ADDED Requirements

### Requirement: Scrape official company sources

The system SHALL, before tailoring a resume, research the target company by scraping: the company's careers page, the company's engineering blog (top results from search), and relevant subreddit threads (r/ExperiencedDevs, r/cscareerquestions). Research SHALL be timeboxed to 15 seconds total with per-source timeouts of 5 seconds.

#### Scenario: Scrape a careers page

- **WHEN** the user provides a JD that mentions "Stripe"
- **THEN** the system fetches `https://stripe.com/jobs` (or careers.stripe.com), extracts visible text, and includes it in the research corpus

#### Scenario: Timeout on a slow source

- **WHEN** a company engineering blog takes longer than 5 seconds to respond
- **THEN** the system drops that source and continues with whatever was gathered — no crash, no blocking beyond the 15s total timebox

#### Scenario: Fallback when no sources found

- **WHEN** the company's careers page is inaccessible and search returns no relevant results
- **THEN** the system proceeds with an empty research summary and relies solely on the JD text

### Requirement: Summarize research for prompt injection

The system SHALL send scraped research text to a summarizing LLM (the tailoring LLM or a cheaper model) to produce a structured summary covering: company values/culture, hiring signals from past postings, and tone guidance. The summary SHALL be injected into the tailoring prompt.

#### Scenario: Generate a structured research summary

- **WHEN** scraped text about Stripe includes "users first, details matter" from the careers page and multiple Reddit threads mention "practical coding interviews"
- **THEN** the research summary includes a values section ("users first, details matter") and a hiring signals section ("emphasizes practical coding in interviews")

#### Scenario: Research does not override JD requirements

- **WHEN** the research summary suggests emphasizing "design skills" but the JD explicitly requires "backend infrastructure experience"
- **THEN** the system prompt instructs the LLM that JD requirements take priority over research inferences when they conflict

### Requirement: Store research in session context

The system SHALL store the research summary in the session's database record so it persists across messages within the session. The research SHALL be gathered once at session start and reused — not re-scraped on every chat message.

#### Scenario: Research persists for session lifetime

- **WHEN** research is completed for a session and the user sends a follow-up message like "emphasize backend more"
- **THEN** the new LLM request includes the existing research summary without re-scraping
