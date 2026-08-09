"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { SkillRowRenderer } from "./SkillRowRenderer"
import { useSessionStore } from "@/stores/sessionStore"
import type { SkillRow } from "@/types"

export function SortableSkillRow({
  row,
  sectionIndex,
  rowIndex,
  sectionLabel,
}: {
  row: SkillRow
  sectionIndex: number
  rowIndex: number
  sectionLabel: string
}) {
  const viewMode = useSessionStore((s) => s.viewMode)
  const editingFieldId = useSessionStore((s) => s.editingFieldId)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: viewMode === "changes" || editingFieldId !== null,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`transition-transform duration-200 ease-in-out ${isDragging ? "opacity-50 z-10" : ""}`}
    >
      <div className="flex items-start gap-1 group">
        {viewMode !== "changes" && editingFieldId === null && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab text-slate hover:text-ink transition-opacity"
          >
            <GripVertical size={14} />
          </button>
        )}
        <div className="flex-1">
          <SkillRowRenderer
            row={row}
            sectionIndex={sectionIndex}
            rowIndex={rowIndex}
            sectionLabel={sectionLabel}
          />
        </div>
      </div>
    </div>
  )
}
