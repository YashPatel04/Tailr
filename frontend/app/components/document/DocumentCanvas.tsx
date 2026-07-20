"use client"

import type { ResumeContent } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { useSessionDocument } from "@/hooks/queries"
import { DocumentEmptyState } from "./DocumentEmptyState"
import { DocumentToolbar } from "./DocumentToolbar"
import { DocumentTabs } from "./DocumentTabs"
import { SectionRenderer } from "./SectionRenderer"
import { DiffView } from "@/components/diff/DiffView"

export function DocumentCanvas() {
  const { activeSessionId, activeDocType, viewMode, latestDiff } = useSessionStore()
  const { data: doc } = useSessionDocument(activeSessionId!, activeDocType)

  if (!activeSessionId) {
    return (
      <div className="flex-1 h-screen overflow-y-auto bg-canvas dark:bg-[#212121]">
        <DocumentEmptyState />
      </div>
    )
  }

  const content = doc?.content as ResumeContent | undefined
  const documentModel = doc?.document_model_json

  const renderNewChildren = () =>
    content?.sections.map((section) => (
      <SectionRenderer key={section.id} section={section} />
    ))

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
