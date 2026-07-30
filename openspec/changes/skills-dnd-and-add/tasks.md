# Tasks: skills-dnd-and-add

## 1. Backend: Add MoveSkillRowOp to content_ops.py

- [x] Add `MoveSkillRowOp` Pydantic model to `content_ops.py` (after `DeleteSkillRowOp`)
- [x] Add to `ContentOp` union
- [x] Add to `OP_CLASSES` list
- [x] Add handler in `apply_edit` for `move_skill_row` — splice skill_rows list like `move_entry`
- [ ] Test: send `move_skill_row` op via API and verify reorder

## 2. Frontend: Create SortableSkillRow.tsx

- [x] Create `SortableSkillRow.tsx` following `SortableSection.tsx` pattern
- [x] Uses `useSortable` with `row.id`
- [x] Renders `GripVertical` handle with hover opacity
- [x] Applies `CSS.Transform.toString(transform)` and `transition`
- [x] Wraps `SkillRowRenderer` as content

## 3. Frontend: Update SectionRenderer.tsx

- [x] Import `SortableSkillRow`
- [x] Add `handleSkillRowDragEnd` callback — optimistic cache update + queue `move_skill_row` op
- [x] Wrap skill rows in `DndContext`/`SortableContext`
- [x] Add "+ Add skill row" button below skill rows list
- [x] Button fires `add_skill_row` op with correct `section_label` and `after_index`

## 4. Verify

- [x] Ruff lint: only pre-existing issues (import sorting, Union syntax, line length)
- [x] TypeScript: cannot run locally (node_modules in Docker only), manual review passed
- [ ] Docker rebuild and test in browser
