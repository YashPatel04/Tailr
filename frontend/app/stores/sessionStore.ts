import { create } from "zustand"
import type { SessionDocument } from "@/types"
import type { SaveStatus } from "@/lib/editQueue"

export interface PendingProposal {
  message: string
  operations: any[]
  diff: any
  patch_summary: string
  explanation?: string
  reasoning?: string
}

interface SessionState {
  activeSessionId: string | null
  activeDocType: "resume" | "cover_letter"
  viewMode: "diff" | "final"
  setupOpen: boolean
  isStreaming: boolean
  latestDocument: SessionDocument | null
  latestDiff: any | null
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
  setViewMode: (mode: "diff" | "final") => void
  setSetupOpen: (open: boolean) => void
  setStreaming: (streaming: boolean) => void
  setLatestDocument: (doc: SessionDocument | null) => void
  setLatestDiff: (diff: any | null) => void
  setPendingProposal: (proposal: PendingProposal | null) => void
  clearProposal: () => void
  setProgress: (phase: string, message: string) => void
  setSaveStatus: (status: SaveStatus) => void
  setEditingFieldId: (id: string | null) => void
  setActiveMode: (mode: "plan" | "edit") => void
  setTailoringMode: (mode: string) => void
  setSelectedModel: (providerId: string | null, model: string | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  activeDocType: "resume",
  viewMode: "final",
  setupOpen: false,
  isStreaming: false,
  latestDocument: null,
  latestDiff: null,
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
      latestDiff: null,
      viewMode: "final",
      progressPhase: "",
      progressMessage: "",
    }),
  setDocType: (type) => set({ activeDocType: type }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSetupOpen: (open) => set({ setupOpen: open }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setLatestDocument: (doc) => set({ latestDocument: doc }),
  setLatestDiff: (diff) => set({ latestDiff: diff }),
  setPendingProposal: (proposal) => set({ pendingProposal: proposal }),
  clearProposal: () => set({ pendingProposal: null }),
  setProgress: (phase, message) => set({ progressPhase: phase, progressMessage: message }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setEditingFieldId: (id) => set({ editingFieldId: id }),
  setActiveMode: (mode) => set({ activeMode: mode }),
  setTailoringMode: (mode) => set({ tailoringMode: mode }),
  setSelectedModel: (providerId, model) => set({ selectedProviderId: providerId, selectedModel: model }),
}))
