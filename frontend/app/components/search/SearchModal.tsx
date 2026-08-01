"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { useSearchStore } from "@/stores/searchStore"
import { useSessions, useCompanies, useTags } from "@/hooks/queries"
import { useRouter } from "next/navigation"
import { MessageSquare, Building2, Hash } from "lucide-react"

interface ResultItem {
  type: "chat" | "company" | "tag"
  id?: string
  label: string
  sublabel?: string
  count?: number
}

export function SearchModal() {
  const { isOpen, close } = useSearchStore()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const { data: sessions } = useSessions()
  const { data: companies } = useCompanies()
  const { data: tags } = useTags()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(t)
  }, [query])

  const q = debouncedQuery.toLowerCase().trim()

  const filteredChats = useMemo(() => (sessions || [])
    .filter((s) => q && (
      (s.company_name && s.company_name.toLowerCase().includes(q)) ||
      (s.role_title && s.role_title.toLowerCase().includes(q))
    ))
    .slice(0, 5),
    [sessions, q])

  const filteredCompanies = useMemo(() => (companies || [])
    .filter((c) => q && c.company_name.toLowerCase().includes(q))
    .slice(0, 3),
    [companies, q])

  const filteredTags = useMemo(() => (tags || [])
    .filter((t) => q && t.tag.toLowerCase().includes(q))
    .slice(0, 3),
    [tags, q])

  const results: ResultItem[] = useMemo(() => [
    ...filteredChats.map((s) => ({ type: "chat" as const, id: s.id, label: `${s.company_name} - ${s.role_title}`, sublabel: s.role_title })),
    ...filteredCompanies.map((c) => ({ type: "company" as const, id: c.company_name, label: c.company_name, count: c.session_count })),
    ...filteredTags.map((t) => ({ type: "tag" as const, id: t.tag, label: t.tag, count: t.session_count })),
  ], [filteredChats, filteredCompanies, filteredTags])

  const total = results.length
  const [selectedIndex, setSelectedIndex] = useState(0)

  const handleSelect = useCallback((item: ResultItem) => {
    close()
    if (item.type === "chat") router.push(`/session/${item.id}`)
    else if (item.type === "company") router.push(`/company/${encodeURIComponent(item.id!)}`)
    else if (item.type === "tag") router.push(`/tag/${encodeURIComponent(item.id!)}`)
  }, [close, router])

  useEffect(() => {
    setSelectedIndex(0)
  }, [debouncedQuery])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, total - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === "Enter" && results.length > 0) {
        handleSelect(results[selectedIndex])
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, close, total, results, selectedIndex, handleSelect])

  if (!isOpen || !mounted) return null

  const chatCount = filteredChats.length
  const companyCount = filteredCompanies.length
  const tagCount = filteredTags.length

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={close} />
      <div className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-xl rounded-xl bg-paper dark:bg-[#212121] shadow-2xl border border-muted overflow-hidden z-50">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats, companies, tags..."
          className="w-full bg-transparent px-4 py-4 text-base text-ink dark:text-[#ececec] placeholder:text-[#8e8e8e] outline-none border-b border-muted"
        />
        {q ? (
          results.length > 0 ? (
            <div className="max-h-[380px] overflow-y-auto p-2">
              {chatCount > 0 && (
                <>
                  <div                   className="px-3 py-1.5 text-xs font-semibold uppercase text-slate dark:text-[#8e8e8e] tracking-wider">Chats</div>
                  {filteredChats.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelect({ type: "chat", id: s.id, label: `${s.company_name} - ${s.role_title}` })}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-left transition-colors ${i === selectedIndex ? "bg-[#f4f4f4] dark:bg-[#2b2b2b]" : "hover:bg-[#f7f7f8] dark:hover:bg-[#40414f]"}`}
                    >
                      <MessageSquare size={16} className="text-slate dark:text-[#8e8e8e] flex-shrink-0" />
                      <span className="text-sm text-ink dark:text-[#ececec] truncate">{s.company_name} - {s.role_title}</span>
                      {s.is_archived && (
                        <span className="ml-auto text-xs text-[#6e6e6e] flex-shrink-0">(archived)</span>
                      )}
                    </button>
                  ))}
                </>
              )}
              {companyCount > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase text-slate dark:text-[#8e8e8e] tracking-wider">Companies</div>
                  {filteredCompanies.map((c) => (
                    <button
                      key={c.company_name}
                      onClick={() => handleSelect({ type: "company", id: c.company_name, label: c.company_name, count: c.session_count })}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-left hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors"
                    >
                      <Building2 size={16} className="text-slate dark:text-[#8e8e8e] flex-shrink-0" />
                      <span className="text-sm text-ink dark:text-[#ececec]">{c.company_name}</span>
                      <span className="ml-auto text-xs text-slate dark:text-[#8e8e8e]">{c.session_count}</span>
                    </button>
                  ))}
                </>
              )}
              {tagCount > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase text-slate dark:text-[#8e8e8e] tracking-wider">Tags</div>
                  {filteredTags.map((t) => (
                    <button
                      key={t.tag}
                      onClick={() => handleSelect({ type: "tag", id: t.tag, label: t.tag, count: t.session_count })}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-left hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors"
                    >
                      <Hash size={16} className="text-slate dark:text-[#8e8e8e] flex-shrink-0" />
                      <span className="text-sm text-ink dark:text-[#ececec]">{t.tag}</span>
                      <span className="ml-auto text-xs text-slate dark:text-[#8e8e8e]">{t.session_count}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-slate dark:text-[#8e8e8e] text-sm">
              No results for &apos;{debouncedQuery}&apos;
            </div>
          )
        ) : null}
      </div>
    </>,
    document.body
  )
}
