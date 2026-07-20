"use client"

import { useEffect, useRef } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { useSessionSSE } from "@/hooks/useSessionSSE"
import { ChatRailEmptyState } from "./ChatRailEmptyState"
import { ChatRailHeader } from "./ChatRailHeader"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInput } from "./ChatInput"
import { SessionSetupForm } from "./SessionSetupForm"

export function ChatRail({ width }: { width: number }) {
  const { activeSessionId, setupOpen, setSetupOpen } = useSessionStore()
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

  if (setupOpen) {
    return (
      <section ref={railRef} className="flex flex-col h-screen border-l border-muted bg-paper dark:bg-[#212121] overflow-y-auto">
        <div className="px-4 py-3 border-b border-muted flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-ink dark:text-[#ececec]">New session</h3>
        </div>
        <SessionSetupForm />
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
      <ChatInput onSend={sendMessage} />
    </section>
  )
}

