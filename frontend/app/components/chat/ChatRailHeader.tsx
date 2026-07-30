"use client"

import { MoreHorizontal, PanelRightClose } from "lucide-react"
import { useState } from "react"
import { useSession, useProviders } from "@/hooks/queries"
import { useSessionStore } from "@/stores/sessionStore"
import { useLayoutStore } from "@/stores/layout"
import { apiRequest } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/Toaster"

export function ChatRailHeader() {
  const { activeSessionId } = useSessionStore()
  const { setChatRailCollapsed } = useLayoutStore()
  const { data: session } = useSession(activeSessionId!)
  const { data: providers } = useProviders()
  const [menuOpen, setMenuOpen] = useState(false)
  const queryClient = useQueryClient()

  if (!session) return null

  const provider = providers?.find((p) => p.id === session.llm_provider_id)

  const handleArchive = async () => {
    await apiRequest("PATCH", `/api/sessions/${session.id}`, { is_archived: true })
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
    setMenuOpen(false)
    toast.success("Session archived")
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-muted flex-shrink-0">
      <button
        onClick={() => setChatRailCollapsed(true)}
        className="p-1 rounded-md hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] text-slate dark:text-[#8e8e8e] transition-colors"
        title="Collapse chat"
      >
        <PanelRightClose size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink dark:text-[#ececec] truncate">
            {session.company_name}
          </span>
        </div>
        <div className="text-xs text-slate dark:text-[#8e8e8e] truncate">
          {session.role_title}
        </div>
        {provider && (
          <span className="inline-block mt-1 rounded-full bg-[#f4f4f4] dark:bg-[#2b2b2b] px-2 py-0.5 text-xs text-slate dark:text-[#8e8e8e]">
            {provider.provider_type} / {provider.model}
          </span>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-md hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] text-slate dark:text-[#8e8e8e] transition-colors"
          aria-label="Menu"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 rounded-lg border border-muted bg-paper dark:bg-[#212121] shadow-lg py-1 min-w-[140px] z-20">
              <button
                onClick={handleArchive}
                className="flex w-full items-center px-3 py-2 text-sm text-ink dark:text-[#ececec] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f]"
              >
                Archive
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
