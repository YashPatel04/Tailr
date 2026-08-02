"use client"

import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Section } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { EditableField } from "./EditableField"
import { EntryRenderer } from "./EntryRenderer"
import { SortableEntry } from "./SortableEntry"
import { SortableSkillRow } from "./SortableSkillRow"
import { BulletRenderer } from "./BulletRenderer"
import { DeleteButton } from "./DeleteButton"
import { FormattedText } from "./FormattedText"
import { OpaqueNodeRenderer } from "./OpaqueNodeRenderer"
import { useFieldChanges } from "@/components/diff/DiffContext"
import { clsx } from "clsx"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

interface SectionRendererProps {
  node?: any
  section?: Section
  sectionIndex?: number
}

export function SectionRenderer({ node, section, sectionIndex }: SectionRendererProps) {
  const sectionDiff = useFieldChanges(section?.id ?? "")
  const queryClient = useQueryClient()
  const viewMode = useSessionStore((s) => s.viewMode)

  const diffBorder = (kind: string | undefined) =>
    kind === "added"
      ? "border-l-[3px] border-[#137333] dark:border-[#81c995]"
      : kind === "removed"
        ? "border-l-[3px] border-[#c5221f] dark:border-[#f28b82]"
        : kind === "modified"
          ? "border-l-[3px] border-[#e37400] dark:border-[#fdd663]"
          : ""

  const diffGutterColor = (kind: string | undefined) =>
    kind === "added"
      ? "text-[#137333] dark:text-[#81c995]"
      : kind === "removed"
        ? "text-[#c5221f] dark:text-[#f28b82]"
        : kind === "modified"
          ? "text-[#e37400] dark:text-[#fdd663]"
          : ""

  const diffGutterChar = (kind: string | undefined) =>
    kind === "added" ? "+" : kind === "removed" ? "\u2013" : kind === "modified" ? "~" : ""

  const handleEntryDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (viewMode === "changes" || !section) return
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = section.entries.findIndex((e) => e.id === active.id)
      const newIndex = section.entries.findIndex((e) => e.id === over.id)

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const sessionId = useSessionStore.getState().activeSessionId
      const docType = useSessionStore.getState().activeDocType
      if (sessionId && sectionIndex !== undefined) {
        queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
          if (!old?.content) return old
          const newContent = structuredClone(old.content)
          if (newContent.sections[sectionIndex]) {
            const entries = [...newContent.sections[sectionIndex].entries]
            const [moved] = entries.splice(oldIndex, 1)
            entries.splice(newIndex, 0, moved)
            newContent.sections[sectionIndex].entries = entries
          }
          return { ...old, content: newContent }
        })
      }
      queueEdit({
        op: "move_entry",
        section_label: section.label,
        from_index: oldIndex,
        to_index: newIndex,
      })
    },
    [section, viewMode, sectionIndex, queryClient]
  )

  const handleSkillRowDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (viewMode === "changes" || !section) return
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = section.skill_rows.findIndex((r) => r.id === active.id)
      const newIndex = section.skill_rows.findIndex((r) => r.id === over.id)

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const sessionId = useSessionStore.getState().activeSessionId
      const docType = useSessionStore.getState().activeDocType
      if (sessionId && sectionIndex !== undefined) {
        queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
          if (!old?.content) return old
          const newContent = structuredClone(old.content)
          if (newContent.sections[sectionIndex]) {
            const rows = [...newContent.sections[sectionIndex].skill_rows]
            const [moved] = rows.splice(oldIndex, 1)
            rows.splice(newIndex, 0, moved)
            newContent.sections[sectionIndex].skill_rows = rows
          }
          return { ...old, content: newContent }
        })
      }
      queueEdit({
        op: "move_skill_row",
        section_label: section.label,
        from_index: oldIndex,
        to_index: newIndex,
      })
    },
    [section, viewMode, sectionIndex, queryClient]
  )

  const addSkillRow = () => {
    if (!section || sectionIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    const afterIndex = section.skill_rows.length - 1
    queueEdit({
      op: "add_skill_row",
      section_label: section.label,
      after_index: afterIndex,
      category: "",
      items: "",
    })
    if (sessionId) {
      queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
        if (!old?.content) return old
        const newContent = structuredClone(old.content)
        const sec = newContent.sections[sectionIndex]
        if (sec) {
          const newId = `skill_row_${Date.now()}`
          sec.skill_rows = [...sec.skill_rows, { id: newId, category: "", items: "" }]
        }
        return { ...old, content: newContent }
      })
    }
  }

  const updateSectionLabel = (newLabel: string) => {
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    if (!sessionId || sectionIndex === undefined) return
    queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
      if (!old?.content) return old
      const newContent = structuredClone(old.content)
      if (newContent.sections[sectionIndex]) {
        newContent.sections[sectionIndex].label = newLabel
      }
      return { ...old, content: newContent }
    })
  }

  const deleteSection = () => {
    if (!section || sectionIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    queueEdit({ op: "delete_section", section_label: section.label })
    if (sessionId) {
      queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
        if (!old?.content) return old
        const newContent = structuredClone(old.content)
        newContent.sections = newContent.sections.filter((_: any, i: number) => i !== sectionIndex)
        return { ...old, content: newContent }
      })
    }
  }

  if (section) {
    return (
      <section className={clsx("mb-4 group/section relative", diffBorder(sectionDiff?.kind))}>
        {sectionDiff?.kind && (
          <span
            className={clsx(
              "absolute left-0 top-0 text-xs font-bold font-mono",
              diffGutterColor(sectionDiff.kind)
            )}
          >
            {diffGutterChar(sectionDiff.kind)}
          </span>
        )}
        {section.label && (
          <h2 className="text-2xl font-semibold text-ink dark:text-[#ececec] border-b border-muted pb-1 mb-3 flex items-center justify-between">
            <EditableField value={section.label} tag="span" onSave={updateSectionLabel} />
            {viewMode !== "changes" && sectionIndex !== undefined && (
              <DeleteButton onClick={() => deleteSection()} />
            )}
          </h2>
        )}
        {section.entries && section.entries.length > 0 && (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleEntryDragEnd}>
            <SortableContext
              items={section.entries.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.entries.map((entry, i) => (
                <SortableEntry
                  key={entry.id}
                  entry={entry}
                  sectionId={section.id}
                  sectionLabel={section.label}
                  entryIndex={i}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        {section.skill_rows && section.skill_rows.length > 0 && (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleSkillRowDragEnd}>
            <SortableContext
              items={section.skill_rows.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.skill_rows.map((row, i) => (
                <SortableSkillRow
                  key={row.id}
                  row={row}
                  sectionIndex={sectionIndex!}
                  rowIndex={i}
                  sectionLabel={section.label}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        {viewMode !== "changes" && section.skill_rows && section.skill_rows.length > 0 && (
          <button
            onClick={addSkillRow}
            className="opacity-0 group-hover/section:opacity-100 text-xs text-slate dark:text-[#8e8e8e] hover:text-brass dark:hover:text-brass px-1 py-0.5 rounded hover:bg-brass/10 transition-all"
          >
            + Add skill row
          </button>
        )}
      </section>
    )
  }

  if (!node) return null

  if (node.type === "opaque") {
    return <OpaqueNodeRenderer node={node} />
  }

  return (
    <section className={clsx("mb-4 relative", diffBorder(sectionDiff?.kind))}>
      {sectionDiff?.kind && (
        <span
          className={clsx(
            "absolute left-0 top-0 text-xs font-bold font-mono",
            diffGutterColor(sectionDiff.kind)
          )}
        >
          {diffGutterChar(sectionDiff.kind)}
        </span>
      )}
      {node.type === "section" && node.label && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink dark:text-[#ececec] border-b border-muted pb-1 mb-3 flex-1">
            {node.label}
          </h2>
        </div>
      )}

      {node.children?.map((child: any) => {
          switch (child.type) {
            case "entry":
              return <EntryRenderer key={child.id} node={child} />
            case "bullet":
              return <BulletRenderer key={child.id} node={child} />
            case "skill_row":
              return (
                <div key={child.id} className="mb-1 text-sm text-ink dark:text-[#ececec]">
                  <span className="font-semibold">{child.category} </span>
                  <FormattedText text={child.items || ""} spans={[]} />
                </div>
              )
            case "text":
              return (
                <FormattedText key={child.id} text={child.text || ""} spans={child.spans || []} />
              )
            case "section":
              return (
                <SectionRenderer key={child.id} node={child} />
              )
            case "opaque":
              return <OpaqueNodeRenderer key={child.id} node={child} />
            default:
              return null
          }
        })
      }
    </section>
  )
}
