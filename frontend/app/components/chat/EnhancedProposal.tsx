"use client"

import { useState, useCallback } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { useQueryClient } from "@tanstack/react-query"
import { FileText, Target, BarChart3, Check, X, ArrowRight } from "lucide-react"

export function EnhancedProposal() {
  const { pendingProposal, setPendingProposal, setViewMode, clearSnapshot, activeSessionId } = useSessionStore()
  const storeSendMessage = useSessionStore((s) => s.sendMessage)
  const queryClient = useQueryClient()
  const sendMessage = useCallback(
    (content: string, proposalContext?: string) => storeSendMessage(content, queryClient, proposalContext),
    [storeSendMessage, queryClient]
  )
  const [replyText, setReplyText] = useState("")
  const [status, setStatus] = useState<"pending" | "accepted" | "declined">("pending")
  const [replyCount, setReplyCount] = useState(0)

  if (!pendingProposal) return null

  const accept = async () => {
    if (!activeSessionId || !pendingProposal?.operations) return
    try {
      await apiRequest("POST", `/api/sessions/${activeSessionId}/proposal/accept`, pendingProposal.operations)
      setStatus("accepted")
      setPendingProposal(null)
      clearSnapshot()
      setViewMode("final")
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
      setStatus("declined")
      setPendingProposal(null)
      queryClient.invalidateQueries({ queryKey: ["sessions", activeSessionId, "messages"] })
    } catch (err: any) {
      toast.error(err.message || "Decline failed")
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || replyCount >= 5) return
    const context = `Previous proposal: ${pendingProposal.message}\n\nUser feedback: ${replyText}`
    setReplyCount(replyCount + 1)
    setReplyText("")
    setPendingProposal(null)
    await sendMessage(replyText, context)
  }

  const opCount = pendingProposal.operations?.length || 0
  const isMaxed = replyCount >= 5

  if (status === "accepted") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Check size={14} />
            <span className="text-sm font-medium">Changes accepted and applied</span>
          </div>
        </div>
      </div>
    )
  }

  if (status === "declined") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-[#f7f7f8] dark:bg-[#2b2b2b] border border-muted px-4 py-3">
          <div className="flex items-center gap-2 text-slate dark:text-[#8e8e8e]">
            <X size={14} />
            <span className="text-sm">Proposal declined</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#f7f7f8] dark:bg-[#2b2b2b] border border-muted px-4 py-3 space-y-3">
        {pendingProposal.explanation && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate dark:text-[#8e8e8e] uppercase tracking-wide mb-1">
              <FileText size={11} />
              What I&apos;m proposing
            </div>
            <p className="text-sm text-ink dark:text-[#ececec] leading-relaxed">
              {pendingProposal.explanation}
            </p>
          </div>
        )}

        {pendingProposal.reasoning && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate dark:text-[#8e8e8e] uppercase tracking-wide mb-1">
              <Target size={11} />
              Why these changes
            </div>
            <p className="text-sm text-ink dark:text-[#ececec] leading-relaxed">
              {pendingProposal.reasoning}
            </p>
          </div>
        )}

        {opCount > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate dark:text-[#8e8e8e] uppercase tracking-wide mb-1">
              <BarChart3 size={11} />
              Summary
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-[#e8e8e8] dark:bg-[#40414f] px-2 py-0.5 rounded-full text-xs text-ink dark:text-[#ececec] font-medium">
                {opCount} {opCount === 1 ? "change" : "changes"} proposed
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={accept}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brass text-white hover:bg-brass-hover transition-colors"
          >
            Accept Changes
          </button>
          <button
            onClick={decline}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-muted text-slate dark:text-[#8e8e8e] hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => setViewMode("changes")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-brass text-brass hover:bg-brass/5 transition-colors"
          >
            View Changes
          </button>
        </div>

        <div className="pt-1">
          {isMaxed ? (
            <p className="text-xs text-slate dark:text-[#8e8e8e] italic">
              Max refinements reached. Accept or decline this proposal.
            </p>
          ) : (
            <div className="flex gap-2 items-end">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
                placeholder="Reply to refine this proposal..."
                className="flex-1 border border-muted rounded-lg px-3 py-1.5 text-xs text-ink dark:text-[#ececec] bg-paper dark:bg-[#2b2b2b] outline-none focus:border-brass transition-colors placeholder:text-[#8e8e8e]"
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brass text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
