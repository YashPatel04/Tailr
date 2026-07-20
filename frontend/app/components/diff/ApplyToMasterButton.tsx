"use client"

import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { useQueryClient } from "@tanstack/react-query"

export function ApplyToMasterButton({ sessionId, operationIndex }: { sessionId: string; operationIndex: number }) {
  const queryClient = useQueryClient()

  const handleClick = async () => {
    try {
      await apiRequest("POST", `/api/sessions/${sessionId}/apply-to-master`, { operation_index: operationIndex })
      toast.success("Applied to master resume")
      queryClient.invalidateQueries({ queryKey: ["master-resume"] })
    } catch (err: any) {
      toast.error(err.message || "Failed to apply")
    }
  }

  return (
    <button
      onClick={handleClick}
      className="ml-2 rounded border border-brass px-2 py-0.5 text-xs text-brass hover:bg-brass/10 transition-colors"
    >
      Apply to master
    </button>
  )
}
