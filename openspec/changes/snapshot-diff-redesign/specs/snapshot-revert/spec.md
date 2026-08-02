## ADDED Requirements

### Requirement: Store snapshot before LLM proposal

The system SHALL store the current session document content as a snapshot before applying LLM-proposed changes.

#### Scenario: Snapshot created on LLM proposal

- **WHEN** the SSE stream sends a "proposal" event with new content
- **THEN** the system stores the current session document content as `snapshot` before updating the document with the LLM's changes

#### Scenario: Snapshot preserves manual edits

- **WHEN** the user has made manual edits and an LLM proposal arrives
- **THEN** the snapshot includes the manual edits (snapshot captures the state before the LLM applies, not the original master)

### Requirement: Manual edits update snapshot

The system SHALL update the snapshot when the user makes manual edits, so that manual edits survive LLM proposal rejection.

#### Scenario: First manual edit with no snapshot

- **WHEN** the user makes a manual edit and no snapshot exists
- **THEN** the system stores the current document content as snapshot before applying the edit

#### Scenario: Manual edit with existing snapshot

- **WHEN** the user makes a manual edit and a snapshot already exists
- **THEN** the snapshot remains unchanged (it already reflects the last accepted state)

### Requirement: Accept clears snapshot

The system SHALL clear the snapshot when the user accepts changes.

#### Scenario: Accept action

- **WHEN** the user clicks the "Accept" button
- **THEN** the snapshot is set to null and the document content remains unchanged

#### Scenario: Accept with no snapshot

- **WHEN** the user clicks "Accept" and no snapshot exists
- **THEN** the action is a no-op

### Requirement: Reject reverts to snapshot

The system SHALL revert the session document to the snapshot when the user rejects changes.

#### Scenario: Reject action with snapshot

- **WHEN** the user clicks the "Reject" button and a snapshot exists
- **THEN** the session document content is replaced with the snapshot content, the snapshot is set to null, and the document query is refetched

#### Scenario: Reject with no snapshot

- **WHEN** the user clicks "Reject" and no snapshot exists
- **THEN** the action is a no-op and a toast message indicates there is nothing to revert

#### Scenario: Reject preserves manual edits

- **WHEN** the user made manual edits before an LLM proposal and clicks "Reject"
- **THEN** the document reverts to the snapshot which includes the manual edits, and only the LLM's contribution is undone

### Requirement: Accept/Reject buttons visibility

The system SHALL show Accept and Reject buttons only when a snapshot exists (pending proposal).

#### Scenario: Buttons visible with snapshot

- **WHEN** a snapshot exists and the user is in Changes view
- **THEN** Accept and Reject buttons are displayed above the document

#### Scenario: Buttons hidden without snapshot

- **WHEN** no snapshot exists
- **THEN** Accept and Reject buttons are not displayed

### Requirement: Master resume content update endpoint

The system SHALL provide an endpoint to update the master resume content directly from JSON.

#### Scenario: Update master resume content

- **WHEN** a `PATCH /api/master-resume/content` request is sent with `content_json`
- **THEN** the master resume's `content_json` field is updated to the provided value

#### Scenario: No master resume exists

- **WHEN** the endpoint is called and no master resume exists for the user
- **THEN** the endpoint returns a 404 error
