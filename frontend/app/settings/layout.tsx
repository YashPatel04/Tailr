"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { clsx } from "clsx"
import { Moon, Sun, X } from "lucide-react"
import { useTheme } from "@/components/theme/ThemeProvider"

const NAV_ITEMS = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Providers", href: "/settings/providers" },
  { label: "Master Resume", href: "/settings/master-resume" },
  { label: "Account", href: "/settings/account" },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex bg-paper dark:bg-[#212121]">
      <nav className="w-[220px] flex-shrink-0 border-r border-muted bg-[#f9fafb] dark:bg-[#2b2b2b] flex flex-col">
        <div className="px-4 py-4 border-b border-muted">
          <h2 className="text-lg font-semibold text-ink dark:text-[#ececec]">Settings</h2>
        </div>
        <ul className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brass/10 dark:bg-brass/20 text-brass"
                      : "text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] hover:bg-slate/5 dark:hover:bg-[#343541]"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="px-2 py-3 border-t border-muted">
          <button
            onClick={toggle}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] hover:bg-slate/5 dark:hover:bg-[#343541] transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </nav>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-end px-6 py-4 border-b border-muted flex-shrink-0">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-lg hover:bg-slate/10 dark:hover:bg-[#40414f] text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] transition-colors"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[640px] px-8 py-10">{children}</div>
        </main>
      </div>
    </div>,
    document.body
  )
}
