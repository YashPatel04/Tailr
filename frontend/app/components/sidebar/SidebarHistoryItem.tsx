"use client"

import { Archive, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { clsx } from "clsx"
import { useSessionStore } from "@/stores/sessionStore"
import { apiRequest } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import type { Session } from "@/types"

interface SidebarHistoryItemProps {
  session: Session
}

export function SidebarHistoryItem({ session }: SidebarHistoryItemProps) {
  const { activeSessionId } = useSessionStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const isActive = session.id === activeSessionId

  const handleNavigate = () => {
    router.push(`/session/${session.id}`)
  }

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await apiRequest("PATCH", `/api/sessions/${session.id}`, { is_archived: true })
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Delete this session?")) return
    await apiRequest("DELETE", `/api/sessions/${session.id}`)
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
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
      onKeyDown={(e) => { if (e.key === "Enter") handleNavigate() }}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[#ececec] truncate">
            {session.role_title}
          </div>
          <div className="text-xs text-[#8e8e8e] truncate">
            {session.company_name}
          </div>
        </div>
        <div className="hidden group-hover:flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={handleArchive}
            className="p-1 rounded hover:bg-[#3e3e3e] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
            aria-label="Archive"
          >
            <Archive size={14} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-[#3e3e3e] text-[#8e8e8e] hover:text-[#ef4444] transition-colors"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
