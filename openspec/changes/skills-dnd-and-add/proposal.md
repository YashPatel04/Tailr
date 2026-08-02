## Why

Skill rows (category: items) in the resume document canvas lack drag-and-drop reordering and per-section add functionality. Entries and bullets both support DnD reordering, but skill rows are excluded. The only way to add a skill row is via the global BottomInsert dropdown, which always appends to the last section — not useful for multi-section resumes.

## What Changes

- Add DnD reordering for skill rows within a section, matching the existing pattern used for entries and bullets
- Add a per-section "Add skill row" button inside the skill rows area
- Create a `SortableSkillRow` component modeled on `SortableSection` (simplest existing template)
- Add `move_skill_row` op to both frontend edit queue and backend `content_ops.py`

## Capabilities

### New Capabilities

- `skill-row-dnd`: Drag-and-drop reordering for skill rows within a section, plus per-section add button

### Modified Capabilities

## Impact

- `frontend/app/components/document/SectionRenderer.tsx` — wrap skill rows in `DndContext`/`SortableContext`, add `handleSkillRowDragEnd`, add per-section "Add skill row" button
- `frontend/app/components/document/SkillRowRenderer.tsx` — accept sortable props or create wrapper `SortableSkillRow.tsx`
- `backend/app/services/editing/content_ops.py` — add `MoveSkillRowOp` model and handler
- No schema changes (SkillRow shape unchanged)
