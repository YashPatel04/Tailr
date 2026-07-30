"use client"

import { useEffect, useRef } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { useLayoutStore } from "@/stores/layout"
import { useSessionSSE } from "@/hooks/useSessionSSE"
import { ChatRailEmptyState } from "./ChatRailEmptyState"
import { ChatRailHeader } from "./ChatRailHeader"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInput } from "./ChatInput"
import { JDSetupForm } from "./JDSetupForm"
import { ModeBar } from "./ModeBar"

export function ChatRail({ width }: { width: number }) {
  const { activeSessionId, setupOpen, setSetupOpen, activeMode } = useSessionStore()
  const { chatRailCollapsed, setChatRailCollapsed } = useLayoutStore()
  const { sendMessage } = useSessionSSE(activeSessionId)
  const railRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!setupOpen) return
    const handler = (e: MouseEvent) => {
      if (railRef.current && !railRef.current.contains(e.target as Node)) {
        setSetupOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [setupOpen, setSetupOpen])

  if (chatRailCollapsed) {
    return (
      <section
        className="flex flex-col h-screen border-l border-muted bg-paper dark:bg-[#212121] cursor-pointer"
        onClick={() => setChatRailCollapsed(false)}
        title="Expand chat"
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate dark:text-[#8e8e8e]" />
            </svg>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              activeMode === "plan"
                ? "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                : "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
            }`}>
              {activeMode === "plan" ? "Plan" : "Edit"}
            </span>
          </div>
        </div>
      </section>
    )
  }

  if (setupOpen) {
    return (
      <section ref={railRef} className="flex flex-col h-screen border-l border-muted bg-paper dark:bg-[#212121] overflow-y-auto">
        <div className="px-4 py-3 border-b border-muted flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-ink dark:text-[#ececec]">New session</h3>
          <button
            onClick={() => setChatRailCollapsed(true)}
            className="p-1 rounded-md hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] text-slate dark:text-[#8e8e8e] transition-colors"
            title="Collapse chat"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <JDSetupForm />
      </section>
    )
  }

  if (!activeSessionId) {
    return (
      <section className="flex flex-col h-screen border-l border-muted bg-paper dark:bg-[#212121]">
        <ChatRailEmptyState />
      </section>
    )
  }

  return (
    <section className="flex flex-col h-screen border-l border-muted bg-paper dark:bg-[#212121]">
      <ChatRailHeader />
      <ChatMessageList />
      <ModeBar />
      <ChatInput onSend={sendMessage} />
    </section>
  )
}

