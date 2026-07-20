"use client"

import { useState } from "react"
import { Folder, ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useCompanies } from "@/hooks/queries"
import { clsx } from "clsx"

export function SidebarProjects({ collapsed }: { collapsed: boolean }) {
  const { data: companies } = useCompanies()
  const [expanded, setExpanded] = useState(true)

  if (collapsed || !companies || companies.length === 0) return null

  return (
    <div className="flex-shrink-0 overflow-y-auto">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#8e8e8e] hover:bg-[#212121] cursor-pointer"
      >
        <span>Companies</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {expanded && (
        <div>
          {companies.map((c) => (
            <Link
              key={c.company_name}
              href={`/company/${encodeURIComponent(c.company_name)}`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#ececec] hover:bg-[#212121] transition-colors"
            >
              <Folder size={14} className="text-[#8e8e8e] flex-shrink-0" />
              <span className="truncate">{c.company_name}</span>
              <span className="ml-auto flex-shrink-0 rounded-full bg-[#2b2b2b] px-1.5 py-0.5 text-xs text-[#8e8e8e]">
                {c.session_count}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
