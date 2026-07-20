"use client"

import { clsx } from "clsx"
import type { ChatMessage as ChatMessageType } from "@/types"
import { ProgressMessage } from "./ProgressMessage"

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const metadata = message.metadata_json

  if (metadata && (metadata as Record<string, unknown>).phase) {
    return <ProgressMessage message={message} />
  }

  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-[#f4f4f4] dark:bg-[#40414f] text-ink dark:text-[#ececec] rounded-br-md"
            : "bg-[#f7f7f8] dark:bg-[#2b2b2b] text-ink dark:text-[#ececec] rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
