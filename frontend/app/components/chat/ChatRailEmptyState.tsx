"use client"

import { FileText } from "lucide-react"
import { useSessionStore } from "@/stores/sessionStore"

export function ChatRailEmptyState() {
  const { setSetupOpen } = useSessionStore()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <FileText size={40} className="text-[#e5e5e5] dark:text-[#4d4d4d]" />
      <div>
        <p className="text-lg font-semibold text-ink dark:text-[#ececec]">No changes yet</p>
        <p className="mt-1 text-sm text-slate dark:text-[#8e8e8e]">
          Paste a job description to begin tailoring.
        </p>
      </div>
      <button
        onClick={() => setSetupOpen(true)}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover transition-colors"
      >
        Start a session
      </button>
    </div>
  )
}
