"use client"

import { useSessionStore } from "@/stores/sessionStore"
import { useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"

export function DiffOverlay({ changeCount }: { changeCount: number }) {
  const { activeSessionId, snapshot, clearSnapshot } = useSessionStore()
  const queryClient = useQueryClient()

  if (!snapshot || changeCount === 0) return null

  const handleAccept = () => {
    clearSnapshot()
    toast.success("Changes accepted")
  }

  const handleReject = async () => {
    if (!activeSessionId || !snapshot) return
    try {
      await apiRequest("PATCH", `/api/sessions/${activeSessionId}/document`, {
        operations: [{ op: "set_content", content: snapshot }],
      })
      clearSnapshot()
      queryClient.invalidateQueries({ queryKey: ["sessions", activeSessionId, "document"] })
      toast.success("Reverted to last accepted state")
    } catch {
      toast.error("Failed to revert")
    }
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={handleAccept}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover transition-colors"
      >
        Accept all
      </button>
      <button
        onClick={handleReject}
        className="rounded-lg border border-proof-red px-4 py-2 text-sm font-medium text-proof-red hover:bg-proof-red/10 transition-colors"
      >
        Reject all
      </button>
    </div>
  )
}
