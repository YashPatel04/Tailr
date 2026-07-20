"use client"

import { createContext, useContext, useMemo } from "react"
import type { DiffChangeSet, ResumeContent } from "@/types"

interface DiffContextValue {
  diff: DiffChangeSet | null
  getDiffState: (nodeId: string) => string | null
}

const DiffContext = createContext<DiffContextValue>({ diff: null, getDiffState: () => null })

export function useDiff(nodeId: string) {
  const { getDiffState } = useContext(DiffContext)
  return getDiffState(nodeId)
}

function buildPathToIdMap(content: ResumeContent): Map<string, string> {
  const map = new Map<string, string>()
  content.sections.forEach((section, si) => {
    map.set(`sections[${si}]`, section.id)
    section.entries.forEach((entry, ei) => {
      map.set(`sections[${si}].entries[${ei}]`, entry.id)
      entry.bullets.forEach((bullet, bi) => {
        map.set(`sections[${si}].entries[${ei}].bullets[${bi}]`, bullet.id)
      })
    })
    section.skill_rows.forEach((row, ri) => {
      map.set(`sections[${si}].skill_rows[${ri}]`, row.id)
    })
  })
  return map
}

export function DiffView({
  document,
  diff,
  content,
  children,
}: {
  document?: any
  diff: DiffChangeSet
  content?: ResumeContent
  children: React.ReactNode
}) {
  const value = useMemo(() => {
    const pathToIdMap = content ? buildPathToIdMap(content) : new Map<string, string>()

    return {
      diff,
      getDiffState: (nodeId: string) => {
        const change = diff?.changes?.find((c: any) => {
          if (c.node_id === nodeId) return true
          if (c.path) {
            const mappedId = pathToIdMap.get(c.path)
            if (mappedId === nodeId) return true
          }
          return false
        })
        return change?.type || null
      },
    }
  }, [diff, content])

  return (
    <DiffContext.Provider value={value}>
      <div className="animate-diff-in">{children}</div>
    </DiffContext.Provider>
  )
}
