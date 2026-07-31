"use client"

import { useEffect, useRef } from "react"
import { useSessionMessages } from "@/hooks/queries"
import { useSessionStore } from "@/stores/sessionStore"
import { ChatMessage } from "./ChatMessage"
import { ProgressMessage } from "./ProgressMessage"
import { EnhancedProposal } from "./EnhancedProposal"

export function ChatMessageList() {
  const { activeSessionId, activeDocType, isStreaming, streamingDocType, progressPhase, progressMessage, pendingProposal } = useSessionStore()
  const { data: messages } = useSessionMessages(activeSessionId!, activeDocType)
  const bottomRef = useRef<HTMLDivElement>(null)

  const showStreaming = isStreaming && streamingDocType === activeDocType
  const showProposal = !isStreaming && pendingProposal && activeDocType === "resume"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, progressMessage, pendingProposal])

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin">
      {messages?.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {showStreaming && progressPhase && (
        <ProgressMessage phase={progressPhase} text={progressMessage} />
      )}
      {showProposal && (
        <EnhancedProposal />
      )}
      <div ref={bottomRef} />
    </div>
  )
}
