"use client"

import { clsx } from "clsx"
import { SidebarHeader } from "./SidebarHeader"
import { SidebarNewChat } from "./SidebarNewChat"
import { SidebarProjects } from "./SidebarProjects"
import { SidebarHistory } from "./SidebarHistory"
import { SidebarProfile } from "./SidebarProfile"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={clsx(
        "flex flex-col h-screen bg-[#171717] transition-[width] duration-200 ease-in-out flex-shrink-0",
        collapsed ? "w-[52px]" : "w-[260px]"
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
      <SidebarNewChat collapsed={collapsed} />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <SidebarProjects collapsed={collapsed} />
        <SidebarHistory collapsed={collapsed} />
      </div>
      <SidebarProfile collapsed={collapsed} />
    </aside>
  )
}
