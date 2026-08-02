"use client"

import { useSessionStore } from "@/stores/sessionStore"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { useQueryClient } from "@tanstack/react-query"

export function ProposalMessage() {
  const { pendingProposal, setPendingProposal, setViewMode, clearSnapshot, activeSessionId } = useSessionStore()
  const queryClient = useQueryClient()

  if (!pendingProposal) return null

  const accept = async () => {
    if (!activeSessionId || !pendingProposal?.operations) return
    try {
      await apiRequest("POST", `/api/sessions/${activeSessionId}/proposal/accept`, pendingProposal.operations)
      setViewMode("final")
      setPendingProposal(null)
      clearSnapshot()
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      queryClient.invalidateQueries({ queryKey: ["sessions", activeSessionId, "document"] })
      queryClient.invalidateQueries({ queryKey: ["sessions", activeSessionId, "messages"] })
    } catch (err: any) {
      toast.error(err.message || "Accept failed")
    }
  }

  const decline = async () => {
    if (!activeSessionId) return
    try {
      await apiRequest("POST", `/api/sessions/${activeSessionId}/proposal/decline`)
      setPendingProposal(null)
      queryClient.invalidateQueries({ queryKey: ["sessions", activeSessionId, "messages"] })
    } catch (err: any) {
      toast.error(err.message || "Decline failed")
    }
  }

  const opCount = pendingProposal.operations?.length || 0

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#f7f7f8] dark:bg-[#2b2b2b] border border-amber-200 dark:border-amber-800 px-4 py-3">
        <p className="text-sm text-ink dark:text-[#ececec] mb-2">{pendingProposal.message}</p>
        <p className="text-xs text-slate dark:text-[#8e8e8e] mb-3">{opCount} changes proposed</p>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={decline}
            className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
