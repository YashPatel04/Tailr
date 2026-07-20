"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useGroupedSessions } from "@/hooks/queries"
import { SidebarHistoryItem } from "./SidebarHistoryItem"

const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  previous_7_days: "Previous 7 Days",
  older: "Older",
}

export function SidebarHistory({ collapsed }: { collapsed: boolean }) {
  const { data: grouped } = useGroupedSessions()
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  if (collapsed || !grouped) return null

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

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
    </div>
  )
}
