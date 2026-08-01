"use client"

import { ArchiveRestore } from "lucide-react"
import { useRouter } from "next/navigation"
import { clsx } from "clsx"
import { useSessionStore } from "@/stores/sessionStore"
import { apiRequest } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import type { Session } from "@/types"

interface SidebarArchivedItemProps {
  session: Session
}

export function SidebarArchivedItem({ session }: SidebarArchivedItemProps) {
  const { activeSessionId } = useSessionStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const isActive = session.id === activeSessionId

  const handleNavigate = () => {
    router.push(`/session/${session.id}`)
  }

  const handleUnarchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await apiRequest("PATCH", `/api/sessions/${session.id}`, { is_archived: false })
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
    queryClient.invalidateQueries({ queryKey: ["sessions", "grouped"] })
    queryClient.invalidateQueries({ queryKey: ["sessions", "archived"] })
    queryClient.invalidateQueries({ queryKey: ["companies"] })
  }

  return (
    <div
      onClick={handleNavigate}
      className={clsx(
        "block px-3 py-2 mx-2 rounded-md hover:bg-[#2b2b2b] group cursor-pointer transition-colors",
        isActive && "bg-[#2b2b2b]"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleNavigate()
      }}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[#8e8e8e] truncate">{session.role_title}</div>
          <div className="text-xs text-[#6e6e6e] truncate">{session.company_name}</div>
        </div>
        <div className="hidden group-hover:flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={handleUnarchive}
            className="p-1 rounded hover:bg-[#3e3e3e] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
            aria-label="Unarchive"
          >
            <ArchiveRestore size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
