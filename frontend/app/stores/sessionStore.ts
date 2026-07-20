import { create } from "zustand"
import type { SessionDocument } from "@/types"

interface SessionState {
  activeSessionId: string | null
  activeDocType: "resume" | "cover_letter"
  viewMode: "diff" | "final"
  setupOpen: boolean
  isStreaming: boolean
  latestDocument: SessionDocument | null
  latestDiff: any | null
  progressPhase: string
  progressMessage: string
  setActiveSession: (id: string | null) => void
  setDocType: (type: "resume" | "cover_letter") => void
  setViewMode: (mode: "diff" | "final") => void
  setSetupOpen: (open: boolean) => void
  setStreaming: (streaming: boolean) => void
  setLatestDocument: (doc: SessionDocument | null) => void
  setLatestDiff: (diff: any | null) => void
  setProgress: (phase: string, message: string) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  activeDocType: "resume",
  viewMode: "final",
  setupOpen: false,
  isStreaming: false,
  latestDocument: null,
  latestDiff: null,
  progressPhase: "",
  progressMessage: "",
  setActiveSession: (id) => set({ activeSessionId: id }),
  setDocType: (type) => set({ activeDocType: type }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSetupOpen: (open) => set({ setupOpen: open }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setLatestDocument: (doc) => set({ latestDocument: doc }),
  setLatestDiff: (diff) => set({ latestDiff: diff }),
  setProgress: (phase, message) => set({ progressPhase: phase, progressMessage: message }),
}))
