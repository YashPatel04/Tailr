## 1. Database Migration

- [x] 1.1 Add `doc_type` column to `chat_messages` table with default `"resume"` (Alembic migration)
- [x] 1.2 Add composite index on `(session_id, doc_type)` for message queries

## 2. Backend — Cover Letter Content Model

- [x] 2.1 Create `CoverLetterContent`, `CoverLetterParagraph` Pydantic models in `resume_schema.py`
- [x] 2.2 Create six cover letter operation models: `UpdateSalutationOp`, `UpdateParagraphOp`, `AddParagraphOp`, `DeleteParagraphOp`, `ReorderParagraphsOp`, `UpdateClosingOp` in `content_ops.py`
- [x] 2.3 Implement `apply_cover_letter_ops()` in `ContentApplier` that branches on `type: "cover_letter"`
- [x] 2.4 Implement `parse_cover_letter_text()` to migrate legacy `{text, type}` format to structured JSON

## 3. Backend — Chat Message Filtering

- [x] 3.1 Add `doc_type` filter to `GET /api/sessions/{id}/messages` endpoint
- [x] 3.2 Ensure `POST /chat` saves `body.doc_type` on the `ChatMessage` record

## 4. Backend — Cover Letter Edit Prompt

- [x] 4.1 Create `COVER_LETTER_EDIT_PROMPT` in `prompts.py` with structured cover letter content and available operations
- [x] 4.2 Create `build_cover_letter_edit_prompt()` function that includes salutation, paragraphs, closing, company, role, research, tailoring mode

## 5. Backend — Tailor Endpoint Cover Letter Branch

- [x] 5.1 Add cover letter branch in `chat_stream()`: when `doc_type == "cover_letter"` and cover letter exists, use cover letter edit prompt and auto-apply operations
- [x] 5.2 Auto-apply logic: parse operations, apply via `ContentApplier`, create new `SessionDocument` version, save assistant message with explanation, emit `done` SSE event
- [x] 5.3 Handle plan mode for cover letters: use conversational prompt, save message, emit `proposal` with `mode: "plan"`
- [x] 5.4 Handle missing cover letter: save system message "Generate a cover letter first", emit `done` event

## 6. Backend — Generation Endpoint Enhancement

- [x] 6.1 Update `generate_cover_letter` to use session's selected model instead of hardcoded `gpt-4o`
- [x] 6.2 Pass `research_summary_json` to `build_cover_letter_prompt()` when available
- [x] 6.3 Store generated cover letter in structured JSON format `{type, salutation, paragraphs, closing}`
- [x] 6.4 Save generation confirmation as `ChatMessage` with `doc_type="cover_letter"`

## 7. Frontend — Store Changes

- [x] 7.1 Add `streamingDocType` field to session store, set on `sendMessage()` start, clear on SSE complete
- [x] 7.2 Update `sendMessage()` to include `doc_type: state.activeDocType` in request body
- [x] 7.3 Handle `done` SSE event for cover letters (invalidate queries, no proposal/diff state)

## 8. Frontend — Chat Message Filtering

- [x] 8.1 Update `useSessionMessages` hook to accept `doc_type` parameter and use it in query key
- [x] 8.2 Update `ChatMessageList` to pass `activeDocType` to the messages query
- [x] 8.3 Show streaming indicator only when `streamingDocType === activeDocType`

## 9. Frontend — Cover Letter Chat Integration

- [x] 9.1 Create `CoverLetterEmptyPrompt` component for when no cover letter exists in chat
- [x] 9.2 Add generate-intent detection: pattern-match "write a cover letter" / "generate" / "draft" in `sendMessage()` and call generate endpoint
- [x] 9.3 Update `ChatRail` to show empty prompt when `activeDocType === "cover_letter"` and no cover letter exists

## 10. Frontend — Cover Letter Canvas

- [x] 10.1 Create `CoverLetterCanvas` component with salutation, paragraphs (editable), insert lines, and closing blocks
- [x] 10.2 Use existing `EditableField` for each block with appropriate save handlers
- [x] 10.3 Implement `addParagraph` handler for `[+ Paragraph]` insert lines
- [x] 10.4 Implement empty state with "Generate Cover Letter" button (move logic from `DocumentCanvas`)
- [x] 10.5 Wire editQueue for direct edits: `update_salutation`, `update_paragraph`, `update_closing` operations via `PATCH /api/sessions/{id}/document`

## 11. Frontend — DocumentCanvas Integration

- [x] 11.1 Update `DocumentCanvas` to render `CoverLetterCanvas` when `activeDocType === "cover_letter"`
- [x] 11.2 Remove the existing inline cover letter rendering (old read-only text and generate button)
- [x] 11.3 Ensure tab switching correctly toggles between resume canvas and cover letter canvas

## 12. Backend — ContentApplier Document Patch Endpoint

- [x] 12.1 Update `PATCH /api/sessions/{id}/document` to handle cover letter operations (branch on `doc_type` of the target document)
