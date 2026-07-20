"use client"

import { useEffect, useRef } from "react"
import { useSessionMessages } from "@/hooks/queries"
import { useSessionStore } from "@/stores/sessionStore"
import { ChatMessage } from "./ChatMessage"
import { ProgressMessage } from "./ProgressMessage"
import { ProposalMessage } from "./ProposalMessage"

export function ChatMessageList() {
  const { activeSessionId, isStreaming, progressPhase, progressMessage, pendingProposal } = useSessionStore()
  const { data: messages } = useSessionMessages(activeSessionId!)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, progressMessage, pendingProposal])

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin">
      {messages?.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isStreaming && progressPhase && (
        <ProgressMessage phase={progressPhase} text={progressMessage} />
      )}
      {!isStreaming && pendingProposal && (
        <ProposalMessage />
      )}
      <div ref={bottomRef} />
    </div>
  )
}
