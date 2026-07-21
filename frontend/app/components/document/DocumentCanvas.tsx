"use client"

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { ResumeContent } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { useSessionDocument } from "@/hooks/queries"
import { queueEdit } from "@/lib/editQueue"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DocumentEmptyState } from "./DocumentEmptyState"
import { DocumentTopBar } from "./DocumentTopBar"
import { FloatingToolbar } from "./FloatingToolbar"
import { DocumentTabs } from "./DocumentTabs"
import { SectionRenderer } from "./SectionRenderer"
import { SortableSection } from "./SortableSection"
import { ResumeHeader } from "./ResumeHeader"
import { DiffView } from "@/components/diff/DiffView"
import { toast } from "@/components/ui/Toaster"

export function DocumentCanvas() {
  const { activeSessionId, activeDocType, viewMode, latestDiff } = useSessionStore()
  const { data: doc } = useSessionDocument(activeSessionId!, activeDocType)
  const queryClient = useQueryClient()

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (viewMode === "diff") return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const content = doc?.content as ResumeContent | undefined
    if (!content) return

    const oldIndex = content.sections.findIndex((s) => s.id === active.id)
    const newIndex = content.sections.findIndex((s) => s.id === over.id)

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    queueEdit({ op: "move_section", from_index: oldIndex, to_index: newIndex })
  }, [doc, viewMode])

  const handleBottomInsert = (action: string) => {
    if (!activeSessionId) return
    const content = doc?.content as ResumeContent | undefined
    const sectionCount = content?.sections?.length || 0

    if (action === "section") {
      fetch(`/api/sessions/${activeSessionId}/document`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: [{ op: "add_section", label: "New Section", at_index: sectionCount }] }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["session-document", activeSessionId] })
        toast.success("Section added")
      }).catch(() => toast.error("Failed to add section"))
    } else if (action === "entry") {
      const lastSectionIdx = sectionCount - 1
      if (lastSectionIdx < 0) { toast.error("Add a section first"); return }
      const entriesCount = content?.sections?.[lastSectionIdx]?.entries?.length || 0
      fetch(`/api/sessions/${activeSessionId}/document`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: [{ op: "add_entry", section_index: lastSectionIdx, entry_index: entriesCount, entry: { title: "New Entry", bullets: [] } }],
        }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["session-document", activeSessionId] })
        toast.success("Entry added")
      }).catch(() => toast.error("Failed to add entry"))
    } else if (action === "skill") {
      const lastSectionIdx = sectionCount - 1
      if (lastSectionIdx < 0) { toast.error("Add a section first"); return }
      fetch(`/api/sessions/${activeSessionId}/document`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: [{ op: "update_skill_row", section_index: lastSectionIdx, row_index: content?.sections?.[lastSectionIdx]?.skill_rows?.length || 0, row: { category: "New Skill", items: "items" } }],
        }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["session-document", activeSessionId] })
        toast.success("Skill row added")
      }).catch(() => toast.error("Failed to add skill row"))
    }
  }

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

  const innerContent = hasContent ? (
    viewMode === "diff" && latestDiff ? (
      <DiffView diff={latestDiff} content={content} document={documentModel}>
        {content ? renderNewChildren() : renderLegacyChildren()}
      </DiffView>
    ) : (
      content ? renderNewChildren() : renderLegacyChildren()
    )
  ) : (
    <p className="text-[#5f6368] dark:text-[#9aa0a6] text-center mt-16 text-sm">
      No document content yet. Start a chat to tailor your resume.
    </p>
  )

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-canvas dark:bg-[#212121]">
      <div className="mx-auto flex items-start min-h-full" style={{ maxWidth: "880px" }}>
        <div className="w-[820px] flex-shrink-0 py-10 px-8 group/page">
          <DocumentTopBar />
          <DocumentTabs />
          <div className="mt-4 relative">
            {innerContent}
          </div>

          {/* Bottom inline insert */}
          {hasContent && viewMode !== "diff" && (
            <BottomInsert onInsert={handleBottomInsert} />
          )}
        </div>

        {/* Floating toolbar */}
        {hasContent && viewMode !== "diff" && (
          <div className="sticky top-4 ml-4 z-50 flex-shrink-0">
            <FloatingToolbar />
          </div>
        )}
      </div>
    </div>
  )
}

function BottomInsert({ onInsert }: { onInsert: (action: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center justify-center pt-7 pb-2 opacity-0 group-hover/page:opacity-100 transition-opacity duration-200 relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-dashed border-[#dadce0] dark:border-[#5f6368] bg-transparent text-[#5f6368] dark:text-[#9aa0a6] text-xs hover:border-[#1a73e8] dark:hover:border-[#8ab4f8] hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] hover:bg-[#d3e3fd] dark:hover:bg-[#394457] transition-all"
      >
        <span className="text-base font-medium leading-none">+</span> Insert
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 z-20 min-w-[180px] bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368] rounded-lg shadow-lg py-1.5">
            {[
              { id: "section", label: "Add Section", icon: "§", color: "text-[#1a73e8] bg-[#e8f0fe]" },
              { id: "entry", label: "Add Entry", icon: "E", color: "text-[#188038] bg-[#e6f4ea]" },
              { id: "skill", label: "Add Skill Row", icon: "#", color: "text-[#c5221f] bg-[#fce8e6]" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { onInsert(item.id); setOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3.5 py-1.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-left transition-colors"
              >
                <span className={`w-[22px] h-[22px] flex items-center justify-center rounded text-xs font-bold flex-shrink-0 ${item.color}`}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
