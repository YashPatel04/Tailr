"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, AlertCircle, Search } from "lucide-react"
import { useProviders, useAllModels } from "@/hooks/queries"
import type { ModelInfo } from "@/types"

interface ModelPickerProps {
  selectedProviderId: string | null
  selectedModel: string | null
  onSelect: (providerId: string, model: string) => void
  compact?: boolean
}

interface ProviderModels {
  providerId: string
  providerName: string
  providerType: string
  apiKeyLastFour: string | null
  models: ModelInfo[]
  available: boolean
}

export function ModelPicker({
  selectedProviderId,
  selectedModel,
  onSelect,
  compact = false,
}: ModelPickerProps) {
  const { data: providers } = useProviders()
  const { data: allModels } = useAllModels(providers)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  const providerModels: ProviderModels[] = (providers || []).map((p) => {
    const pm = allModels?.find((am) => am.providerId === p.id)
    return {
      providerId: p.id,
      providerName: p.name,
      providerType: p.provider_type,
      apiKeyLastFour: p.api_key_last_four,
      models: pm?.models || [],
      available: pm?.available ?? false,
    }
  })

  const selectedDisplay = selectedModel || "Select model"

  const q = search.toLowerCase()
  const filtered = q
    ? providerModels.map((pm) => ({
        ...pm,
        models: pm.models.filter(
          (m) =>
            m.display_name.toLowerCase().includes(q) ||
            m.id.toLowerCase().includes(q)
        ),
      }))
    : providerModels

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded-md border border-muted bg-paper dark:bg-[#2b2b2b] transition-colors ${
          compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
        } text-ink dark:text-[#ececec] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f]`}
      >
        <span className="truncate max-w-[180px]">{selectedDisplay}</span>
        <ChevronDown size={compact ? 12 : 14} className="flex-shrink-0" />
      </button>

      <DropdownPanel
        open={open}
        search={search}
        setSearch={setSearch}
        searchRef={searchRef}
        filtered={filtered}
        providerModels={providerModels}
        selectedProviderId={selectedProviderId}
        selectedModel={selectedModel}
        onSelect={onSelect}
        setOpen={setOpen}
      />
    </div>
  )
}

function DropdownPanel({
  open,
  search,
  setSearch,
  searchRef,
  filtered,
  providerModels,
  selectedProviderId,
  selectedModel,
  onSelect,
  setOpen,
}: {
  open: boolean
  search: string
  setSearch: (v: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  filtered: ProviderModels[]
  providerModels: ProviderModels[]
  selectedProviderId: string | null
  selectedModel: string | null
  onSelect: (providerId: string, model: string) => void
  setOpen: (v: boolean) => void
}) {
  if (!open) return null

  return (
    <div className="absolute left-0 top-full mt-1 z-50 w-[280px] max-h-[360px] rounded-lg border border-muted bg-paper dark:bg-[#212121] shadow-lg flex flex-col">
      <div className="px-2 py-1.5 border-b border-muted">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate dark:text-[#8e8e8e]"
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false)
                setSearch("")
              }
            }}
            className="w-full rounded-md bg-[#f7f7f8] dark:bg-[#2b2b2b] pl-7 pr-2 py-1.5 text-sm text-ink dark:text-[#ececec] placeholder:text-slate dark:placeholder:text-[#8e8e8e] outline-none focus:ring-1 focus:ring-brass/40"
          />
        </div>
      </div>
      <div className="overflow-y-auto max-h-[300px]">
        {providerModels.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-slate dark:text-[#8e8e8e]">
            No providers configured
          </div>
        )}
        {filtered.map((pm) => (
          <ModelGroup
            key={pm.providerId}
            pm={pm}
            selectedProviderId={selectedProviderId}
            selectedModel={selectedModel}
            onSelect={onSelect}
            setOpen={setOpen}
          />
        ))}
      </div>
    </div>
  )
}

function ModelGroup({
  pm,
  selectedProviderId,
  selectedModel,
  onSelect,
  setOpen,
}: {
  pm: ProviderModels
  selectedProviderId: string | null
  selectedModel: string | null
  onSelect: (providerId: string, model: string) => void
  setOpen: (v: boolean) => void
}) {
  return (
    <div>
      <div className="px-3 py-1.5 text-xs font-semibold text-slate dark:text-[#8e8e8e] bg-[#f9fafb] dark:bg-[#2b2b2b] border-b border-muted flex items-center justify-between">
        <span>{pm.providerName}</span>
        <span className="font-normal capitalize">{pm.providerType}</span>
      </div>
      {!pm.available ? (
        <div className="px-3 py-2 flex items-center gap-2 text-xs text-slate dark:text-[#8e8e8e]">
          <AlertCircle size={12} />
          <span>Unavailable</span>
        </div>
      ) : pm.models.length === 0 ? (
        <div className="px-3 py-2 text-xs text-slate dark:text-[#8e8e8e]">
          No models found
        </div>
      ) : (
        pm.models.map((m) => {
          const isSelected =
            selectedProviderId === pm.providerId && selectedModel === m.id
          return (
            <button
              key={`${pm.providerId}-${m.id}`}
              onClick={() => {
                onSelect(pm.providerId, m.id)
                setOpen(false)
              }}
              className={`flex w-full items-center px-3 py-1.5 text-sm transition-colors ${
                isSelected
                  ? "bg-brass/10 text-brass"
                  : "text-ink dark:text-[#ececec] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f]"
              }`}
            >
              <span className="truncate">{m.display_name}</span>
            </button>
          )
        })
      )}
    </div>
  )
}
