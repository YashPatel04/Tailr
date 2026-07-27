"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSessionStore } from "@/stores/sessionStore"
import { useSessionDocument } from "@/hooks/queries"
import { toast } from "@/components/ui/Toaster"
import type { ResumeContent } from "@/types"
import { applyFormatAction } from "@/lib/formatTarget"
import { undo, redo, getUndoCount, getRedoCount } from "@/lib/editQueue"

export function FloatingToolbar() {
  const { activeSessionId, activeDocType } = useSessionStore()
  const { data: doc } = useSessionDocument(activeSessionId!, activeDocType)
  const queryClient = useQueryClient()
  const [insertOpen, setInsertOpen] = useState(false)
  const insertRef = useRef<HTMLDivElement>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const refreshHistoryState = useCallback(() => {
    setCanUndo(getUndoCount() > 0)
    setCanRedo(getRedoCount() > 0)
  }, [])

  useEffect(() => {
    refreshHistoryState()
    const interval = setInterval(refreshHistoryState, 500)
    return () => clearInterval(interval)
  }, [refreshHistoryState])

  const handleInsert = (action: string) => {
    setInsertOpen(false)
    const content = doc?.content as ResumeContent | undefined
    const sectionCount = content?.sections?.length || 0

    switch (action) {
      case "section":
        fetch(`/api/sessions/${activeSessionId}/document`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operations: [{ op: "add_section", label: "New Section", at_index: sectionCount }],
          }),
        })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["session-document", activeSessionId] })
            toast.success("Section added")
          })
          .catch(() => toast.error("Failed to add section"))
        break
      case "entry": {
        const lastSectionIdx = sectionCount - 1
        if (lastSectionIdx < 0) {
          toast.error("Add a section first")
          break
        }
        const entriesCount = content?.sections?.[lastSectionIdx]?.entries?.length || 0
        fetch(`/api/sessions/${activeSessionId}/document`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operations: [
              {
                op: "add_entry",
                section_index: lastSectionIdx,
                entry_index: entriesCount,
                entry: { title: "New Entry", bullets: [] },
              },
            ],
          }),
        })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["session-document", activeSessionId] })
            toast.success("Entry added")
          })
          .catch(() => toast.error("Failed to add entry"))
        break
      }
      case "bullet": {
        const lastSection = content?.sections?.[sectionCount - 1]
        const lastEntryIdx = (lastSection?.entries?.length || 0) - 1
        if (!lastSection || lastEntryIdx < 0) {
          toast.error("Add an entry first")
          break
        }
        fetch(`/api/sessions/${activeSessionId}/document`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operations: [
              {
                op: "add_bullet",
                section_index: sectionCount - 1,
                entry_index: lastEntryIdx,
                bullet: { text: "New bullet point" },
              },
            ],
          }),
        })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["session-document", activeSessionId] })
            toast.success("Bullet added")
          })
          .catch(() => toast.error("Failed to add bullet"))
        break
      }
      default:
        break
    }
  }

  return (
    <div className="flex flex-row items-center gap-[2px] rounded-[10px] z-50 p-[5px] backdrop-blur-xl bg-[rgba(247,247,248,0.85)] dark:bg-[rgba(43,44,54,0.8)] border border-[rgba(229,229,229,0.6)] dark:border-[rgba(142,142,142,0.15)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      {/* Insert */}
      <div className="relative" ref={insertRef}>
        <button
          onClick={() => setInsertOpen(!insertOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[#5f6368] dark:text-[#9aa0a6]"
          title="Insert"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        {insertOpen && (
          <div className="absolute top-full mt-1 left-0 min-w-[210px] bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368] rounded-lg shadow-lg py-1.5 z-[60]">
            {[
              {
                id: "section",
                label: "Add Section",
                kbd: "^⇧S",
                color: "text-[#1a73e8] bg-[#e8f0fe]",
              },
              {
                id: "entry",
                label: "Add Subsection",
                kbd: "^⇧E",
                color: "text-[#188038] bg-[#e6f4ea]",
              },
              {
                id: "bullet",
                label: "Add Bullet",
                kbd: "^⇧B",
                color: "text-[#e37400] bg-[#fef7e0]",
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleInsert(item.id)}
                className="flex items-center gap-2.5 w-full px-3.5 py-1.5 text-[13px] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] text-left transition-colors"
              >
                <span
                  className={`w-[22px] h-[22px] flex items-center justify-center rounded text-xs font-bold flex-shrink-0 ${item.color}`}
                >
                  {item.id === "section" ? "§" : item.id === "entry" ? "E" : "·"}
                </span>
                {item.label}
                <span className="ml-auto text-[10px] text-[#9aa0a6] dark:text-[#80868b] font-medium">
                  {item.kbd}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-[#dadce0] dark:bg-[#5f6368] mx-[2px]" />

      {/* Bold — wires to active RichEditableField */}
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          applyFormatAction("bold")
        }}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[#5f6368] dark:text-[#9aa0a6]"
        title="Bold (Ctrl+B)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 19V5h4a4 4 0 010 8 4 4 0 010 6ZM11 8.5h2.5a2 2 0 010 3H11ZM11 13h2.5a2 2 0 010 3H11Z" />
        </svg>
      </button>
      {/* Italic */}
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          applyFormatAction("italic")
        }}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[#5f6368] dark:text-[#9aa0a6]"
        title="Italic (Ctrl+I)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 5L14 5L9 19L5 19Z" />
        </svg>
      </button>
      {/* Underline */}
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          applyFormatAction("underline")
        }}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[#5f6368] dark:text-[#9aa0a6]"
        title="Underline (Ctrl+U)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 3v7a6 6 0 0012 0V3h2v7a8 8 0 01-16 0V3ZM4 21h16v2H4Z" />
        </svg>
      </button>
      {/* Link */}
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          applyFormatAction("link")
        }}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[#5f6368] dark:text-[#9aa0a6]"
        title="Link (Ctrl+K)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-[#dadce0] dark:bg-[#5f6368] mx-[2px]" />

      {/* Undo */}
      <button
        onClick={() => {
          undo().then(refreshHistoryState)
        }}
        disabled={!canUndo}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[#5f6368] dark:text-[#9aa0a6] disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
        </svg>
      </button>
      {/* Redo */}
      <button
        onClick={() => {
          redo().then(refreshHistoryState)
        }}
        disabled={!canRedo}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[#5f6368] dark:text-[#9aa0a6] disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
        </svg>
      </button>
    </div>
  )
}
