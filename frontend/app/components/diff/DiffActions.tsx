"use client"

import { useSessionStore } from "@/stores/sessionStore"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { useQueryClient } from "@tanstack/react-query"
import { clsx } from "clsx"

export function DiffActions() {
  const { activeSessionId, viewMode, setViewMode } = useSessionStore()
  const queryClient = useQueryClient()

  if (viewMode !== "diff") return null

  const handleAcceptAll = async () => {
    if (!activeSessionId) return
    setViewMode("final")
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
    toast.success("Keep your changes by exporting the final document")
  }

  const handleRejectAll = async () => {
    if (!activeSessionId) return
    setViewMode("final")
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
    toast.success("Reverting to previous version... Start a new chat to make different changes")
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={handleAcceptAll}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover transition-colors"
      >
        Accept all
      </button>
      <button
        onClick={handleRejectAll}
        className="rounded-lg border border-proof-red px-4 py-2 text-sm font-medium text-proof-red hover:bg-proof-red/10 transition-colors"
      >
        Reject all
      </button>
    </div>
  )
}
