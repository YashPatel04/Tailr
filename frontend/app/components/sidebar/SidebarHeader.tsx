"use client"

import { Search, PanelLeftClose, PanelRightOpen } from "lucide-react"
import { clsx } from "clsx"
import { useSearchStore } from "@/stores/searchStore"

interface SidebarHeaderProps {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarHeader({ collapsed, onToggle }: SidebarHeaderProps) {
  const { open } = useSearchStore()

  return (
    <div
      className={clsx(
        "flex items-center flex-shrink-0",
        collapsed ? "flex-col justify-center gap-1.5 py-2 h-auto" : "h-12 px-3 justify-between"
      )}
    >
      {collapsed ? (
        <>
          <button
            onClick={open}
            className="p-1 rounded-md hover:bg-[#2b2b2b] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
            aria-label="Search"
          >
            <Search size={16} />
          </button>
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-[#2b2b2b] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelRightOpen size={16} />
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#10a37f"/>
              <path d="M12 6v12M6 12h12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-sm font-semibold text-[#ececec]">Resume Tailor</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={open}
              className="p-1.5 rounded-md hover:bg-[#2b2b2b] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-md hover:bg-[#2b2b2b] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
