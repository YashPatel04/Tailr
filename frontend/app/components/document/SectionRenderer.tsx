"use client"

import { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Section } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { EditableField } from "./EditableField"
import { EntryRenderer } from "./EntryRenderer"
import { SortableEntry } from "./SortableEntry"
import { BulletRenderer } from "./BulletRenderer"
import { SkillRowRenderer } from "./SkillRowRenderer"
import { FormattedText } from "./FormattedText"
import { OpaqueNodeRenderer } from "./OpaqueNodeRenderer"
import { RawTexPanel } from "./RawTexPanel"
import { useDiff } from "@/components/diff/DiffView"
import { clsx } from "clsx"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

interface SectionRendererProps {
  node?: any
  section?: Section
  texSource?: string | null
  sectionIndex?: number
}

export function SectionRenderer({ node, section, texSource, sectionIndex }: SectionRendererProps) {
  const [showSource, setShowSource] = useState(false)
  const contextDiff = useDiff(section ? section.id : node?.id)
  const effectiveDiff = contextDiff
  const queryClient = useQueryClient()
  const viewMode = useSessionStore((s) => s.viewMode)

  const handleEntryDragEnd = useCallback((event: DragEndEvent) => {
    if (viewMode === "diff" || !section) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = section.entries.findIndex((e) => e.id === active.id)
    const newIndex = section.entries.findIndex((e) => e.id === over.id)

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    queueEdit({
      op: "move_entry",
      section_label: section.label,
      from_index: oldIndex,
      to_index: newIndex,
    })
  }, [section, viewMode])

  const updateSectionLabel = (newLabel: string) => {
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    if (!sessionId || sectionIndex === undefined) return
    queryClient.setQueryData(
      ["sessions", sessionId, "document", docType],
      (old: any) => {
        if (!old?.content) return old
        const newContent = structuredClone(old.content)
        if (newContent.sections[sectionIndex]) {
          newContent.sections[sectionIndex].label = newLabel
        }
        return { ...old, content: newContent }
      }
    )
  }

  const deleteSection = () => {
    if (!section || sectionIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    queueEdit({ op: "delete_section", section_label: section.label })
    if (sessionId) {
      queryClient.setQueryData(
        ["sessions", sessionId, "document", docType],
        (old: any) => {
          if (!old?.content) return old
          const newContent = structuredClone(old.content)
          newContent.sections = newContent.sections.filter((_: any, i: number) => i !== sectionIndex)
          return { ...old, content: newContent }
        }
      )
    }
  }

  if (section) {
    return (
      <section className={clsx("mb-8 group/section", {
        "bg-green-50 dark:bg-green-900/20 rounded-lg p-3 -mx-3": effectiveDiff === "added",
        "bg-red-50 dark:bg-red-900/20 rounded-lg p-3 -mx-3": effectiveDiff === "removed",
      })}>
        {section.label && (
          <h2 className="text-2xl font-semibold text-ink dark:text-[#ececec] border-b border-muted pb-1 mb-3 flex items-center justify-between">
            <EditableField
              value={section.label}
              tag="span"
              onSave={updateSectionLabel}
            />
            {viewMode !== "diff" && sectionIndex !== undefined && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteSection() }}
                className="opacity-0 group-hover/section:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded px-1 text-xs transition-opacity ml-2 shrink-0"
                title="Delete section"
              >× Delete</button>
            )}
          </h2>
        )}
        {section.entries && section.entries.length > 0 && (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleEntryDragEnd}>
            <SortableContext items={section.entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
              {section.entries.map((entry, i) => (
                <SortableEntry key={entry.id} entry={entry} sectionLabel={section.label} entryIndex={i} />
              ))}
            </SortableContext>
          </DndContext>
        )}
        {section.skill_rows?.map((row) => (
          <SkillRowRenderer key={row.id} row={row} />
        ))}
      </section>
    )
  }

  if (!node) return null

  if (node.type === "opaque") {
    return <OpaqueNodeRenderer node={node} />
  }

  return (
    <section className={clsx("mb-8", {
      "bg-green-50 dark:bg-green-900/20 rounded-lg p-3 -mx-3": effectiveDiff === "added",
      "bg-red-50 dark:bg-red-900/20 rounded-lg p-3 -mx-3": effectiveDiff === "removed",
    })}>
      {node.type === "section" && node.label && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink dark:text-[#ececec] border-b border-muted pb-1 mb-3 flex-1">
            {node.label}
          </h2>
          {texSource && (
            <button
              onClick={() => setShowSource(!showSource)}
              className="ml-2 rounded border border-brass px-2 py-0.5 text-xs text-brass hover:bg-brass/10 transition-colors font-mono"
            >
              tex
            </button>
          )}
        </div>
      )}

      {showSource && texSource ? (
        <RawTexPanel texSource={texSource} />
      ) : (
        node.children?.map((child: any) => {
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
              return <FormattedText key={child.id} text={child.text || ""} spans={child.spans || []} />
            case "section":
              return <SectionRenderer key={child.id} node={child} texSource={child.tex_source || null} />
            case "opaque":
              return <OpaqueNodeRenderer key={child.id} node={child} />
            default:
              return null
          }
        })
      )}
    </section>
  )
}
