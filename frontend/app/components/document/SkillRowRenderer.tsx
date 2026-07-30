"use client"

import { useQueryClient } from "@tanstack/react-query"
import type { SkillRow } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { RichEditableField } from "./RichEditableField"
import { DeleteButton } from "./DeleteButton"

interface SkillRowRendererProps {
  row: SkillRow
  sectionIndex?: number
  rowIndex?: number
  sectionLabel?: string
}

export function SkillRowRenderer({
  row,
  sectionIndex,
  rowIndex,
  sectionLabel,
}: SkillRowRendererProps) {
  const viewMode = useSessionStore((s) => s.viewMode)
  const queryClient = useQueryClient()

  const updateCache = (field: string, value: string) => {
    if (sectionIndex === undefined || rowIndex === undefined || !sectionLabel) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    if (!sessionId) return
    queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
      if (!old?.content) return old
      const newContent = structuredClone(old.content)
      const section = newContent.sections.find((s: any) => s.label === sectionLabel)
      if (section?.skill_rows?.[rowIndex]) {
        ;(section.skill_rows[rowIndex] as any)[field] = value
      }
      return { ...old, content: newContent }
    })
  }

  const handleDelete = () => {
    if (!sectionLabel || rowIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    queueEdit({ op: "delete_skill_row", section_label: sectionLabel, skill_row_index: rowIndex })
    if (sessionId) {
      queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
        if (!old?.content) return old
        const newContent = structuredClone(old.content)
        const section = newContent.sections.find((s: any) => s.label === sectionLabel)
        if (section?.skill_rows) {
          section.skill_rows = section.skill_rows.filter((_: any, i: number) => i !== rowIndex)
        }
        return { ...old, content: newContent }
      })
    }
  }

  const editable =
    sectionIndex !== undefined && rowIndex !== undefined && sectionLabel !== undefined

  return (
    <div className="mb-1 text-sm text-ink dark:text-[#ececec] flex items-center gap-1 group">
      {editable ? (
        <>
          <span className="font-semibold">
            <RichEditableField
              value={row.category}
              spans={[]}
              onSave={(v) => {
                updateCache("category", v)
                if (sectionLabel && rowIndex !== undefined) {
                  queueEdit({
                    op: "update_skill_row",
                    section_label: sectionLabel,
                    skill_row_index: rowIndex,
                    category: v,
                  })
                }
              }}
            />
          </span>
          <span>:</span>
          <RichEditableField
            value={row.items}
            spans={[]}
            onSave={(v) => {
              updateCache("items", v)
              if (sectionLabel && rowIndex !== undefined) {
                queueEdit({
                  op: "update_skill_row",
                  section_label: sectionLabel,
                  skill_row_index: rowIndex,
                  items: v,
                })
              }
            }}
          />
        </>
      ) : (
        <>
          <span className="font-semibold">{row.category}:</span> {row.items}
        </>
      )}
      {editable && viewMode !== "diff" && <DeleteButton onClick={handleDelete} />}
    </div>
  )
}
