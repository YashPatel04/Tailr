"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"

interface ResearchCardProps {
  summary?: Record<string, any>
  sources?: string[]
  isActive?: boolean
}

export function ResearchCard({ summary, sources, isActive }: ResearchCardProps) {
  const [expanded, setExpanded] = useState(false)

  const findings = summary?.findings || summary?.key_points || []
  const companyInfo = summary?.company_info || summary?.overview || ""

  return (
    <div className="bg-[#f7f7f8] dark:bg-[#2b2b2b] border border-muted rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3.5 py-2.5 hover:bg-[#f0f0f0] dark:hover:bg-[#343541] transition-colors text-left"
      >
        <Search size={14} className={isActive ? "text-brass animate-pulse" : "text-brass"} />
        <span className="text-xs font-medium text-ink dark:text-[#ececec] flex-1">
          {isActive ? "Researching..." : "Research Complete"}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate dark:text-[#8e8e8e] transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-3.5 pb-3 text-xs text-slate dark:text-[#8e8e8e] leading-relaxed space-y-2">
          {companyInfo && <p>{companyInfo}</p>}
          {findings.length > 0 && (
            <ul className="list-disc list-inside space-y-1">
              {findings.map((finding: string, i: number) => (
                <li key={i}>{finding}</li>
              ))}
            </ul>
          )}
          {sources && sources.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brass hover:underline"
                >
                  {new URL(src).hostname}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
