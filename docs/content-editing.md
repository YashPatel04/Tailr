# Content Editing -- How Edits Work

## Overview

All edits -- whether from the LLM chat or the user's canvas -- use the same **path-based operation system**. No tree node IDs. No LaTeX parsing. Every resume operation addresses content by section label and index (e.g. `section_label="EXPERIENCE"`, `entry_index=0`, `bullet_index=1`). Cover-letter operations address paragraphs by id instead.

The flow for any edit:

```
ContentOp → ContentApplier (deep-copy + apply) → Pydantic validate → save
```

---

## ContentOp Types (24 ops total)

All op classes are defined in `backend/app/services/editing/content_ops.py` and registered in the `ContentOp` union. Every op carries an optional `reasoning` string (default `""`); the single exception is `ask`, which has no `reasoning` field.

### Bullet Operations

| Operation         | Parameters                                                                                    | Purpose                                                              |
| ----------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `update_bullet`   | `section_label`, `entry_index`, `bullet_index`, `text`, `spans`, `bold_added`, `bold_removed` | Replace a bullet's text and remap its spans                          |
| `add_bullet`      | `section_label`, `entry_index`, `after_index`, `text`, `spans`                                | Insert a new bullet at a position (`after_index=-1` for first)       |
| `delete_bullet`   | `section_label`, `entry_index`, `bullet_index`                                                | Remove a bullet                                                      |
| `reorder_bullets` | `section_label`, `entry_index`, `order` (`list[int]`)                                         | Reorder bullets by index list: `[2, 0, 1]` means bullet 2 goes first |

`update_bullet` and `add_bullet` also accept `bold_added` / `bold_removed` (`list[str]`, default `[]`). On apply, spans whose text matches a `bold_removed` word are dropped, each word in `bold_added` gets a new BOLD span (located case-insensitively in the text), and surviving spans are re-anchored to the new text by substring search. The frontend bullet editor sends `spans` only and leaves `bold_added` / `bold_removed` empty. `reorder_bullets` filters the order list to valid indices before reordering.

### Entry Operations

| Operation           | Parameters                                                                                                        | Purpose                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `add_entry`         | `section_label`, `after_index`, `title`, `role?`, `organization?`, `dates?`, `location?`, `urls?`, `bullets?`     | Create a new entry at a position (`after_index=-1` for first). `bullets` items are dicts with `text` / optional `spans` |
| `delete_entry`      | `section_label`, `entry_index`                                                                                    | Remove an entry                                                                                                         |
| `move_entry`        | `section_label`, `from_index`, `to_index`                                                                         | Reorder entries within a section (pop then re-insert with index adjustment)                                             |
| `update_field`      | `section_label`, `entry_index`, `field` (`"title"`, `"role"`, `"organization"`, `"dates"`, `"location"`), `value` | Change a single field on an entry (`value` may be `null`)                                                               |
| `update_entry_urls` | `section_label`, `entry_index`, `urls` (`dict[str, str]`)                                                         | Replace the entry's URLs dict                                                                                           |

### Section Operations

| Operation        | Parameters               | Purpose                                                            |
| ---------------- | ------------------------ | ------------------------------------------------------------------ |
| `add_section`    | `after_index`, `label`   | Add a new empty section at a position (`after_index=-1` for first) |
| `delete_section` | `section_label`          | Remove a section by its label name (case-sensitive match)          |
| `move_section`   | `from_index`, `to_index` | Reorder sections                                                   |

### Skill Operations

| Operation          | Parameters                                                                                       | Purpose                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `update_skill_row` | `section_label`, `skill_row_index`, `category?`, `items?`                                        | Update a skill row's category and/or items; only non-null fields are applied |
| `delete_skill_row` | `section_label`, `skill_row_index`                                                               | Remove a skill row                                                           |
| `move_skill_row`   | `section_label`, `from_index`, `to_index`                                                        | Reorder skill rows within a section                                          |
| `add_skill_row`    | `section_label`, `after_index` (default `-1`), `category` (default `""`), `items` (default `""`) | Insert a new skill row at a position (`after_index=-1` for first)            |

### Basics Operations

| Operation             | Parameters                                                                    | Purpose                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `update_basics_field` | `field` (`"name"`, `"email"`, `"phone"`, `"location"`, `"profiles"`), `value` | Change a basics field. `value` is always a string; for `profiles` it is a JSON string parsed into profile objects |

`"summary"` is not a valid `field` value for this op.

### Cover Letter Operations

Applied by `ContentApplier.apply_cover_letter()` against a `CoverLetterContent` document:

| Operation            | Parameters          | Purpose                                                     |
| -------------------- | ------------------- | ----------------------------------------------------------- |
| `update_salutation`  | `text`              | Replace the salutation                                      |
| `update_paragraph`   | `id`, `text`        | Replace a paragraph's text                                  |
| `add_paragraph`      | `text`, `after_id?` | Insert a paragraph (`after_id` omitted = insert at the top) |
| `delete_paragraph`   | `id`                | Remove a paragraph                                          |
| `reorder_paragraphs` | `ids` (`list[str]`) | Reorder paragraphs by id list                               |
| `update_closing`     | `text`              | Replace the closing line                                    |

### LLM Communication

| Operation | Parameters            | Purpose                                                                                                               |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ask`     | `question`, `context` | LLM asks the user a clarifying question. Not applied to content (no-op during apply) and carries no `reasoning` field |

---

## ContentApplier

Defined in `content_ops.py`. The resume applier works in three steps:

1. **Deep-copy** the current `ResumeContent` so nothing is mutated in place.
2. **Apply operations** in order. Each operation finds its target by section label and index. Unknown ops fail here: `op_from_dict` raises `ValueError("Unknown operation type: ...")` for any `op` string outside the 24-op map.
3. **Clamp + validate** the result: every bullet's spans are clamped to its text length, then the whole document passes through `ResumeContent.model_validate()`. If anything is invalid, the entire batch is rejected and the content stays unchanged (the API surfaces this as HTTP 422).

`ask` operations are no-ops during application -- they pass through for the frontend to render as a question. Cover letters use `apply_cover_letter()`, which deep-copies, applies the six cover-letter ops in order, and returns without an explicit validation pass.

---

## Diff Computation (Frontend)

There is no server-side differ. The proposal SSE event always carries `"diff": null`; the backend applies operations only to validate them, never to render a diff.

Diffing happens in the frontend while `viewMode === "changes"`:

- **`computeFieldDiffs(master, session)`** (`frontend/app/lib/fieldDiff.ts`) compares the user's master resume against the session's current document and returns a `Map<string, DiffChange>` of `added` / `removed` / `modified` changes. Keys are entity ids, not paths: `s:{id}` (section), `s:{id}:e:{eid}` (entry), `s:{id}:e:{eid}:b:{bid}` (bullet), `s:{id}:sr:{rid}` (skill row), plus bare entry/bullet/row ids. It compares basics fields (`name`, `email`, `phone`, `location`), section label and metadata, entry fields and `urls`, bullet text, and skill-row `category` / `items`.
- **`wordDiff(oldText, newText)`** (`frontend/app/lib/fieldDiff.ts`) is an LCS word-level diff returning `{ old, new }` arrays of segments typed `"same" | "added" | "removed"`. `BulletRenderer` uses it to render in-line word highlighting for modified bullets.
- **`DiffProvider`** (`frontend/app/components/diff/DiffContext.tsx`) exposes `useFieldChanges(key)`, `useFieldChangesAny(...keys)`, and `useAllChanges()` to renderers and the overlay.

`DocumentCanvas` computes the change map only when `viewMode === "changes"` and wraps the canvas in `DiffProvider` with a `DiffOverlay`.

---

## LLM Proposal Flow

1. User sends a chat message; `POST /api/sessions/{id}/chat` streams SSE events (`researching`, `research_done`, `thinking`, `writing`, `proposal`, `done`, `error`).
2. Backend builds a prompt from the current `ResumeContent` (clean JSON) plus session context and calls the LLM.
3. The LLM returns a JSON array of operations (or `{operations, explanation, reasoning}`), parsed by `_extract_content_ops`.
4. Backend parses the ops with `ops_from_list`, applies them to a copy via `ContentApplier` to validate them, and retries once with the error message if that fails. The pending ops are stored on the session (`pending_operations_json`).
5. Backend emits the SSE **`proposal`** event with `operations`, `message`, `patch_summary`, `explanation`, `reasoning`, and `mode="edit"`. Content is NOT auto-applied. The payload's `diff` field is `null`.
6. On receiving a proposal, the frontend store captures the current session document content as a `snapshot` (once) and switches the canvas to `viewMode="changes"`, which renders the master-vs-session diff and the overlay.
7. `EnhancedProposal` renders a card with the explanation, reasoning, change count, **Accept Changes** / **Decline** / **View Changes** buttons, and an inline reply box. Up to 5 refinement replies are allowed; each re-sends the chat message with the proposal as `proposal_context`.
8. **Accept** → `POST /api/sessions/{id}/proposal/accept` with the operations array. The backend applies them via `ContentApplier`, saves a new `SessionDocument` version plus a `Patch` record (`applied=True`, `user_message="[PROPOSAL ACCEPTED] N changes"`), posts an assistant message, and returns `{document_id, version, patch_id, changes_applied}`. The frontend clears the snapshot, switches to `viewMode="final"`, and invalidates the sessions/document/messages queries.
9. **Decline** → `POST /api/sessions/{id}/proposal/decline`, which logs an assistant message ("Proposal declined. How can I help?") and returns `{"status": "declined"}`.

There is no conflict banner. When a proposal arrives, the pre-proposal content is simply captured as `snapshot` for the overlay's revert path.

### Diff Overlay

While in diff view, `DiffOverlay` offers two bulk actions:

- **Accept all** -- local only. Calls `clearSnapshot()` and shows a toast; no API call is made and nothing is persisted. It only drops the revert snapshot so the overlay disappears.
- **Reject all** -- broken. It sends `PATCH /api/sessions/{id}/document` with `[{ "op": "set_content", "content": snapshot }]`. `set_content` is not a defined operation: the endpoint parses ops with `ops_from_list`, which raises `ValueError` on the unknown `op` before any error handling, so the request fails with an unhandled HTTP 500 and the overlay shows "Failed to revert". The revert to the snapshot does not happen.

---

## Manual Editing (Canvas)

### Inline Editing

- **`EditableField`** (`components/document/EditableField.tsx`): a generic contentEditable element (`span`/`div`/`h1`/`h2`) that commits on blur, Enter, or Escape. It emits no operation itself; the caller's `onSave` decides what to queue. Used by `ResumeHeader` (basics fields → `update_basics_field`), `CoverLetterCanvas` (salutation/paragraph/closing → `update_salutation` / `update_paragraph` / `update_closing`), and `SectionRenderer` (section label → updates the React Query cache only, no operation is queued).
- **`RichEditableField`** (`components/document/RichEditableField.tsx`): a contentEditable with a formatting toolbar and shortcuts `Ctrl/Cmd+B/I/U` (bold/italic/underline) and `Ctrl/Cmd+K` (link). Bullets save via `update_bullet` with `spans`; entry fields (title, role, organization, dates, location) save via `update_field`; skill rows save via `update_skill_row`.

### Edit Queue (Debounced)

All manual edits go through `frontend/app/lib/editQueue.ts`:

- React Query cache is updated **optimistically** (instant visual feedback).
- Operations are queued locally with `queueEdit`; save status becomes `queued`.
- After **2 seconds of inactivity**, the queue flushes all pending ops for the active session in a single `PATCH /document` request (status `saving` → `saved`, auto-reset to `idle` after 3s). If the request fails, the ops are re-queued and status becomes `error`.
- Save statuses: `idle | queued | saving | saved | error`.
- **Undo/redo** (`Ctrl/Cmd+Z`, with Shift for redo) is wired to `undo()` / `redo()`, which replay stored inverse/forward operation lists. History is capped at `MAX_HISTORY = 50` entries and cleared when the active session changes. The machinery records an inverse op only when a producer passes one as the second `queueEdit` argument; no producer currently does, so inverse arrays stay empty and `undo()` short-circuits -- undo/redo are effectively inert today.

### Drag and Drop

Reorder via grip handles, all optimistic (immediate reorder + queued operation):

| Level      | Component         | Produces          |
| ---------- | ----------------- | ----------------- |
| Sections   | `DocumentCanvas`  | `move_section`    |
| Entries    | `SectionRenderer` | `move_entry`      |
| Bullets    | `EntryRenderer`   | `reorder_bullets` |
| Skill rows | `SectionRenderer` | `move_skill_row`  |

Grip handles and add/delete buttons are hidden in diff view mode.

### Add / Delete Buttons

- **"+ Bullet"** on each entry (`EntryRenderer`) queues `add_bullet` with placeholder text "New bullet point".
- **Delete (x)** on each bullet (`BulletRenderer`) queues `delete_bullet`.
- **Delete (x)** on each entry queues `delete_entry`; the section delete button queues `delete_section`.
- **"+ Add skill row"** queues `add_skill_row`; the skill-row delete button (`SkillRowRenderer`) queues `delete_skill_row`.
- The bottom **Insert** menu (`DocumentCanvas`) adds a section, entry, or skill row by calling `PATCH /document` directly (not through the queue) with `add_section` / `add_entry` / `add_skill_row`.
- Cover letter: **"+ Paragraph"** buttons queue `add_paragraph`.
- All add/delete controls are hidden in diff view mode.
