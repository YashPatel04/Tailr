"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
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
  return change.old ?? change.old_text
}

function getNewValue(change: any): any {
  return change.new ?? change.new_text ?? change.value
}

function humanizePath(path: string): string {
  return path
    .replace(/sections\[(\d+)]/g, "Section $1")
    .replace(/\].entries\[/g, " > Entry ")
    .replace(/\].bullets\[/g, " > Bullet ")
    .replace(/\].skill_rows\[/g, " > Skill Row ")
    .replace(/^sections\./, "")
    .replace(/^basics\./, "Basics: ")
    .replace(/\.entries\[/g, " > Entry ")
    .replace(/\.bullets\[/g, " > Bullet ")
    .replace(/\.skill_rows\[/g, " > Skill Row ")
    .replace(/\./g, " > ")
    .replace(/]/g, "")
    .replace(/\s*>$/g, "")
}

function ChangesSummary({ changes }: { changes: any[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const added = changes.filter((c) => getChangeKind(c) === "added")
  const removed = changes.filter((c) => getChangeKind(c) === "removed")
  const modified = changes.filter((c) => getChangeKind(c) === "modified")

  return (
    <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        {collapsed ? <ChevronRight size={14} className="text-amber-600 flex-shrink-0" /> : <ChevronDown size={14} className="text-amber-600 flex-shrink-0" />}
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Changes ({changes.length})
        </h3>
        <div className="flex gap-2 ml-auto text-xs">
          {added.length > 0 && <span className="text-green-600 dark:text-green-400 font-medium">+{added.length}</span>}
          {removed.length > 0 && <span className="text-red-600 dark:text-red-400 font-medium">-{removed.length}</span>}
          {modified.length > 0 && <span className="text-blue-600 dark:text-blue-400 font-medium">~{modified.length}</span>}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-1.5 text-xs font-mono max-h-[400px] overflow-y-auto">
          {added.length > 0 && (
            <div className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
              <span className="font-semibold">+{added.length} added</span>
              {added.map((c, i) => {
                const newVal = getNewValue(c)
                const label = newVal?.label || newVal?.title || (typeof newVal === "string" ? newVal.substring(0, 40) : "")
                return (
                  <div key={i} className="opacity-70 mt-0.5 ml-2 truncate">
                    {humanizePath(getChangePath(c))}{label ? `: "${label}"` : ""}
                  </div>
                )
              })}
            </div>
          )}

          {removed.length > 0 && (
            <div className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
              <span className="font-semibold">-{removed.length} removed</span>
              {removed.map((c, i) => (
                <div key={i} className="opacity-70 mt-0.5 ml-2 truncate">{humanizePath(getChangePath(c))}</div>
              ))}
            </div>
          )}

          {modified.map((c, i) => {
            const oldVal = getOldValue(c)
            const newVal = getNewValue(c)
            const path = getChangePath(c)
            return (
              <div key={i} className="p-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                <div className="font-semibold text-[11px] mb-0.5 opacity-70">{humanizePath(path)}</div>
                {oldVal !== undefined && newVal !== undefined ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="px-1.5 py-0.5 rounded bg-red-200/50 dark:bg-red-900/40 text-red-700 dark:text-red-300 line-through break-all">
                      {typeof oldVal === "string" ? oldVal.substring(0, 150) : JSON.stringify(oldVal).substring(0, 150)}
                    </div>
                    <div className="px-1.5 py-0.5 rounded bg-green-200/50 dark:bg-green-900/40 text-green-700 dark:text-green-300 break-all">
                      {typeof newVal === "string" ? newVal.substring(0, 150) : JSON.stringify(newVal).substring(0, 150)}
                    </div>
                  </div>
                ) : oldVal !== undefined ? (
                  <div className="px-1.5 py-0.5 rounded bg-red-200/50 dark:bg-red-900/40 text-red-700 dark:text-red-300 line-through break-all">
                    {typeof oldVal === "string" ? oldVal.substring(0, 150) : JSON.stringify(oldVal).substring(0, 150)}
                  </div>
                ) : newVal !== undefined ? (
                  <div className="px-1.5 py-0.5 rounded bg-green-200/50 dark:bg-green-900/40 text-green-700 dark:text-green-300 break-all">
                    {typeof newVal === "string" ? newVal.substring(0, 150) : JSON.stringify(newVal).substring(0, 150)}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
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
            const pathSegments = pathToIdMap.entries()
            for (const [p, id] of pathSegments) {
              if (id === nodeId && c.path.includes(p)) return true
            }
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
