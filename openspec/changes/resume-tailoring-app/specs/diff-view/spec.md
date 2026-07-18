## ADDED Requirements

### Requirement: Render diff with margin proofreading marks
The system SHALL render the diff between two document versions using margin proofreading marks: a thin vertical rule beside changed lines in Proof Green (additions) or Proof Red (deletions), a small caret mark for insertions, and a strikethrough mark for removals. These SHALL be the only use of Proof Green/Red in the entire application.

#### Scenario: Highlight an added bullet
- **WHEN** the LLM adds a new bullet under the Experience section
- **THEN** the canvas renders the new bullet with a Proof Green vertical rule in the left margin and a green caret mark beside the bullet text

#### Scenario: Highlight a modified bullet
- **WHEN** the LLM rewrites an existing bullet
- **THEN** the canvas renders the old version with a Proof Red vertical rule and strikethrough, and the new version with a Proof Green vertical rule and caret — both visible side by side

#### Scenario: Highlight a deleted element
- **WHEN** the LLM removes a skill from the Skills section
- **THEN** the canvas renders the removed skill with a Proof Red vertical rule and strikethrough mark

#### Scenario: No color leakage into product chrome
- **WHEN** the diff view is active
- **THEN** Proof Green and Proof Red appear ONLY in the document canvas on changed elements — never in buttons, links, navigation, or other chrome

### Requirement: Animate diff transitions
The system SHALL apply a 150-200ms transition when diff highlights appear or update, making the change legible as a discrete event rather than an instantaneous jump. The transition SHALL apply only to changed elements, not the entire canvas.

#### Scenario: Smooth transition on patch application
- **WHEN** a tailoring patch is applied
- **THEN** the changed elements fade or slide into their diff-highlighted state over ~200ms, while unchanged elements remain static

#### Scenario: Update diff on follow-up edit
- **WHEN** the user sends a follow-up message and the patch modifies different elements
- **THEN** old highlights transition out and new highlights transition in over ~200ms, with non-affected elements remaining static

### Requirement: Toggle between diff and final view
The system SHALL allow the user to toggle between "diff view" (showing changes with proofreading marks) and "final view" (showing only the resulting document without marks). The default view after a tailoring SHALL be diff view.

#### Scenario: Switch to final view
- **WHEN** the user clicks "Accept all changes"
- **THEN** the canvas switches to final view — all proofreading marks are removed, and the tailored document is shown clean

#### Scenario: Reject all changes
- **WHEN** the user clicks "Reject all changes" in the diff view
- **THEN** the document reverts to the pre-patch state and the diff highlights disappear

### Requirement: Live diff alongside chat
The diff view SHALL remain interactive and live while the chat rail is active. The user SHALL be able to send revision requests in chat and see the diff update in place without a page reload or mode switch.

#### Scenario: Request revision while viewing diff
- **WHEN** the diff view is showing 3 changes and the user types "keep original bullet 3 but apply everything else"
- **THEN** the LLM processes the request, sends a new patch, and the diff updates in place — removing highlights from bullet 3 and keeping highlights on the others

#### Scenario: Hover to see reasoning
- **WHEN** the user hovers over a diff-highlighted element
- **THEN** a tooltip displays the `reasoning` text from the patch operation that created the change
