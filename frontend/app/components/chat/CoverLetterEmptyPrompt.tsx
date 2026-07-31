"use client"

import { Mail } from "lucide-react"

export function CoverLetterEmptyPrompt() {
  return (
    <div className="px-3 py-2">
      <div className="rounded-lg bg-[#2a2a2a] border border-[#3a3a3a] px-3 py-2.5 text-xs leading-relaxed text-[#8e8e8e]">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={12} className="text-[#f59e0b]" />
          <span className="font-medium text-[#ececec]">No cover letter yet</span>
        </div>
        <p>
          Generate a cover letter first before editing. Click the button in the canvas or say{" "}
          <span className="text-[#ececec]">&quot;write a cover letter&quot;</span>.
        </p>
      </div>
    </div>
  )
}
