"use client"

import { useState } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { useSessionDocument } from "@/hooks/queries"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { clsx } from "clsx"

export function DocumentToolbar() {
  const { activeSessionId, activeDocType, viewMode, setViewMode } = useSessionStore()
  const { data: doc } = useSessionDocument(activeSessionId!, activeDocType)
  const [exportOpen, setExportOpen] = useState(false)

  const handleExport = async (format: string) => {
    if (!activeSessionId) return
    setExportOpen(false)
    try {
      const blob = await apiRequest<Blob>("GET", `/api/sessions/${activeSessionId}/export?format=${format}`, undefined, {
        rawResponse: true,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resume.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format}`)
    } catch (err: any) {
      toast.error(err.message || "Export failed")
    }
  }

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-ink dark:text-[#ececec]">
          {activeDocType === "resume" ? "Resume" : "Cover Letter"}
        </h3>
        {doc && (
          <span className="text-xs text-slate dark:text-[#8e8e8e]">Version {doc.version}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-muted overflow-hidden">
          <button
            onClick={() => setViewMode("diff")}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "diff" ? "bg-brass text-white" : "text-slate dark:text-[#8e8e8e] hover:bg-[#f4f4f4] dark:hover:bg-[#40414f]"
            )}
          >
            Changes
          </button>
          <button
            onClick={() => setViewMode("final")}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "final" ? "bg-brass text-white" : "text-slate dark:text-[#8e8e8e] hover:bg-[#f4f4f4] dark:hover:bg-[#40414f]"
            )}
          >
            Final
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="rounded-lg border border-muted px-3 py-1.5 text-xs font-medium text-slate dark:text-[#8e8e8e] hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] transition-colors"
          >
            Export
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full mt-1 rounded-lg border border-muted bg-paper dark:bg-[#212121] shadow-lg py-1 min-w-[100px] z-20">
                {["tex", "pdf", "docx", "txt"].map((f) => (
                  <button
                    key={f}
                    onClick={() => handleExport(f)}
                    className="block w-full px-3 py-1.5 text-left text-xs text-slate dark:text-[#8e8e8e] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] uppercase"
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
