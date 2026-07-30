"use client"

import { useSessionStore } from "@/stores/sessionStore"
import { retrySave } from "@/lib/editQueue"
import { Check, Loader2, AlertCircle } from "lucide-react"

export function SaveIndicator() {
  const saveStatus = useSessionStore((s) => s.saveStatus)

  if (saveStatus === "idle") return null

  return (
    <div className="flex items-center gap-1.5 text-xs shrink-0">
      {saveStatus === "queued" && (
        <>
          <Loader2 size={12} className="animate-spin text-slate" />
          <span className="text-slate dark:text-[#8e8e8e]">Saving...</span>
        </>
      )}
      {saveStatus === "saving" && (
        <>
          <Loader2 size={12} className="animate-spin text-brass" />
          <span className="text-brass">Saving...</span>
        </>
      )}
      {saveStatus === "saved" && (
        <>
          <Check size={12} className="text-brass" />
          <span className="text-brass">Saved</span>
        </>
      )}
      {saveStatus === "error" && (
        <button
          onClick={retrySave}
          className="flex items-center gap-1 text-red-500 hover:text-red-600"
        >
          <AlertCircle size={12} />
          <span>Error saving</span>
        </button>
      )}
    </div>
  )
}
