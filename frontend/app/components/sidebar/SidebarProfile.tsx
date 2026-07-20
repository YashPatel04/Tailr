"use client"

import { LogOut, Moon, Sun, Settings } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentUser } from "@/hooks/queries"
import { useTheme } from "@/components/theme/ThemeProvider"
import { useSettingsStore } from "@/components/settings/SettingsModal"
import { apiRequest } from "@/lib/api"

export function SidebarProfile({ collapsed }: { collapsed: boolean }) {
  const { data: user } = useCurrentUser()
  const { theme, toggle } = useTheme()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const { open: openSettings } = useSettingsStore()

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout")
    queryClient.clear()
    router.push("/login")
  }

  const handleSettings = () => {
    setMenuOpen(false)
    openSettings()
  }

  if (!user) return null

  const initial = user.email.charAt(0).toUpperCase()

  if (collapsed) {
    return (
      <div className="relative flex justify-center py-2 flex-shrink-0 border-t border-[#2e2e2e]">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-7 h-7 rounded-full bg-[#10a37f] text-white flex items-center justify-center text-xs font-medium"
          aria-label="User menu"
        >
          {initial}
        </button>
        {menuOpen && (
          <div className="absolute bottom-11 left-2 rounded-lg border border-[#3e3e3e] bg-[#212121] shadow-lg py-1 min-w-[180px] z-50">
            <button
              onClick={toggle}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[#ececec] hover:bg-[#2b2b2b]"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button
              onClick={handleSettings}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[#ececec] hover:bg-[#2b2b2b]"
            >
              <Settings size={14} /> Settings
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[#ececec] hover:bg-[#2b2b2b]"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-[#2e2e2e] flex-shrink-0">
      <div className="w-7 h-7 rounded-full bg-[#10a37f] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[#ececec] truncate max-w-[140px]">{user.email}</div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={toggle}
          className="p-1.5 rounded-md hover:bg-[#2b2b2b] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
          aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          onClick={handleSettings}
          className="p-1.5 rounded-md hover:bg-[#2b2b2b] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
          aria-label="Settings"
        >
          <Settings size={15} />
        </button>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-md hover:bg-[#2b2b2b] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
          aria-label="Log out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  )
}
