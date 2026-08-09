## ADDED Requirements

### Requirement: Tailor endpoint stores v2 Region tree document model

The system SHALL re-parse the LLM-modified `tex_source` through the v2 `parse_resume()` pipeline before persisting the new `SessionDocument`. The stored `document_model_json` MUST be a valid Region tree with populated entry fields (title, dates, organization, role, location) and bullet text with spans. The re-parsing step SHALL run after the old applier produces `new_tex` and before the `SessionDocument` is created.

#### Scenario: Tailor creates a session document with populated entry fields

- **WHEN** the LLM applies ops and the old applier produces `new_tex`
- **THEN** the endpoint calls `parse_resume(new_tex.encode("utf-8"))` and stores `doc.root.model_dump()` as `document_model_json`
- **AND** the stored entry regions have non-empty `fields` dicts with `title`, `dates`, `organization`, `role`, and `location` keys as available

#### Scenario: Re-parse failure falls back gracefully

- **WHEN** `parse_resume()` raises an exception on the LLM-modified tex
- **THEN** the endpoint stores the old DocNode tree as `document_model_json` (the legacy fallback path) and logs the parse error for diagnostics
