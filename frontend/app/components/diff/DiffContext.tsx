"use client"

import { createContext, useContext } from "react"
import type { DiffChange } from "@/types"

interface DiffContextValue {
  changes: Map<string, DiffChange>
  getFieldChange: (key: string) => DiffChange | undefined
}

const DiffContext = createContext<DiffContextValue>({
  changes: new Map(),
  getFieldChange: () => undefined,
})

export function useFieldChanges(key: string): DiffChange | undefined {
  const { getFieldChange } = useContext(DiffContext)
  return getFieldChange(key)
}

export function useFieldChangesAny(...keys: string[]): DiffChange | undefined {
  const { changes } = useContext(DiffContext)
  for (const key of keys) {
    const change = changes.get(key)
    if (change) return change
  }
  return undefined
}

export function useAllChanges(): Map<string, DiffChange> {
  const { changes } = useContext(DiffContext)
  return changes
}

export function DiffProvider({
  changes,
  children,
}: {
  changes: Map<string, DiffChange>
  children: React.ReactNode
}) {
  const getFieldChange = (key: string) => changes.get(key)

  return <DiffContext.Provider value={{ changes, getFieldChange }}>{children}</DiffContext.Provider>
}
