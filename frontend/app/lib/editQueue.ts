import { apiRequest } from "@/lib/api";
import { useSessionStore } from "@/stores/sessionStore";

let editQueue: Record<string, unknown>[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushEdits() {
  flushTimer = null;
  const ops = [...editQueue];
  editQueue = [];
  if (ops.length === 0) return;
  const sessionId = useSessionStore.getState().activeSessionId;
  if (!sessionId) return;
  try {
    await apiRequest("PATCH", `/api/sessions/${sessionId}/document`, { operations: ops });
  } catch (e) {
    console.error("Failed to save edits:", e);
  }
}

export function queueEdit(op: Record<string, unknown>) {
  editQueue.push(op);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushEdits, 2000);
}
