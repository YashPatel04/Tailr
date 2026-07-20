"use client"

import { Search, CheckCircle, Sparkles, Pencil, Check } from "lucide-react"
import type { ChatMessage } from "@/types"

export const PHASE_CONFIG: Record<string, { icon: typeof Search; text: string }> = {
  researching: { icon: Search, text: "Researching..." },
  research_done: { icon: CheckCircle, text: "Research done" },
  thinking: { icon: Sparkles, text: "Thinking..." },
  writing: { icon: Pencil, text: "Writing changes..." },
  done: { icon: Check, text: "Done" },
}

interface ProgressMessageProps {
  message?: ChatMessage
  phase?: string
  text?: string
}

export function ProgressMessage({ message, phase: phaseProp, text: textProp }: ProgressMessageProps) {
  let phase = ""
  let displayText = ""

  if (message) {
    const metadata = message.metadata_json as Record<string, unknown> | null
    phase = (metadata?.phase as string) || ""
    displayText = message.content
  } else if (phaseProp) {
    phase = phaseProp
    displayText = textProp || PHASE_CONFIG[phaseProp]?.text || phaseProp
  }

  if (!phase || !PHASE_CONFIG[phase]) {
    return (
      <div className="flex justify-start">
        <div className="bg-[#f7f7f8] dark:bg-[#2b2b2b] text-ink dark:text-[#ececec] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[90%] text-sm">
          {displayText || (message?.content ?? "")}
        </div>
      </div>
    )
  }

  const { icon: Icon, text } = PHASE_CONFIG[phase]
  const isActive = phase !== "done" && phase !== "research_done"

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 bg-[#f7f7f8] dark:bg-[#2b2b2b] text-ink dark:text-[#ececec] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[90%]">
        <Icon
          size={14}
          className={isActive ? "text-brass animate-pulse" : "text-slate dark:text-[#8e8e8e]"}
        />
        <span className="text-sm text-slate dark:text-[#8e8e8e]">{text}</span>
      </div>
    </div>
  )
}
