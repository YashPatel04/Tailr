## ADDED Requirements

### Requirement: Accept validated JSON patches
The system SHALL accept a JSON patch from the LLM containing an array of operations. Supported operations: `modify` (update text/spans of an existing node), `insert` (add a new node under a parent), `delete` (remove a node), `move` (reparent a node), and `ask` (pause and surface a question to the user). The system SHALL validate every patch before applying it.

#### Scenario: Apply a valid modify operation
- **WHEN** the LLM sends `{"op": "modify", "target": "bul-3", "text": "Updated bullet text", "spans": [], "reasoning": "Better phrasing"}`
- **THEN** the system updates node `bul-3` in the document model and records the change in the version chain

#### Scenario: Apply a valid insert operation
- **WHEN** the LLM sends `{"op": "insert", "parent": "sec-1", "after": "ent-2", "element": {"type": "entry", "fields": {"title": "New Corp", "dates": "2023--Present"}, "children": [{"type": "bullet", "text": "Did stuff"}]}, "reasoning": "New experience"}`
- **THEN** the system creates a new entry node under section `sec-1` positioned after `ent-2`, serializes it to `.tex` using the vocabulary map, and saves the new document version

#### Scenario: Reject patch with nonexistent target ID
- **WHEN** the LLM sends a modify operation referencing a node ID that does not exist in the current document model
- **THEN** the system rejects the patch with a validation error specifying the invalid ID

#### Scenario: Reject patch that creates a cycle
- **WHEN** the LLM sends a move operation that would reparent a section into its own child
- **THEN** the system rejects the patch with a cycle-detection error

#### Scenario: Reject delete of required metadata
- **WHEN** the LLM sends a delete operation targeting the contact information section
- **THEN** the system rejects the operation because contact info is required metadata

#### Scenario: Apply an ask operation
- **WHEN** the LLM sends `{"op": "ask", "question": "Do you have Kubernetes experience? The JD requires it.", "context": "Can add to Skills section"}`
- **THEN** the system pauses patch application, surfaces the question in the chat rail, and waits for the user's response before continuing

### Requirement: Maintain document version chain
The system SHALL track a version chain of documents within each tailoring session using a `parent_doc_id` reference. Each accepted patch SHALL produce a new document version. Diff computation SHALL operate between any two versions in the chain.

#### Scenario: Create version chain on first tailoring
- **WHEN** a user accepts the first tailoring patch on a session document
- **THEN** a new document version is created with `parent_doc_id` pointing to the initial document and `version` incremented

#### Scenario: Compute diff between two versions
- **WHEN** the system is asked to diff version 1 and version 3 of a document
- **THEN** the system traverses the version chain, collects all patches applied between the two versions, and returns a unified change set with added, removed, and modified nodes

#### Scenario: Branch from any version
- **WHEN** the user starts a tailoring session from version 2 instead of the latest version
- **THEN** the system creates a child document from version 2, producing a branch in the version history

### Requirement: Apply patches to master resume selectively
The system SHALL allow the user to selectively push individual patch operations from a tailored document back to their master resume. Only the selected operations SHALL be applied — not the entire tailoring session.

#### Scenario: Push a single improved bullet to master
- **WHEN** the user clicks "Apply to master" on a modified bullet in a tailored resume
- **THEN** only that bullet's modify operation is applied to the master resume's document model and `.tex` source

#### Scenario: Do not auto-contaminate master
- **WHEN** a tailoring session modifies 5 bullets for a security role
- **THEN** none of the changes affect the master resume unless the user explicitly applies individual operations back

### Requirement: Store patches with metadata
The system SHALL store every patch (applied or rejected) with its operations, the raw LLM response, the user's triggering chat message, and an `applied` status flag. This enables debugging and audit trails.

#### Scenario: Record a rejected patch
- **WHEN** the user rejects a tailoring patch
- **THEN** the patch is stored with `applied: false` and `user_feedback` containing the message that triggered it, for future debugging

#### Scenario: Replay patch history
- **WHEN** a user revisits an old tailoring session
- **THEN** all patches (applied and rejected) are retrievable with their metadata and can be displayed in the diff view
