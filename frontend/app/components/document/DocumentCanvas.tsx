"use client"

import { useCallback } from "react"
import type { ResumeContent } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { useSessionDocument } from "@/hooks/queries"
import { queueEdit } from "@/lib/editQueue"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DocumentEmptyState } from "./DocumentEmptyState"
import { DocumentToolbar } from "./DocumentToolbar"
import { DocumentTabs } from "./DocumentTabs"
import { SectionRenderer } from "./SectionRenderer"
import { SortableSection } from "./SortableSection"
import { ResumeHeader } from "./ResumeHeader"
import { DiffView } from "@/components/diff/DiffView"

export function DocumentCanvas() {
  const { activeSessionId, activeDocType, viewMode, latestDiff } = useSessionStore()
  const { data: doc } = useSessionDocument(activeSessionId!, activeDocType)

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const content = doc?.content as ResumeContent | undefined
    if (!content) return

    const oldIndex = content.sections.findIndex((s) => s.id === active.id)
    const newIndex = content.sections.findIndex((s) => s.id === over.id)

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    queueEdit({
      op: "move_section",
      from_index: oldIndex,
      to_index: newIndex,
    })
  }, [doc])

  if (!activeSessionId) {
    return (
      <div className="flex-1 h-screen overflow-y-auto bg-canvas dark:bg-[#212121]">
        <DocumentEmptyState />
      </div>
    )
  }

  const content = doc?.content as ResumeContent | undefined
  const documentModel = doc?.documentModel

  const renderNewChildren = () =>
    content && (
      <>
        {content.basics && <ResumeHeader basics={content.basics} />}
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={content.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {content.sections.map((section, i) => (
              <SortableSection key={section.id} section={section} index={i} />
            ))}
          </SortableContext>
        </DndContext>
      </>
    )

  const renderLegacyChildren = () =>
    documentModel?.children?.map((child: any) => (
      <SectionRenderer key={child.id} node={child} texSource={child.tex_source || ""} />
    ))

  const hasContent = content ? content.sections.length > 0 : (documentModel && documentModel.children)

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-canvas dark:bg-[#212121]">
      <div className="mx-auto max-w-[820px] py-10 px-8 min-h-full">
        <DocumentToolbar />
        <DocumentTabs />
        <div className="mt-6">
          {hasContent ? (
            viewMode === "diff" && latestDiff ? (
              <DiffView diff={latestDiff} content={content} document={documentModel}>
                {content ? renderNewChildren() : renderLegacyChildren()}
              </DiffView>
            ) : (
              content ? renderNewChildren() : renderLegacyChildren()
            )
          ) : (
            <p className="text-slate dark:text-[#8e8e8e] text-center mt-16 text-sm">
              No document content yet. Start a chat to tailor your resume.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
