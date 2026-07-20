"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ArrowUp } from "lucide-react"
import { useSessionStore } from "@/stores/sessionStore"

interface ChatInputProps {
  onSend: (content: string) => void
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)
  const { isStreaming, setupOpen } = useSessionStore()

  useEffect(() => {
    if (!isStreaming) sendingRef.current = false
  }, [isStreaming])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = "auto"
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px"
    }
  }, [])

  const handleSubmit = () => {
    if (!text.trim() || isStreaming || sendingRef.current) return
    sendingRef.current = true
    onSend(text.trim())
    setText("")
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="px-3 py-3 border-t border-muted flex-shrink-0">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={setupOpen ? "Fill in session details above..." : "Describe the changes you want..."}
          rows={1}
          disabled={isStreaming}
          className="chat-textarea w-full resize-none rounded-xl border border-muted bg-paper dark:bg-[#2b2b2b] px-4 py-3 pr-12 text-sm text-ink dark:text-[#ececec] placeholder:text-[#8e8e8e] outline-none focus:border-brass focus:ring-1 focus:ring-brass/30 disabled:opacity-50 overflow-y-auto"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isStreaming}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: text.trim() && !isStreaming ? "#10a37f" : "#8e8e8e" }}
          aria-label="Send"
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </div>
  )
}
