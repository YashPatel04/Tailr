"use client"
import { useState, useRef, useCallback } from "react"
import { Bold, Italic, Underline, Code } from "lucide-react"
import type { Span } from "@/types"

interface RichEditableFieldProps {
  value: string
  spans?: Span[]
  onSave: (newText: string, newSpans: Span[]) => void
  className?: string
  tag?: "span" | "div" | "h2" | "h1"
}

export function RichEditableField({ value, spans = [], onSave, className = "", tag: Tag = "span" }: RichEditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [draftSpans, setDraftSpans] = useState<Span[]>(spans)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const startEdit = useCallback(() => {
    setDraft(value)
    setDraftSpans(structuredClone(spans))
    setEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [value, spans])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft.trim() !== value || JSON.stringify(draftSpans) !== JSON.stringify(spans)) {
      onSave(draft.trim(), draftSpans)
    }
  }, [draft, draftSpans, value, spans, onSave])

  const toggleFormat = useCallback((format: Span["formats"][number]) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (start === end) return

    const existingIdx = draftSpans.findIndex(s => s.start === start && s.end === end)
    if (existingIdx >= 0) {
      const existingSpans = [...draftSpans]
      const existingSpan = { ...existingSpans[existingIdx] }
      if ((existingSpan.formats as string[]).includes(format)) {
        existingSpan.formats = existingSpan.formats.filter(f => f !== format) as Span["formats"]
        if (existingSpan.formats.length === 0) {
          existingSpans.splice(existingIdx, 1)
          setDraftSpans(existingSpans)
        } else {
          existingSpans[existingIdx] = existingSpan
          setDraftSpans(existingSpans)
        }
      } else {
        existingSpan.formats = [...existingSpan.formats, format]
        existingSpans[existingIdx] = existingSpan
        setDraftSpans(existingSpans)
      }
    } else {
      setDraftSpans([...draftSpans, { start, end, formats: [format], link_url: null }])
    }
    ta.focus()
  }, [draftSpans])

  const renderFormatted = () => {
    if (!spans.length) return value
    return (
      <span>
        {Array.from(value).map((char, i) => {
          const activeFormats = spans
            .filter(s => i >= s.start && i < s.end)
            .flatMap(s => s.formats)
          const cls: string[] = []
          if (activeFormats.includes("bold")) cls.push("font-bold")
          if (activeFormats.includes("italic")) cls.push("italic")
          if (activeFormats.includes("underline")) cls.push("underline")
          if (activeFormats.includes("code")) cls.push("font-mono text-sm bg-slate/10 px-0.5 rounded")
          return <span key={i} className={cls.length > 0 ? cls.join(" ") : undefined}>{char}</span>
        })}
      </span>
    )
  }

  if (editing) {
    return (
      <div className="relative">
        <div className="flex gap-1 mb-1 bg-white dark:bg-[#2d2d2d] border border-blue-400 rounded-t px-1 py-0.5">
          <button onClick={() => toggleFormat("bold")} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="Bold (Ctrl+B)"><Bold size={14} /></button>
          <button onClick={() => toggleFormat("italic")} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="Italic (Ctrl+I)"><Italic size={14} /></button>
          <button onClick={() => toggleFormat("underline")} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="Underline (Ctrl+U)"><Underline size={14} /></button>
          <button onClick={() => toggleFormat("code")} className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="Code"><Code size={14} /></button>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setDraft(value); setDraftSpans(structuredClone(spans)); setEditing(false) }
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit() }
            if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); toggleFormat("bold") }
            if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); toggleFormat("italic") }
            if ((e.ctrlKey || e.metaKey) && e.key === "u") { e.preventDefault(); toggleFormat("underline") }
          }}
          className={`border border-blue-400 border-t-0 rounded-b px-1 py-0.5 bg-white dark:bg-[#2d2d2d] text-inherit outline-none w-full min-h-[2em] resize-y ${className}`}
          autoFocus
          rows={2}
        />
      </div>
    )
  }

  return (
    <Tag
      onClick={startEdit}
      className={`cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-0.5 -mx-0.5 transition-colors ${className}`}
      title="Click to edit (select text for bold/italic)"
    >
      {renderFormatted()}
    </Tag>
  )
}
