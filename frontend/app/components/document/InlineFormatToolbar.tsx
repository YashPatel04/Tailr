"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { Bold, Italic, Underline, Link } from "lucide-react"

export function InlineFormatToolbar() {
  const editingFieldId = useSessionStore((s) => s.editingFieldId)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const toolbarRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const activeFieldRef = useRef<string | null>(null)
  const savedRangeRef = useRef<Range | null>(null)

  useEffect(() => {
    if (!editingFieldId) {
      setVisible(false)
      setLinkOpen(false)
      activeFieldRef.current = null
      savedRangeRef.current = null
      return
    }

    activeFieldRef.current = editingFieldId
    const el = document.querySelector(`[data-field-id="${editingFieldId}"]`) as HTMLElement
    if (!el) return

    const updatePosition = () => {
      if (activeFieldRef.current !== editingFieldId) return
      const rect = el.getBoundingClientRect()
      const toolbarWidth = 180
      setPosition({
        top: rect.top - 44,
        left: rect.left + rect.width / 2 - toolbarWidth / 2,
      })
      setVisible(true)
    }

    updatePosition()

    return () => {
      activeFieldRef.current = null
    }
  }, [editingFieldId])

  useEffect(() => {
    if (linkOpen && linkInputRef.current) {
      linkInputRef.current.focus()
    }
  }, [linkOpen])

  const handleAction = useCallback((action: "bold" | "italic" | "underline" | "link") => {
    if (action === "link") {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange()
      }
      setLinkOpen(true)
      setLinkUrl("")
    } else {
      const el = document.querySelector(
        `[data-field-id="${activeFieldRef.current}"]`
      ) as HTMLElement
      if (el) {
        el.focus()
        document.execCommand(action)
      }
    }
  }, [])

  const handleApplyLink = useCallback(() => {
    if (linkUrl.trim() && savedRangeRef.current) {
      const el = document.querySelector(
        `[data-field-id="${activeFieldRef.current}"]`
      ) as HTMLElement
      if (el) {
        el.focus()
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(savedRangeRef.current)
          const range = sel.getRangeAt(0)
          const a = document.createElement("a")
          a.href = linkUrl
          a.target = "_blank"
          a.rel = "noopener noreferrer"
          a.className = "text-brass hover:underline"
          range.surroundContents(a)
        }
      }
    }
    setLinkOpen(false)
    setLinkUrl("")
    savedRangeRef.current = null
  }, [linkUrl])

  const handleCancelLink = useCallback(() => {
    setLinkOpen(false)
    setLinkUrl("")
    savedRangeRef.current = null
    const el = document.querySelector(`[data-field-id="${activeFieldRef.current}"]`) as HTMLElement
    if (el) el.focus()
  }, [])

  if (!visible || !editingFieldId) return null

  return (
    <>
      <div
        ref={toolbarRef}
        data-inline-toolbar
        className="fixed z-50 flex items-center gap-0.5 bg-[#1e1e1e] rounded-lg p-1 shadow-lg"
        style={{ top: position.top, left: position.left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          onClick={() => handleAction("bold")}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] text-[#e0e0e0] transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => handleAction("italic")}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] text-[#e0e0e0] transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic size={14} />
        </button>
        <button
          onClick={() => handleAction("underline")}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] text-[#e0e0e0] transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline size={14} />
        </button>
        <div className="w-px h-4 bg-[#3c3c3c] mx-0.5" />
        <button
          onClick={() => handleAction("link")}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] text-[#e0e0e0] transition-colors"
          title="Link (Ctrl+K)"
        >
          <Link size={14} />
        </button>
      </div>
      {linkOpen && (
        <div
          data-inline-toolbar
          className="fixed z-50 flex items-center gap-2 bg-[#1e1e1e] rounded-lg p-1.5 shadow-lg"
          style={{ top: position.top - 40, left: position.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyLink()
              if (e.key === "Escape") handleCancelLink()
            }}
            placeholder="https://..."
            className="w-60 px-2 py-1 rounded border border-[#3c3c3c] bg-[#2a2a2a] text-[#ececec] text-sm outline-none focus:border-[#10a37f]"
          />
          <button
            onClick={handleApplyLink}
            className="px-3 py-1 rounded bg-[#10a37f] text-white text-xs font-medium hover:opacity-90"
          >
            Apply
          </button>
          <button
            onClick={handleCancelLink}
            className="px-2 py-1 rounded text-[#999] text-xs hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  )
}
