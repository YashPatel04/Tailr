"use client"

import { useEffect, useRef } from "react"
import { useSessionMessages } from "@/hooks/queries"
import { useSessionStore } from "@/stores/sessionStore"
import { ChatMessage } from "./ChatMessage"
import { Brain, FileSearch, PenLine, CheckCircle } from "lucide-react"

const PHASE_ICONS: Record<string, React.ReactNode> = {
  researching: <FileSearch size={14} className="animate-pulse text-brass" />,
  research_done: <CheckCircle size={14} className="text-brass" />,
  thinking: <Brain size={14} className="animate-pulse text-brass" />,
  writing: <PenLine size={14} className="animate-pulse text-brass" />,
}

export function ChatMessageList() {
  const { activeSessionId, isStreaming, progressPhase, progressMessage } = useSessionStore()
  const { data: messages } = useSessionMessages(activeSessionId!)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, progressMessage])

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin">
      {messages?.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isStreaming && progressPhase && (
        <div className="flex items-center gap-2 rounded-lg bg-[#f7f7f8] dark:bg-[#2b2b2b] border-muted px-3 py-2 border border-muted animate-in fade-in">
          {PHASE_ICONS[progressPhase] || <Brain size={14} className="animate-pulse text-brass" />}
          <span className="text-xs text-slate">{progressMessage}</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
