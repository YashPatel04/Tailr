"use client"

import { useState, useRef, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSessionStore } from "@/stores/sessionStore"
import { useSessionDocument } from "@/hooks/queries"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import type { ResumeContent } from "@/types"

export function FloatingToolbar() {
  const { activeSessionId, activeDocType, viewMode, setViewMode, pendingProposal } = useSessionStore()
  const { data: doc } = useSessionDocument(activeSessionId!, activeDocType)
  const queryClient = useQueryClient()
  const [insertOpen, setInsertOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const insertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (insertRef.current && !insertRef.current.contains(e.target as Node)) {
        setInsertOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleExport = async (format: string) => {
    if (!activeSessionId) return
    setExportOpen(false)
    try {
      const blob = await apiRequest<Blob>("GET", `/api/sessions/${activeSessionId}/export?format=${format}`, undefined, { rawResponse: true })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resume.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format}`)
    } catch (err: any) {
      toast.error(err.message || "Export failed")
    }
  }

  const handleInsert = (action: string) => {
    setInsertOpen(false)
    const content = doc?.content as ResumeContent | undefined
    const sectionCount = content?.sections?.length || 0

    switch (action) {
      case "section":
        fetch(`/api/sessions/${activeSessionId}/document`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: [{ op: "add_section", label: "New Section", at_index: sectionCount }] }),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["session-document", activeSessionId] })
          toast.success("Section added")
        }).catch((e) => toast.error("Failed to add section"))
        break
      case "entry": {
        const lastSectionIdx = sectionCount - 1
        if (lastSectionIdx < 0) { toast.error("Add a section first"); break }
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
        }).catch((e) => toast.error("Failed to add entry"))
        break
      }
      case "bullet": {
        const lastSection = content?.sections?.[sectionCount - 1]
        const lastEntryIdx = (lastSection?.entries?.length || 0) - 1
        if (!lastSection || lastEntryIdx < 0) { toast.error("Add an entry first"); break }
        fetch(`/api/sessions/${activeSessionId}/document`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operations: [{ op: "add_bullet", section_index: sectionCount - 1, entry_index: lastEntryIdx, bullet: { text: "New bullet point" } }],
          }),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["session-document", activeSessionId] })
          toast.success("Bullet added")
        }).catch((e) => toast.error("Failed to add bullet"))
        break
      }
      default:
        break
    }
  }

  return (
    <div className="sticky top-6 ml-4 bg-white dark:bg-[#292a2d] border border-[#dadce0] dark:border-[#5f6368] rounded-xl shadow-md p-1.5 flex flex-col gap-0.5 items-center z-50 w-[44px] flex-shrink-0">
      {/* Insert */}
      <div className="relative" ref={insertRef}>
        <button
          onClick={() => setInsertOpen(!insertOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[#5f6368] dark:text-[#9aa0a6]"
          title="Insert"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        {insertOpen && (
          <div className="absolute top-0 right-full mr-2 min-w-[210px] bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368] rounded-lg shadow-lg py-1.5 z-[60]">
            {[
              { id: "section", label: "Add Section", kbd: "^⇧S", color: "text-[#1a73e8] bg-[#e8f0fe]" },
              { id: "entry", label: "Add Entry", kbd: "^⇧E", color: "text-[#188038] bg-[#e6f4ea]" },
              { id: "bullet", label: "Add Bullet", kbd: "^⇧B", color: "text-[#e37400] bg-[#fef7e0]" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleInsert(item.id)}
                className="flex items-center gap-2.5 w-full px-3.5 py-1.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-left transition-colors"
              >
                <span className={`w-[22px] h-[22px] flex items-center justify-center rounded text-xs font-bold flex-shrink-0 ${item.color}`}>
                  {item.id === "section" ? "§" : item.id === "entry" ? "E" : "·"}
                </span>
                {item.label}
                <span className="ml-auto text-[10px] text-[#9aa0a6] dark:text-[#80868b] font-medium">{item.kbd}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-5 h-px bg-[#dadce0] dark:bg-[#5f6368] my-1" />

      {/* Bold */}
      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[#5f6368] dark:text-[#9aa0a6]" title="Bold (Ctrl+B)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 19V5h4a4 4 0 010 8 4 4 0 010 6ZM11 8.5h2.5a2 2 0 010 3H11ZM11 13h2.5a2 2 0 010 3H11Z"/></svg>
      </button>
      {/* Italic */}
      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[#5f6368] dark:text-[#9aa0a6]" title="Italic (Ctrl+I)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 5L14 5L9 19L5 19Z"/></svg>
      </button>
      {/* Underline */}
      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[#5f6368] dark:text-[#9aa0a6]" title="Underline (Ctrl+U)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3v7a6 6 0 0012 0V3h2v7a8 8 0 01-16 0V3ZM4 21h16v2H4Z"/></svg>
      </button>
      {/* Link */}
      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[#5f6368] dark:text-[#9aa0a6]" title="Link (Ctrl+K)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
      </button>

      {/* Separator */}
      <div className="w-5 h-px bg-[#dadce0] dark:bg-[#5f6368] my-1" />

      {/* Undo */}
      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[#5f6368] dark:text-[#9aa0a6]" title="Undo (Ctrl+Z)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
      </button>
      {/* Redo */}
      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[#5f6368] dark:text-[#9aa0a6]" title="Redo (Ctrl+Shift+Z)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/></svg>
      </button>

      {/* Separator */}
      <div className="w-5 h-px bg-[#dadce0] dark:bg-[#5f6368] my-1" />

      {/* View: Final */}
      <button
        onClick={() => setViewMode("final")}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${viewMode === "final" ? "text-[#1a73e8] dark:text-[#8ab4f8] bg-[#d3e3fd] dark:bg-[#394457]" : "text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]"}`}
        title="Final view"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      {/* View: Diff */}
      <button
        onClick={() => setViewMode("diff")}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${viewMode === "diff" ? "text-[#1a73e8] dark:text-[#8ab4f8] bg-[#d3e3fd] dark:bg-[#394457]" : "text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]"}`}
        title="Changes"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="3" x2="6" y2="15"/><polyline points="2 11 6 15 10 11"/><line x1="18" y1="21" x2="18" y2="9"/><polyline points="14 13 18 9 22 13"/></svg>
      </button>

      {/* Separator */}
      <div className="w-5 h-px bg-[#dadce0] dark:bg-[#5f6368] my-1" />

      {/* Export */}
      <div className="relative">
        <button
          onClick={() => setExportOpen(!exportOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] transition-colors text-[#5f6368] dark:text-[#9aa0a6]"
          title="Export"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        {exportOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
            <div className="absolute right-full mr-2 top-0 min-w-[100px] bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368] rounded-lg shadow-lg py-1 z-[60]">
              {["pdf", "docx", "txt", "tex"].map((f) => (
                <button
                  key={f}
                  onClick={() => handleExport(f)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] uppercase transition-colors"
                >
                  .{f}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
