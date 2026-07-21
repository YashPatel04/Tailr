"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { DiffChangeSet, ResumeContent } from "@/types"

export interface DiffState {
  kind: string | null
  oldVal?: string
  newVal?: string
  path?: string
}

interface DiffContextValue {
  diff: DiffChangeSet | null
  getDiffState: (nodeId: string) => DiffState
}

const DiffContext = createContext<DiffContextValue>({ diff: null, getDiffState: () => ({ kind: null }) })

export function useDiff(nodeId: string): DiffState {
  const { getDiffState } = useContext(DiffContext)
  return getDiffState(nodeId)
}

function buildPathToIdMap(content: ResumeContent): Map<string, string> {
  const map = new Map<string, string>()
  content.sections.forEach((section, si) => {
    map.set(`sections[${si}]`, section.id)
    map.set(`sections[${si}].${section.label}`, section.id)
    section.entries.forEach((entry, ei) => {
      map.set(`sections[${si}].entries[${ei}]`, entry.id)
      map.set(`sections[${si}].${section.label}.entries[${ei}]`, entry.id)
      entry.bullets.forEach((bullet, bi) => {
        map.set(`sections[${si}].entries[${ei}].bullets[${bi}]`, bullet.id)
        map.set(`sections[${si}].${section.label}.entries[${ei}].bullets[${bi}]`, bullet.id)
        map.set(`sections[${si}].entries[${ei}].bullets[${bi}].text`, bullet.id)
        map.set(`sections[${si}].${section.label}.entries[${ei}].bullets[${bi}].text`, bullet.id)
      })
    })
    section.skill_rows.forEach((row, ri) => {
      map.set(`sections[${si}].skill_rows[${ri}]`, row.id)
      map.set(`sections[${si}].${section.label}.skill_rows[${ri}]`, row.id)
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
    <div className="mb-6">
      {/* Summary bar — git diff style */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f8f9fa] dark:bg-[#292a2d] border border-[#dadce0] dark:border-[#5f6368] text-left text-[11px] text-[#5f6368] dark:text-[#9aa0a6] font-mono hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
      >
        {collapsed ? <ChevronRight size={12} className="flex-shrink-0" /> : <ChevronDown size={12} className="flex-shrink-0" />}
        <span className="flex items-center gap-1">
          {added.length > 0 && <span className="text-[#137333] dark:text-[#81c995] font-semibold">+{added.length}</span>}
          {added.length > 0 && <span>added</span>}
          {added.length > 0 && (removed.length > 0 || modified.length > 0) && <span>·</span>}
          {removed.length > 0 && <span className="text-[#c5221f] dark:text-[#f28b82] font-semibold">&ndash;{removed.length}</span>}
          {removed.length > 0 && <span>removed</span>}
          {(added.length > 0 || removed.length > 0) && modified.length > 0 && <span>·</span>}
          {modified.length > 0 && <span className="text-[#e37400] dark:text-[#fdd663] font-semibold">~{modified.length}</span>}
          {modified.length > 0 && <span>modified</span>}
        </span>
        <span className="ml-auto text-[10px] text-[#9aa0a6] dark:text-[#80868b]">
          {changes.length} {changes.length === 1 ? "change" : "changes"}
        </span>
      </button>

      {/* Expanded detail */}
      {!collapsed && (
        <div className="mt-2 pl-1 space-y-1 text-xs font-mono max-h-[300px] overflow-y-auto">
          {added.length > 0 && (
            <div className="p-2 rounded bg-[#e6f4ea] dark:bg-[#137333]/30 text-[#137333] dark:text-[#81c995] border-l-[3px] border-[#137333] dark:border-[#81c995]">
              <span className="font-semibold">+{added.length} added</span>
              {added.map((c, i) => {
                const newVal = getNewValue(c)
                const label = newVal?.label || newVal?.title || (typeof newVal === "string" ? newVal.substring(0, 40) : "")
                return (
                  <div key={i} className="opacity-70 mt-0.5 ml-2 truncate text-[11px]">
                    {humanizePath(getChangePath(c))}{label ? `: "${label}"` : ""}
                  </div>
                )
              })}
            </div>
          )}

          {removed.length > 0 && (
            <div className="p-2 rounded bg-[#fce8e6] dark:bg-[#a50e0e]/30 text-[#c5221f] dark:text-[#f28b82] border-l-[3px] border-[#c5221f] dark:border-[#f28b82]">
              <span className="font-semibold">&ndash;{removed.length} removed</span>
              {removed.map((c, i) => (
                <div key={i} className="opacity-70 mt-0.5 ml-2 truncate text-[11px]">{humanizePath(getChangePath(c))}</div>
              ))}
            </div>
          )}

          {modified.map((c, i) => {
            const oldVal = getOldValue(c)
            const newVal = getNewValue(c)
            const path = getChangePath(c)
            return (
              <div key={i} className="p-2 rounded bg-[#fef7e0] dark:bg-[#e37400]/20 text-[#b06000] dark:text-[#fdd663] border-l-[3px] border-[#e37400] dark:border-[#fdd663]">
                <div className="font-semibold text-[10px] mb-0.5 opacity-70">{humanizePath(path)}</div>
                {oldVal !== undefined && newVal !== undefined ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="px-1.5 py-0.5 rounded bg-[#fce8e6]/70 dark:bg-[#a50e0e]/40 text-[#c5221f] dark:text-[#f28b82] line-through break-all">
                      {typeof oldVal === "string" ? oldVal.substring(0, 150) : JSON.stringify(oldVal).substring(0, 150)}
                    </div>
                    <div className="px-1.5 py-0.5 rounded bg-[#e6f4ea]/70 dark:bg-[#137333]/40 text-[#137333] dark:text-[#81c995] break-all">
                      {typeof newVal === "string" ? newVal.substring(0, 150) : JSON.stringify(newVal).substring(0, 150)}
                    </div>
                  </div>
                ) : oldVal !== undefined ? (
                  <div className="px-1.5 py-0.5 rounded bg-[#fce8e6]/70 dark:bg-[#a50e0e]/40 text-[#c5221f] dark:text-[#f28b82] line-through break-all text-[11px]">
                    {typeof oldVal === "string" ? oldVal.substring(0, 150) : JSON.stringify(oldVal).substring(0, 150)}
                  </div>
                ) : newVal !== undefined ? (
                  <div className="px-1.5 py-0.5 rounded bg-[#e6f4ea]/70 dark:bg-[#137333]/40 text-[#137333] dark:text-[#81c995] break-all text-[11px]">
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

    const findChange = (nodeId: string): any => {
      const change = diff?.changes?.find((c: any) => {
        if (c.node_id === nodeId) return true
        if (c.path) {
          const mappedId = pathToIdMap.get(c.path)
          if (mappedId === nodeId) return true
          for (const [p, id] of pathToIdMap.entries()) {
            if (id === nodeId && c.path.includes(p)) return true
          }
        }
        return false
      })
      return change
    }

    return {
      diff,
      getDiffState: (nodeId: string): DiffState => {
        const change = findChange(nodeId)
        if (!change) return { kind: null }
        const kind = getChangeKind(change)
        const oldVal = getOldValue(change)
        const newVal = getNewValue(change)
        return {
          kind,
          oldVal: typeof oldVal === "string" ? oldVal : undefined,
          newVal: typeof newVal === "string" ? newVal : undefined,
          path: getChangePath(change),
        }
      },
    }
  }, [diff, content])

  const changes = diff?.changes || []

  return (
    <DiffContext.Provider value={value}>
      <div>
        {changes.length > 0 && <ChangesSummary changes={changes} />}
        {children}
      </div>
    </DiffContext.Provider>
  )
}
