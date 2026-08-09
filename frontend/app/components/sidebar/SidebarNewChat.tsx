"use client"

import { Pencil, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/Toaster"
import { useMasterResume } from "@/hooks/queries"
import { useSessionStore } from "@/stores/sessionStore"
import { useSettingsStore } from "@/components/settings/SettingsModal"

export function SidebarNewChat({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const { setActiveSession, setSetupOpen } = useSessionStore()
  const openSettings = useSettingsStore((s) => s.open)
  const { data: master } = useMasterResume()

  const handleClick = () => {
    if (!master) {
      toast.error("Upload a master resume first")
      openSettings("master-resume")
      return
    }
    setActiveSession(null)
    setSetupOpen(true)
    router.push("/dashboard")
  }

  if (collapsed) {
    return (
      <div className="flex justify-center py-2 flex-shrink-0">
        <button
          onClick={handleClick}
          className="p-1.5 rounded-md hover:bg-[#2b2b2b] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
          aria-label="New chat"
        >
          <Plus size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="px-2 pb-2 flex-shrink-0">
      <button
        onClick={handleClick}
        className="flex w-full items-center gap-2 rounded-md border border-[#4d4d4d] px-3 py-1.5 text-sm text-[#ececec] hover:bg-[#2b2b2b] transition-colors"
      >
        <Pencil size={15} />
        <span>New Chat</span>
      </button>
    </div>
  )
}
