"use client"

import { useState } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { clsx } from "clsx"
import { DocumentTabs } from "./DocumentTabs"

export function DocumentTopBar() {
  const { activeSessionId, activeDocType, viewMode, setViewMode } = useSessionStore()
  const [exportOpen, setExportOpen] = useState(false)

  const isCoverLetter = activeDocType === "cover_letter"
  const exportFormats = isCoverLetter ? ["pdf", "docx"] : ["pdf", "docx", "txt", "tex"]
  const fileName = isCoverLetter ? "cover_letter" : "resume"

  const handleExport = async (format: string) => {
    if (!activeSessionId) return
    setExportOpen(false)
    try {
      const blob = await apiRequest<Blob>(
        "GET",
        `/api/sessions/${activeSessionId}/export?format=${format}&doc_type=${activeDocType}`,
        undefined,
        { rawResponse: true }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${fileName}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format}`)
    } catch (err: any) {
      toast.error(err.message || "Export failed")
    }
  }

  const showViewMode = activeDocType === "resume"

  return (
    <div className="flex items-center gap-2 mb-2 justify-between sticky top-0 bg-canvas/80 dark:bg-[#212121]/80 backdrop-blur-md z-50 py-2">
      <DocumentTabs />
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            "flex rounded-lg border border-muted overflow-hidden transition-all duration-300 ease-in-out",
            showViewMode ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0 border-0 overflow-hidden"
          )}
        >
          <button
            onClick={() => setViewMode("diff")}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "diff"
                ? "bg-[#1a73e8] dark:bg-[#8ab4f8] text-white dark:text-[#202124]"
                : "text-slate dark:text-[#8e8e8e] hover:bg-[#f4f4f4] dark:hover:bg-[#3c4043]"
            )}
          >
            Changes
          </button>
          <button
            onClick={() => setViewMode("final")}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "final"
                ? "bg-[#1a73e8] dark:bg-[#8ab4f8] text-white dark:text-[#202124]"
                : "text-slate dark:text-[#8e8e8e] hover:bg-[#f4f4f4] dark:hover:bg-[#3c4043]"
            )}
          >
            Current
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="rounded-lg border border-muted px-3 py-1.5 text-xs font-medium text-slate dark:text-[#8e8e8e] hover:bg-[#f4f4f4] dark:hover:bg-[#3c4043] transition-colors"
          >
            Export
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full mt-1 rounded-lg border border-muted bg-white dark:bg-[#202124] shadow-lg py-1 min-w-[100px] z-20">
                {exportFormats.map((f) => (
                  <button
                    key={f}
                    onClick={() => handleExport(f)}
                    className="block w-full px-3 py-1.5 text-left text-xs text-slate dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] uppercase transition-colors"
                  >
                    .{f}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
