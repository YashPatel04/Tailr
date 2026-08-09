"use client"
import React, { useState } from "react"
import type { ResumeContent } from "@/types"

interface ImportReviewProps {
  content: ResumeContent
  originalTex: string
  generatedTex: string
  onAccept: (content: ResumeContent) => void
  onReject: () => void
}

export function ImportReview({
  content,
  originalTex,
  generatedTex,
  onAccept,
  onReject,
}: ImportReviewProps) {
  const [showOriginal, setShowOriginal] = useState(true)
  const texSource = showOriginal ? originalTex : generatedTex

  const entryCount = content.sections.reduce((sum, s) => sum + (s.entries?.length || 0), 0)
  const skillRowCount = content.sections.reduce((sum, s) => sum + (s.skill_rows?.length || 0), 0)

  return (
    <div className="flex flex-col h-full bg-paper text-ink">
      <div className="flex items-center justify-between px-5 py-3 border-b border-muted">
        <h2 className="text-lg font-semibold">Review Imported Resume</h2>
        <div className="flex items-center gap-2 text-sm text-slate">
          <span>{content.sections.length} sections</span>
          <span aria-hidden="true">&middot;</span>
          <span>{entryCount} entries</span>
          <span aria-hidden="true">&middot;</span>
          <span>{skillRowCount} skill rows</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-2 border-b border-muted bg-slate/5">
        <button
          onClick={() => setShowOriginal(true)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            showOriginal
              ? "bg-[#10a37f] text-white"
              : "text-slate hover:text-ink bg-slate/10 hover:bg-slate/20"
          }`}
        >
          Original
        </button>
        <button
          onClick={() => setShowOriginal(false)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            !showOriginal
              ? "bg-[#10a37f] text-white"
              : "text-slate hover:text-ink bg-slate/10 hover:bg-slate/20"
          }`}
        >
          Generated
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap break-words bg-slate/5 rounded-lg p-4 border border-muted max-h-full overflow-auto">
          {texSource}
        </pre>
      </div>

      <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-muted bg-slate/5">
        <button
          onClick={onReject}
          className="px-4 py-2 text-sm rounded-lg border border-muted text-slate hover:text-ink hover:bg-slate/10 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={() => onAccept(content)}
          className="px-4 py-2 text-sm rounded-lg bg-[#10a37f] text-white hover:bg-[#0e9273] transition-colors"
        >
          Accept &amp; Store
        </button>
      </div>
    </div>
  )
}
