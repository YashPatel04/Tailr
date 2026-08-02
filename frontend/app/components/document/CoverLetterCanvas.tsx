"use client"

import { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSessionStore } from "@/stores/sessionStore"
import { EditableField } from "@/components/document/EditableField"
import { queueEdit } from "@/lib/editQueue"
import { getApiBaseUrl } from "@/lib/env"
import { getCsrfToken } from "@/lib/api"
import { Mail, Plus, Loader2 } from "lucide-react"

interface CoverLetterParagraph {
  id: string
  text: string
}

interface CoverLetterData {
  type: string
  salutation: string
  paragraphs: CoverLetterParagraph[]
  closing: string
}

interface CoverLetterCanvasProps {
  content: CoverLetterData | null
}

export function CoverLetterCanvas({ content }: CoverLetterCanvasProps) {
  const { activeSessionId } = useSessionStore()
  const queryClient = useQueryClient()
  const [generating, setGenerating] = useState(false)

  // Normalize content — handles null, legacy {text, type}, and structured format
  const normalized: CoverLetterData = (() => {
    if (!content) return { type: "cover_letter", salutation: "", paragraphs: [], closing: "" }
    const raw = content as any
    const paras = Array.isArray(raw.paragraphs) ? raw.paragraphs : []
    if (paras.length === 0 && raw.text) {
      return {
        type: "cover_letter",
        salutation: "",
        paragraphs: [{ id: "legacy", text: raw.text }],
        closing: "",
      }
    }
    return {
      type: raw.type || "cover_letter",
      salutation: raw.salutation || "",
      paragraphs: paras,
      closing: raw.closing || "",
    }
  })()

  const hasContent = normalized.salutation || normalized.paragraphs.length > 0 || normalized.closing

  const handleGenerate = useCallback(async () => {
    if (!activeSessionId) return
    setGenerating(true)
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch(
        `${getApiBaseUrl()}/api/sessions/${activeSessionId}/generate-cover-letter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          credentials: "include",
        }
      )
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["sessions"] })
        queryClient.invalidateQueries({
          queryKey: ["sessions", activeSessionId, "messages", "cover_letter"],
        })
      }
    } catch {}
    setGenerating(false)
  }, [activeSessionId, queryClient])

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-[#10a37f]/10 flex items-center justify-center mb-5">
          <Mail size={28} className="text-[#10a37f]" />
        </div>
        <h3 className="text-lg font-semibold text-ink dark:text-[#ececec] mb-2">
          No cover letter yet
        </h3>
        <p className="text-sm text-slate dark:text-[#8e8e8e] mb-6 text-center max-w-[320px]">
          Generate a tailored cover letter for this session based on the job description.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#10a37f] text-white text-sm font-medium hover:bg-[#0d8c6d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Mail size={16} />
              Generate Cover Letter
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="paper rounded-lg p-8 space-y-4">
      <EditableField
        value={normalized.salutation}
        onSave={(val) => queueEdit({ op: "update_salutation", text: val })}
        className="text-sm text-ink dark:text-[#ececec] leading-relaxed font-medium"
        tag="div"
      />

      {normalized.paragraphs.map((para) => (
        <div key={para.id}>
          <div className="my-2 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex-1 h-px bg-[#3a3a3a]" />
            <button
              onClick={() => queueEdit({ op: "add_paragraph", text: "", after_id: para.id })}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#2a2a2a] transition-colors"
            >
              <Plus size={10} />
              Paragraph
            </button>
            <div className="flex-1 h-px bg-[#3a3a3a]" />
          </div>
          <EditableField
            value={para.text}
            onSave={(val) => queueEdit({ op: "update_paragraph", id: para.id, text: val })}
            className="text-sm text-ink dark:text-[#ececec] leading-relaxed"
            tag="div"
          />
        </div>
      ))}

      <div className="my-2 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex-1 h-px bg-[#3a3a3a]" />
        <button
          onClick={() => queueEdit({ op: "add_paragraph", text: "" })}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#2a2a2a] transition-colors"
        >
          <Plus size={10} />
          Paragraph
        </button>
        <div className="flex-1 h-px bg-[#3a3a3a]" />
      </div>

      <div className="pt-2 border-t border-[#3a3a3a]">
        <EditableField
          value={normalized.closing}
          onSave={(val) => queueEdit({ op: "update_closing", text: val })}
          className="text-sm text-ink dark:text-[#ececec] leading-relaxed whitespace-pre-wrap"
          tag="div"
        />
      </div>
    </div>
  )
}
