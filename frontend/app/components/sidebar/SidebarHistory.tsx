"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useGroupedSessions, useArchivedSessions } from "@/hooks/queries"
import { SidebarHistoryItem } from "./SidebarHistoryItem"
import { SidebarArchivedItem } from "./SidebarArchivedItem"

const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  previous_7_days: "Previous 7 Days",
  older: "Older",
}

export function SidebarHistory({ collapsed }: { collapsed: boolean }) {
  const { data: grouped } = useGroupedSessions()
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const { data: archived } = useArchivedSessions(archivedExpanded)

  if (collapsed || !grouped) return null

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const archivedCount = grouped.archived_count ?? 0

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {Object.entries(GROUP_LABELS).map(([key, label]) => {
        const sessions = grouped[key as keyof typeof grouped]
        if (!sessions || sessions.length === 0) return null
        const isCollapsed = collapsedGroups[key] ?? false

        return (
          <div key={key}>
            <button
              onClick={() => toggleGroup(key)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#8e8e8e] hover:bg-[#212121] cursor-pointer"
            >
              <span>{label}</span>
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5">
                {sessions.map((session) => (
                  <SidebarHistoryItem key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
        )
      })}
      {archivedCount > 0 && (
        <div>
          <button
            onClick={() => setArchivedExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#8e8e8e] hover:bg-[#212121] cursor-pointer"
          >
            <span>Archived ({archivedCount})</span>
            {archivedExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {archivedExpanded && archived && (
            <div className="space-y-0.5">
              {archived.map((session) => (
                <SidebarArchivedItem key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
