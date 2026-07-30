## Context

The resume document canvas supports drag-and-drop reordering at three levels: sections, entries within sections, and bullets within entries. Skill rows (category: items pairs in the Skills section) are a fourth level that currently lacks DnD support. They are rendered as a flat `.map()` loop outside any `DndContext`. The only way to add a new skill row is via the global `BottomInsert` dropdown which targets the last section.

## Goals / Non-Goals

**Goals:**
- Skill rows can be dragged to reorder within a section
- Each section with skill rows shows an "Add skill row" button
- Matches existing DnD UX patterns (grip handle, hover reveal, optimistic cache update)

**Non-Goals:**
- Moving skill rows between sections (cross-section DnD) — complex, not requested
- Reordering skill rows across sections — keep it within-section only
- Changing the SkillRow schema or data model

## Decisions

### Reuse the SortableSection pattern

`SortableSection.tsx` is the simplest sortable wrapper (39 lines). Create `SortableSkillRow.tsx` as a near-copy: `useSortable` with `row.id`, `<GripVertical>` drag handle, transform/transition via `CSS.Transform.toString()`.

### Wrap skill rows in SectionRenderer, not SkillRowRenderer

Keep `SkillRowRenderer` as the content renderer. Create a separate `SortableSkillRow` wrapper (like `SortableEntry` wraps `EntryRenderer`). This avoids polluting the renderer with DnD concerns.

### Backend op: `move_skill_row`

Add a `MoveSkillRowOp` to the op union in `content_ops.py`, following the `move_entry` pattern:
```python
class MoveSkillRowOp(BaseModel):
    op: Literal["move_skill_row"] = "move_skill_row"
    section_label: str
    from_index: int
    to_index: int
```

### Per-section add button

Add an "Add skill row" button below the skill rows list (inside the `DndContext` wrapper). It fires `add_skill_row` with the correct `section_label` and `after_index = section.skill_rows.length - 1`.

## Risks / Trade-offs

- **Risk**: Skill rows use index-based ops (`skill_row_index`) for update/delete. Reordering changes indices → stale index references → **Mitigation**: DnD uses `id`-based lookup (like entries), not index-based. The `move_skill_row` op uses absolute positions, not relative shifts.
- **Risk**: Cross-section skill row moves would require a different op → **Mitigation**: Out of scope. DnD is disabled across sections (same as entries).

## Migration Plan

No migration needed. Frontend + backend op addition only.

## Open Questions

None
