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
        map.set(`sections[${si}].entries[${ei}].bullets[${bi}].text`, bullet.id)
      })
    })
    section.skill_rows.forEach((row, ri) => {
      map.set(`sections[${si}].skill_rows[${ri}]`, row.id)
    })
  })
  return map
}

function getChangeKind(change: any): string {
  return change.kind || change.type || "modified"
}

function getChangePath(change: any): string {
  return change.path || ""
}

function getOldValue(change: any): string | undefined {
  return change.old
}

function getNewValue(change: any): any {
  return change.new || change.value
}

function ChangesSummary({ changes }: { changes: any[] }) {
  const added = changes.filter((c) => getChangeKind(c) === "added")
  const removed = changes.filter((c) => getChangeKind(c) === "removed")
  const modified = changes.filter((c) => getChangeKind(c) === "modified")

  return (
    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">
        Changes ({changes.length})
      </h3>
      <div className="space-y-2 text-xs font-mono">
        {added.length > 0 && (
          <div className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
            <span className="font-semibold">+{added.length} added</span>
            {added.map((c, i) => (
              <div key={i} className="opacity-70 mt-0.5 ml-2">{getChangePath(c)}</div>
            ))}
          </div>
        )}
        {removed.length > 0 && (
          <div className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
            <span className="font-semibold">-{removed.length} removed</span>
            {removed.map((c, i) => (
              <div key={i} className="opacity-70 mt-0.5 ml-2">{getChangePath(c)}</div>
            ))}
          </div>
        )}
        {modified.map((c, i) => {
          const oldVal = getOldValue(c)
          const newVal = getNewValue(c)
          return (
            <div key={i} className="p-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
              <div className="font-semibold">MODIFIED</div>
              <div className="opacity-70">{getChangePath(c)}</div>
              {oldVal !== undefined && newVal !== undefined && (
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className="line-through text-red-600 dark:text-red-400 break-all">
                    {typeof oldVal === "string" ? oldVal.substring(0, 150) : JSON.stringify(oldVal).substring(0, 150)}
                  </div>
                  <div className="text-green-600 dark:text-green-400 break-all">
                    {typeof newVal === "string" ? newVal.substring(0, 150) : JSON.stringify(newVal).substring(0, 150)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
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
        return change ? getChangeKind(change) : null
      },
    }
  }, [diff, content])

  const changes = diff?.changes || []

  return (
    <DiffContext.Provider value={value}>
      <div className="animate-diff-in">
        {changes.length > 0 && <ChangesSummary changes={changes} />}
        {children}
      </div>
    </DiffContext.Provider>
  )
}
