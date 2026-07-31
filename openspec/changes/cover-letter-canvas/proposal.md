## Why

The cover letter feature exists as a dead-end: a one-shot "Generate Cover Letter" button that produces read-only plain text with no editing, no chat integration, and no iteration. The button itself is broken (hardcoded to gpt-4o, ignores user's selected model, doesn't pass research context). Users need to write, edit, and refine cover letters with LLM assistance — the same workflow they have for resumes, but simpler.

## What Changes

- **New `CoverLetterCanvas` component**: A simple text document editor with editable paragraphs (salutation, body paragraphs, closing). No drag-and-drop, no rich text, no sections/entries/bullets — just plain `contentEditable` blocks.
- **Two chats per session**: Each session gets separate chat threads for resume and cover letter. Tab switching renders the respective chat. Messages are partitioned by `doc_type` on the `ChatMessage` model.
- **Chat-driven cover letter editing**: When on the cover letter tab, chat messages target the cover letter document. The LLM returns operations that auto-apply (no proposal/accept pattern). The canvas updates immediately.
- **"Write a cover letter" via chat**: If no cover letter exists and the user sends a message in the cover letter chat, the system detects generation intent or prompts to generate first.
- **Enhanced generation endpoint**: Uses the session's selected model (not hardcoded gpt-4o), passes job description and research summary to the prompt.
- **Six new content operations**: `update_salutation`, `update_paragraph`, `add_paragraph`, `delete_paragraph`, `reorder_paragraphs`, `update_closing` — applied by `ContentApplier` for cover letter documents.
- **Background streaming**: SSE streaming continues if user switches tabs. Streaming indicator only shows for the active tab's chat.

## Capabilities

### New Capabilities
- `cover-letter-canvas`: Editable cover letter document canvas with salutation, paragraphs, and closing blocks. Supports direct inline editing and LLM-driven edits.
- `cover-letter-chat`: Chat integration for cover letters — separate message thread per session, auto-apply LLM operations (no proposals), generation via chat command.
- `cover-letter-operations`: Content operations for cover letter documents — update/add/delete/reorder paragraphs, update salutation/closing.

### Modified Capabilities
- `chat-messaging`: Chat messages gain a `doc_type` field. Messages are partitioned by document type. `sendMessage()` passes `activeDocType`. Streaming state tracks which doc type is streaming.
- `document-generation`: Cover letter generation endpoint enhanced with session model selection and research context injection.

## Impact

- **Database**: New `doc_type` column on `chat_messages` table (migration required, default `"resume"`).
- **Backend**: `ContentApplier` extended with cover letter operations. Tailor endpoint gains a cover letter branch (auto-apply, no proposals). New cover letter edit prompt in `prompts.py`.
- **Frontend**: New `CoverLetterCanvas` component. `ChatMessageList` filters by `doc_type`. Store gains `streamingDocType`. `DocumentCanvas` switches render based on `activeDocType`.
- **No breaking changes**: All existing resume functionality preserved. Existing chat messages default to `doc_type="resume"`.
