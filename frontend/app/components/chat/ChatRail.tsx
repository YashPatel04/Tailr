"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { useLayoutStore } from "@/stores/layout"
import { useSessionMessages } from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { ChatRailEmptyState } from "./ChatRailEmptyState"
import { ChatRailHeader } from "./ChatRailHeader"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInput } from "./ChatInput"
import { JDSetupForm } from "./JDSetupForm"
import { ModeBar } from "./ModeBar"
import { MessageSquare, Lock } from "lucide-react"

const PEEK_DELAY = 300
const PEEK_MAX_MESSAGES = 4

export function ChatRail({ width }: { width: number }) {
  const { activeSessionId, setupOpen, setSetupOpen, activeMode } = useSessionStore()
  const { chatRailCollapsed, setChatRailCollapsed, chatRailPeeking, setChatRailPeeking } = useLayoutStore()
  const storeSendMessage = useSessionStore((s) => s.sendMessage)
  const queryClient = useQueryClient()
  const sendMessage = useCallback(
    (content: string) => storeSendMessage(content, queryClient),
    [storeSendMessage, queryClient]
  )
  const { data: messages } = useSessionMessages(activeSessionId ?? "")
  const railRef = useRef<HTMLElement>(null)
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [peekFading, setPeekFading] = useState(false)
  const peekMessages = messages?.slice(-PEEK_MAX_MESSAGES) ?? []

  const clearPeekTimeout = useCallback(() => {
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current)
      peekTimeoutRef.current = null
    }
  }, [])

  const handleCollapsedMouseEnter = useCallback(() => {
    if (!chatRailCollapsed) return
    clearPeekTimeout()
    peekTimeoutRef.current = setTimeout(() => {
      setChatRailPeeking(true)
    }, PEEK_DELAY)
  }, [chatRailCollapsed, clearPeekTimeout, setChatRailPeeking])

  const handleCollapsedMouseLeave = useCallback(() => {
    clearPeekTimeout()
    if (chatRailPeeking) {
      setChatRailPeeking(false)
    }
  }, [chatRailPeeking, clearPeekTimeout, setChatRailPeeking])

  const handleExpand = useCallback(() => {
    clearPeekTimeout()
    setChatRailCollapsed(false)
    if (chatRailPeeking) {
      setPeekFading(true)
    }
  }, [clearPeekTimeout, setChatRailCollapsed, chatRailPeeking])

  useEffect(() => {
    return () => clearPeekTimeout()
  }, [clearPeekTimeout])

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

  // Collapsed / peeking state
  if (chatRailCollapsed) {
    return (
      <section
        ref={railRef}
        className="flex flex-col h-screen border-l border-muted bg-paper dark:bg-[#212121] relative overflow-hidden"
        onMouseEnter={handleCollapsedMouseEnter}
        onMouseLeave={handleCollapsedMouseLeave}
      >
        {/* Collapsed toolbar strip */}
        <div
          className={`flex flex-col items-center h-full transition-opacity duration-150 ${
            chatRailPeeking ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
          }`}
        >
          <div className="pt-3 pb-2 flex-shrink-0">
            <button
              onClick={handleExpand}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] transition-colors relative"
              title="Expand chat"
            >
              <MessageSquare size={18} />
            </button>
          </div>

          <div className="flex-1" />

          <div className="pb-4 flex flex-col items-center gap-1.5 flex-shrink-0">
            <div
              className={`w-2 h-2 rounded-full ${
                activeMode === "plan" ? "bg-purple-500" : "bg-brass"
              }`}
            />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate dark:text-[#8e8e8e]">
              {activeMode === "plan" ? "Plan" : "Edit"}
            </span>
          </div>
        </div>

        {/* Peek overlay */}
        <div
          className={`flex flex-col h-full transition-opacity duration-150 ${
            chatRailPeeking ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-muted flex-shrink-0">
            <span className="text-sm font-semibold text-ink dark:text-[#ececec]">Chat</span>
            <button
              onClick={handleExpand}
              className="flex items-center justify-center w-6 h-6 rounded text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] transition-colors"
              title="Lock open"
            >
              <Lock size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden px-3 py-3 space-y-2">
            {peekMessages.length > 0 ? (
              peekMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`px-2.5 py-1.5 rounded-lg text-xs leading-relaxed max-w-[90%] ${
                    msg.role === "user"
                      ? "bg-message-user dark:bg-[#2b2b2b] text-ink dark:text-[#ececec] ml-auto rounded-br-sm"
                      : "bg-message-assistant dark:bg-[#2a2a2a] text-ink dark:text-[#ececec] rounded-bl-sm"
                  }`}
                >
                  <span className="line-clamp-2">{msg.content}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate dark:text-[#8e8e8e] text-center pt-8">
                No messages yet
              </div>
            )}
          </div>

          <div className="px-3 pb-3 flex-shrink-0">
            <div className="px-3 py-2 border border-muted rounded-lg text-xs text-slate dark:text-[#8e8e8e]">
              Type a message...
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Expanded — with peek fade-out overlay if transitioning from peek
  const showPeekOverlay = peekFading && peekMessages.length > 0

  return (
    <section className="flex flex-col h-screen border-l border-muted bg-paper dark:bg-[#212121] relative">
      {setupOpen ? (
        <div ref={railRef} className="flex flex-col h-full overflow-y-auto">
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
        </div>
      ) : !activeSessionId ? (
        <ChatRailEmptyState />
      ) : (
        <>
          <ChatRailHeader />
          <ChatMessageList />
          <ModeBar />
          <ChatInput onSend={sendMessage} />
        </>
      )}

      {/* Peek fade-out overlay — stays on top during width transition */}
      {showPeekOverlay && (
        <div
          className="absolute inset-0 flex flex-col bg-paper dark:bg-[#212121] pointer-events-none transition-opacity duration-200 opacity-0"
          onAnimationEnd={() => setPeekFading(false)}
          style={{ animation: "peek-fade-out 220ms ease-out forwards" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-muted flex-shrink-0">
            <span className="text-sm font-semibold text-ink dark:text-[#ececec]">Chat</span>
            <div className="w-6 h-6" />
          </div>
          <div className="flex-1 overflow-hidden px-3 py-3 space-y-2">
            {peekMessages.map((msg) => (
              <div
                key={msg.id}
                className={`px-2.5 py-1.5 rounded-lg text-xs leading-relaxed max-w-[90%] ${
                  msg.role === "user"
                    ? "bg-message-user dark:bg-[#2b2b2b] text-ink dark:text-[#ececec] ml-auto rounded-br-sm"
                    : "bg-message-assistant dark:bg-[#2a2a2a] text-ink dark:text-[#ececec] rounded-bl-sm"
                }`}
              >
                <span className="line-clamp-2">{msg.content}</span>
              </div>
            ))}
          </div>
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="px-3 py-2 border border-muted rounded-lg text-xs text-slate dark:text-[#8e8e8e]">
              Type a message...
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
