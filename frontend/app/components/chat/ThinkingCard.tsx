"use client"

import { useState } from "react"
import { Lightbulb, ChevronDown } from "lucide-react"

interface ThinkingCardProps {
  reasoning?: string
  isActive?: boolean
}

export function ThinkingCard({ reasoning, isActive }: ThinkingCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[#f7f7f8] dark:bg-[#2b2b2b] border border-muted rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3.5 py-2.5 hover:bg-[#f0f0f0] dark:hover:bg-[#343541] transition-colors text-left"
      >
        <Lightbulb size={14} className={isActive ? "text-violet-500 animate-pulse" : "text-violet-500"} />
        <span className="text-xs font-medium text-ink dark:text-[#ececec] flex-1">
          {isActive ? "Thinking..." : "Thinking"}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate dark:text-[#8e8e8e] transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && reasoning && (
        <div className="px-3.5 pb-3 text-xs text-slate dark:text-[#8e8e8e] leading-relaxed">
          <p>{reasoning}</p>
        </div>
      )}
    </div>
  )
}
