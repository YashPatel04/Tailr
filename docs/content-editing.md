# Content Editing -- How Edits Work

## Overview

All edits -- whether from the LLM chat or the user's canvas -- use the same **path-based operation system**. No tree node IDs. No LaTeX parsing. Every operation addresses content by section label and index (e.g. `section_label="EXPERIENCE"`, `entry_index=0`, `bullet_index=1`).

The flow for any edit:

```
ContentOp → ContentApplier (deep-copy + apply) → Pydantic validate → save
```

---

## ContentOp Types (All 16)

### Bullet Operations

| Operation | Parameters | Purpose |
|-----------|-----------|---------|
| `update_bullet` | `section_label`, `entry_index`, `bullet_index`, `text`, `spans` | Replace a bullet's text and formatting |
| `add_bullet` | `section_label`, `entry_index`, `after_index`, `text`, `spans` | Insert a new bullet at a position (`after_index=-1` for first) |
| `delete_bullet` | `section_label`, `entry_index`, `bullet_index` | Remove a bullet |
| `reorder_bullets` | `section_label`, `entry_index`, `order` (`list[int]`) | Reorder bullets by index list: `[2, 0, 1]` means bullet 2 goes first |

### Entry Operations

| Operation | Parameters | Purpose |
|-----------|-----------|---------|
| `add_entry` | `section_label`, `after_index`, `title`, `role?`, `organization?`, `dates?`, `location?`, `urls?`, `bullets` | Create a new entry at a position |
| `delete_entry` | `section_label`, `entry_index` | Remove an entry |
| `move_entry` | `section_label`, `from_index`, `to_index` | Reorder entries within a section |
| `update_field` | `section_label`, `entry_index`, `field` (`"title"`, `"role"`, `"organization"`, `"dates"`, `"location"`), `value` | Change a single field on an entry |
| `update_entry_urls` | `section_label`, `entry_index`, `urls` (dict[str, str]) | Replace the entry's URLs dict |

### Section Operations

| Operation | Parameters | Purpose |
|-----------|-----------|---------|
| `add_section` | `after_index`, `label` | Add a new empty section at a position |
| `delete_section` | `section_label` | Remove a section by its label name |
| `move_section` | `from_index`, `to_index` | Reorder sections |

### Skill / Basics Operations

| Operation | Parameters | Purpose |
|-----------|-----------|---------|
| `update_skill_row` | `section_label`, `skill_row_index`, `category?`, `items?` | Update a skill row's category and/or items |
| `delete_skill_row` | `section_label`, `skill_row_index` | Remove a skill row from a section |
| `add_skill_row` | `section_label`, `after_index`, `category`, `items` | Insert a new skill row at a position (`after_index=-1` for first) |
| `update_basics_field` | `field` (`"name"`, `"email"`, `"phone"`, `"location"`, `"summary"`, `"profiles"`), `value` | Change a basics field |

### LLM Communication

| Operation | Parameters | Purpose |
|-----------|-----------|---------|
| `ask` | `question`, `context` | LLM asks the user a clarifying question. Not applied to content. |

Every operation carries an optional `reasoning` string for audit trails and LLM explainability.

---

## ContentApplier

The applier works in three steps:

1. **Deep-copy** the current `ResumeContent` so nothing is mutated in place.
2. **Apply operations** in order. Each operation finds its target by section label and index.
3. **Pydantic validate** the result via `ResumeContent.model_validate()`. If anything is invalid (bad span offsets, missing required fields, etc.), the entire batch is rejected and the content stays unchanged.

`ask` operations are no-ops during application -- they pass through for the frontend to render as a question.

---

## ContentDiffer

Produces a human-readable list of changes when old and new `ResumeContent` are compared.

Each change has a **semantic path** (e.g. `sections.EXPERIENCE.entries[1].bullets[0].text`), a **kind** (`added`, `removed`, `modified`), and the old/new values when applicable.

The differ walks the tree: basics fields, then sections by label, then entries by index, then bullets by index, then skill rows by index. It handles added/removed sections, added/removed entries, added/removed bullets, and top-level metadata changes.

---

## LLM Proposal Flow

1. User sends a chat message requesting changes.
2. Backend constructs an LLM prompt with the full `ResumeContent` as clean JSON (no byte slices, no Region tree nodes).
3. LLM returns typed operations (e.g. `[{"op": "update_bullet", "section_label": "EXPERIENCE", ...}]`).
4. Backend computes a **diff** between current content and what the operations would produce.
5. Backend emits an **SSE `proposal` event** with the operations and diff. Content is NOT auto-applied.
6. Frontend renders a proposal card with **Accept** and **Decline** buttons, and the canvas switches to **diff view** to preview changes.
7. On Accept → operations are applied via `ContentApplier`, a new version is saved, canvas refreshes.
8. On Decline → operations are discarded, a declined message is logged, canvas stays unchanged.

If the user has unsaved canvas edits when an LLM proposal arrives, the frontend detects the **conflict** and shows a banner: "AI made changes while you were editing -- review, keep yours, or merge."

---

## Manual Editing (Canvas)

### Inline Editing

- **`EditableField`**: A plain text input bound to a single field (title, role, dates, etc.). Edits produce `update_field` operations.
- **`RichEditableField`**: A textarea with a formatting toolbar (Bold, Italic, Underline, Code). Users select text and apply formats via toolbar buttons or `Ctrl+B/I/U`. Edits produce `update_bullet` operations with `spans` included.

### Edit Queue (Debounced)

All manual edits go through a debounced queue:

- React Query cache is updated **optimistically** (instant visual feedback).
- Operations are queued locally.
- After **2 seconds of inactivity**, the queue flushes all pending ops in a single `PATCH` request.
- If the user types continuously, ops batch together and send only when they pause.

### Drag and Drop

Three levels of reorder via grip handles:

| Level | Component | Produces |
|-------|-----------|----------|
| Sections | `DocumentCanvas` | `move_section` |
| Entries | `SectionRenderer` | `move_entry` |
| Bullets | `EntryRenderer` | `reorder_bullets` |

All drag operations are **optimistic** (immediate reorder + queued operation). Grip handles and add/delete buttons are hidden in diff view mode.

### Add / Delete Buttons

- **"Add Bullet"** button appears on each entry (visible on hover). Creates a new bullet with placeholder text and queues `add_bullet`.
- **Delete (x)** button appears on each bullet. Removes it and queues `delete_bullet`.
- Both are hidden in diff view mode.
