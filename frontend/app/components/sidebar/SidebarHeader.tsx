"use client"

import { Search, PanelLeftClose, PanelLeftOpen } from "lucide-react"
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
            <PanelLeftOpen size={16} />
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-lg flex-shrink-0">📄</span>
            <span className="text-sm font-semibold text-[#ececec]">Tailr</span>
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
