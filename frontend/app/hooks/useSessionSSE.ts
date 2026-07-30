"use client"

import { useEffect, useRef, useCallback } from "react"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { useSessionStore } from "@/stores/sessionStore"
import { getApiBaseUrl } from "@/lib/env"
import { getCsrfToken } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { useQueryClient } from "@tanstack/react-query"

export function useSessionSSE(sessionId: string | null) {
  const controllerRef = useRef<AbortController | null>(null)
  const { setStreaming, setLatestDocument, setLatestDiff, setViewMode, setProgress, setPendingProposal, activeMode, tailoringMode } = useSessionStore()
  const queryClient = useQueryClient()

  const sendMessage = useCallback(
    async (content: string, proposalContext?: string) => {
      if (!sessionId) return

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setStreaming(true)
      setProgress("", "")

      queryClient.setQueryData(
        ["sessions", sessionId, "messages"],
        (old: any[] | undefined) => [
          ...(old || []),
          { id: `optimistic-${Date.now()}`, role: "user", content, created_at: new Date().toISOString() },
        ]
      )

      try {
        const csrfToken = await getCsrfToken()
        await fetchEventSource(`${getApiBaseUrl()}/api/sessions/${sessionId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            content,
            role: "user",
            mode: activeMode,
            tailoring_mode: tailoringMode,
            proposal_context: proposalContext,
          }),
          credentials: "include",
          signal: controller.signal,
          onmessage(event) {
            try {
              const data = JSON.parse(event.data)
              switch (event.event) {
                case "researching":
                  setProgress("researching", data.message || "Researching...")
                  break
                case "research_done":
                  setProgress("research_done", "Research complete")
                  break
                case "thinking":
                  setProgress("thinking", data.message || "Thinking...")
                  break
                case "writing":
                  setProgress("writing", data.message || "Writing changes...")
                  break
                case "proposal":
                  setStreaming(false)
                  setProgress("", "")
                  if (data.mode === "plan") {
                    queryClient.invalidateQueries({ queryKey: ["sessions", sessionId, "messages"] })
                    break
                  }
                  setViewMode("diff")
                  if (data.diff) {
                    setLatestDiff(data.diff)
                  }
                  setPendingProposal({
                    message: data.message || "Proposed changes ready for review",
                    operations: data.operations || [],
                    diff: data.diff,
                    patch_summary: data.patch_summary || "",
                    explanation: data.explanation || "",
                    reasoning: data.reasoning || "",
                  })
                  queryClient.invalidateQueries({ queryKey: ["sessions"] })
                  queryClient.invalidateQueries({ queryKey: ["sessions", sessionId, "messages"] })
                  break
                case "done":
                  setStreaming(false)
                  setProgress("", "")
                  setViewMode("diff")
                  if (data.diff) {
                    setLatestDiff(data.diff)
                  }
                  if (data.document_id) {
                    setLatestDocument({ id: data.document_id } as any)
                  }
                  queryClient.invalidateQueries({ queryKey: ["sessions"] })
                  break
                case "error":
                  setStreaming(false)
                  setProgress("", "")
                  toast.error(data.message || "An error occurred")
                  break
              }
            } catch {}
          },
          onerror(err) {
            setStreaming(false)
            setProgress("", "")
            toast.error("Connection error")
            throw err
          },
        })
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setStreaming(false)
          setProgress("", "")
        }
      }
    },
    [sessionId, setStreaming, setLatestDocument, setLatestDiff, setViewMode, setProgress, setPendingProposal, queryClient, activeMode, tailoringMode]
  )

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [sessionId])

  return { sendMessage }
}
