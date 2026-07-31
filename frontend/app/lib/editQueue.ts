import { apiRequest } from "@/lib/api"
import { useSessionStore } from "@/stores/sessionStore"

export type SaveStatus = "idle" | "queued" | "saving" | "saved" | "error"

interface QueuedOp {
  op: Record<string, unknown>
  sessionId: string
}

interface HistoryEntry {
  ops: Record<string, unknown>[]
  inverse: Record<string, unknown>[]
  sessionId: string
}

const MAX_HISTORY = 50

let editQueue: QueuedOp[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let past: HistoryEntry[] = []
let future: HistoryEntry[] = []
let undoRedoActive = false

function setSaveStatus(status: SaveStatus) {
  useSessionStore.getState().setSaveStatus(status)
}

async function flushEdits() {
  flushTimer = null
  const pending = [...editQueue]
  editQueue = []
  if (pending.length === 0) return

  const sessionId = useSessionStore.getState().activeSessionId
  if (!sessionId) return

  const ops = pending.filter((q) => q.sessionId === sessionId).map((q) => q.op)

  if (ops.length === 0) {
    const leftover = pending.filter((q) => q.sessionId !== sessionId)
    if (leftover.length > 0) {
      editQueue = leftover
      flushTimer = setTimeout(flushEdits, 2000)
    }
    return
  }

  const leftover = pending.filter((q) => q.sessionId !== sessionId)
  const docType = useSessionStore.getState().activeDocType
  setSaveStatus("saving")

  try {
    await apiRequest("PATCH", `/api/sessions/${sessionId}/document`, { operations: ops, doc_type: docType })
    setSaveStatus("saved")
    setTimeout(() => {
      if (useSessionStore.getState().saveStatus === "saved") {
        setSaveStatus("idle")
      }
    }, 3000)

    if (!undoRedoActive && ops.length > 0) {
      past.push({ ops, inverse: [], sessionId })
      if (past.length > MAX_HISTORY) past.shift()
    }
    undoRedoActive = false
  } catch (e) {
    console.error("Failed to save edits:", e)
    setSaveStatus("error")
    editQueue = [
      ...editQueue.filter((q) => q.sessionId !== sessionId),
      ...pending.map((p) => ({ op: p.op, sessionId: p.sessionId })),
    ]
  }

  if (leftover.length > 0) {
    editQueue = leftover
    flushTimer = setTimeout(flushEdits, 2000)
  }
}

export function queueEdit(op: Record<string, unknown>, inverseOp?: Record<string, unknown>) {
  const sessionId = useSessionStore.getState().activeSessionId
  if (!sessionId) return

  if (inverseOp && past.length > 0) {
    const lastEntry = past[past.length - 1]
    if (lastEntry.sessionId === sessionId) {
      lastEntry.inverse.unshift(inverseOp)
    }
  }

  future = []
  editQueue.push({ op, sessionId })
  setSaveStatus("queued")
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flushEdits, 2000)
}

export async function undo() {
  if (past.length === 0) return
  const sessionId = useSessionStore.getState().activeSessionId
  const entry = past[past.length - 1]
  if (entry.sessionId !== sessionId) {
    return
  }
  if (entry.inverse.length === 0) return

  undoRedoActive = true
  past.pop()
  future.push(entry)

  setSaveStatus("saving")
  try {
    await apiRequest("PATCH", `/api/sessions/${sessionId}/document`, { operations: entry.inverse })
    setSaveStatus("saved")
    setTimeout(() => {
      if (useSessionStore.getState().saveStatus === "saved") {
        setSaveStatus("idle")
      }
    }, 3000)
  } catch (e) {
    console.error("Undo failed:", e)
    setSaveStatus("error")
    past.push(entry)
    future.pop()
  }
}

export async function redo() {
  if (future.length === 0) return
  const sessionId = useSessionStore.getState().activeSessionId
  const entry = future[future.length - 1]
  if (entry.sessionId !== sessionId) return

  undoRedoActive = true
  future.pop()
  past.push(entry)

  setSaveStatus("saving")
  try {
    await apiRequest("PATCH", `/api/sessions/${sessionId}/document`, { operations: entry.ops })
    setSaveStatus("saved")
    setTimeout(() => {
      if (useSessionStore.getState().saveStatus === "saved") {
        setSaveStatus("idle")
      }
    }, 3000)
  } catch (e) {
    console.error("Redo failed:", e)
    setSaveStatus("error")
    future.push(entry)
    past.pop()
  }
}

export function getUndoCount(): number {
  return past.length
}

export function getRedoCount(): number {
  return future.length
}

export function clearHistory() {
  past = []
  future = []
}

export function retrySave() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flushEdits, 0)
}
