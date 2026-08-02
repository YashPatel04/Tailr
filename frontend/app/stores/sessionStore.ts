import { create } from "zustand"
import type { QueryClient } from "@tanstack/react-query"
import type { ResumeContent, SessionDocument } from "@/types"
import type { SaveStatus } from "@/lib/editQueue"
import { getApiBaseUrl } from "@/lib/env"
import { getCsrfToken } from "@/lib/api"
import { parseSSEStream } from "@/lib/sseParser"
import { toast } from "@/components/ui/Toaster"

export interface PendingProposal {
  message: string
  operations: any[]
  patch_summary: string
  explanation?: string
  reasoning?: string
}

interface SessionState {
  activeSessionId: string | null
  activeDocType: "resume" | "cover_letter"
  viewMode: "changes" | "final"
  setupOpen: boolean
  isStreaming: boolean
  streamingDocType: "resume" | "cover_letter" | null
  latestDocument: SessionDocument | null
  snapshot: ResumeContent | null
  pendingProposal: PendingProposal | null
  progressPhase: string
  progressMessage: string
  saveStatus: SaveStatus
  editingFieldId: string | null
  activeMode: "plan" | "edit"
  tailoringMode: string
  selectedProviderId: string | null
  selectedModel: string | null
  setActiveSession: (id: string | null) => void
  setDocType: (type: "resume" | "cover_letter") => void
  setViewMode: (mode: "changes" | "final") => void
  setSetupOpen: (open: boolean) => void
  setStreaming: (streaming: boolean) => void
  setLatestDocument: (doc: SessionDocument | null) => void
  setSnapshot: (content: ResumeContent) => void
  clearSnapshot: () => void
  setPendingProposal: (proposal: PendingProposal | null) => void
  clearProposal: () => void
  setProgress: (phase: string, message: string) => void
  setSaveStatus: (status: SaveStatus) => void
  setEditingFieldId: (id: string | null) => void
  setActiveMode: (mode: "plan" | "edit") => void
  setTailoringMode: (mode: string) => void
  setSelectedModel: (providerId: string | null, model: string | null) => void
  sendMessage: (
    content: string,
    queryClient: QueryClient,
    proposalContext?: string
  ) => Promise<void>
}

let controllerRef: AbortController | null = null

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSessionId: null,
  activeDocType: "resume",
  viewMode: "final",
  setupOpen: false,
  isStreaming: false,
  streamingDocType: null,
  latestDocument: null,
  snapshot: null,
  pendingProposal: null,
  progressPhase: "",
  progressMessage: "",
  saveStatus: "idle",
  editingFieldId: null,
  activeMode: "edit",
  tailoringMode: "polish",
  selectedProviderId: null,
  selectedModel: null,
  setActiveSession: (id) =>
    set({
      activeSessionId: id,
      pendingProposal: null,
      snapshot: null,
      viewMode: "final",
      progressPhase: "",
      progressMessage: "",
    }),
  setDocType: (type) => set({ activeDocType: type }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSetupOpen: (open) => set({ setupOpen: open }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setLatestDocument: (doc) => set({ latestDocument: doc }),
  setSnapshot: (content) => set({ snapshot: content }),
  clearSnapshot: () => set({ snapshot: null }),
  setPendingProposal: (proposal) => set({ pendingProposal: proposal }),
  clearProposal: () => set({ pendingProposal: null }),
  setProgress: (phase, message) => set({ progressPhase: phase, progressMessage: message }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setEditingFieldId: (id) => set({ editingFieldId: id }),
  setActiveMode: (mode) => set({ activeMode: mode }),
  setTailoringMode: (mode) => set({ tailoringMode: mode }),
  setSelectedModel: (providerId, model) =>
    set({ selectedProviderId: providerId, selectedModel: model }),
  sendMessage: async (content, queryClient, proposalContext) => {
    const state = get()
    const sessionId = state.activeSessionId
    if (!sessionId) return

    const docType = state.activeDocType

    controllerRef?.abort()
    const controller = new AbortController()
    controllerRef = controller

    const requestId = crypto.randomUUID()

    set({ isStreaming: true, streamingDocType: docType, progressPhase: "", progressMessage: "" })

    const queryKey = ["sessions", sessionId, "messages", docType]
    queryClient.setQueryData(queryKey, (old: any[] | undefined) => [
      ...(old || []),
      {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content,
        doc_type: docType,
        created_at: new Date().toISOString(),
      },
    ])

    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch(`${getApiBaseUrl()}/api/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          content,
          role: "user",
          doc_type: docType,
          mode: state.activeMode,
          tailoring_mode: state.tailoringMode,
          proposal_context: proposalContext,
          llm_provider_id: state.selectedProviderId,
          model: state.selectedModel,
          request_id: requestId,
        }),
        credentials: "include",
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 409) {
          toast.error("Duplicate request")
        } else {
          toast.error(`Connection failed (${response.status})`)
        }
        set({ isStreaming: false, streamingDocType: null, progressPhase: "", progressMessage: "" })
        queryClient.invalidateQueries({ queryKey })
        return
      }

      if (!response.body) {
        toast.error("No response body")
        set({ isStreaming: false, streamingDocType: null, progressPhase: "", progressMessage: "" })
        queryClient.invalidateQueries({ queryKey })
        return
      }

      await parseSSEStream(
        response.body,
        (event) => {
          try {
            const data = JSON.parse(event.data)
            switch (event.event) {
              case "researching":
                set({
                  progressPhase: "researching",
                  progressMessage: data.message || "Researching...",
                })
                break
              case "research_done":
                set({ progressPhase: "research_done", progressMessage: "Research complete" })
                break
              case "thinking":
                set({ progressPhase: "thinking", progressMessage: data.message || "Thinking..." })
                break
              case "writing":
                set({
                  progressPhase: "writing",
                  progressMessage: data.message || "Writing changes...",
                })
                break
              case "proposal":
                set({
                  isStreaming: false,
                  streamingDocType: null,
                  progressPhase: "",
                  progressMessage: "",
                })
                if (data.mode === "plan") {
                  queryClient.invalidateQueries({ queryKey })
                  break
                }
                {
                  const docQueryKey = ["sessions", sessionId, "document", docType]
                  const currentDoc = queryClient.getQueryData<any>(docQueryKey)
                  if (currentDoc?.content && !get().snapshot) {
                    set({ snapshot: currentDoc.content })
                  }
                }
                set({
                  viewMode: "changes",
                  pendingProposal: {
                    message: data.message || "Proposed changes ready for review",
                    operations: data.operations || [],
                    patch_summary: data.patch_summary || "",
                    explanation: data.explanation || "",
                    reasoning: data.reasoning || "",
                  },
                })
                queryClient.invalidateQueries({ queryKey: ["sessions"] })
                queryClient.invalidateQueries({ queryKey })
                break
              case "done":
                set({
                  isStreaming: false,
                  streamingDocType: null,
                  progressPhase: "",
                  progressMessage: "",
                })
                if (data.document_id) {
                  set({ latestDocument: { id: data.document_id } as any })
                }
                queryClient.invalidateQueries({ queryKey: ["sessions"] })
                queryClient.invalidateQueries({ queryKey })
                break
              case "error":
                controller.abort()
                set({
                  isStreaming: false,
                  streamingDocType: null,
                  progressPhase: "",
                  progressMessage: "",
                })
                toast.error(data.message || "An error occurred")
                queryClient.invalidateQueries({ queryKey })
                break
            }
          } catch {}
        },
        controller.signal
      )
    } catch (err: any) {
      if (err.name !== "AbortError") {
        set({ isStreaming: false, streamingDocType: null, progressPhase: "", progressMessage: "" })
        queryClient.invalidateQueries({ queryKey })
      }
    }
  },
}))
