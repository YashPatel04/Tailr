"use client"

import { clsx } from "clsx"
import { useSessionStore } from "@/stores/sessionStore"
import { useSession } from "@/hooks/queries"

export function DocumentTabs() {
  const { activeSessionId, activeDocType, setDocType } = useSessionStore()
  const { data: session } = useSession(activeSessionId!)
  const hasCoverLetter = session?.latest_document?.document_type === "cover_letter" || false

  return (
    <div className="flex gap-1 border-b border-muted mb-6">
      <button
        onClick={() => setDocType("resume")}
        className={clsx(
          "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
          activeDocType === "resume"
            ? "border-brass text-brass"
            : "border-transparent text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec]"
        )}
      >
        Resume
      </button>
      {hasCoverLetter && (
        <button
          onClick={() => setDocType("cover_letter")}
          className={clsx(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeDocType === "cover_letter"
              ? "border-brass text-brass"
              : "border-transparent text-slate hover:text-ink"
          )}
        >
          Cover Letter
        </button>
      )}
    </div>
  )
}
