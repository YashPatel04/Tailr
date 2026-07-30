"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import type { Span } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { getSelectionOffsets, placeCaretAtPoint, placeCaretAtEnd } from "@/lib/textSelection"
import { toggleInlineFormat, setLinkUrl } from "@/lib/inlineFormat"
import { registerFormatTarget, unregisterFormatTarget } from "@/lib/formatTarget"

let nextRteId = 0

interface RichEditableFieldProps {
  value: string
  spans?: Span[]
  onSave: (newText: string, newSpans: Span[]) => void
  className?: string
  tag?: "span" | "div" | "h2" | "h1"
  placeholder?: string
  isBullet?: boolean
}

export function RichEditableField({
  value,
  spans = [],
  onSave,
  className = "",
  tag: Tag = "span",
  placeholder,
  isBullet = false,
}: RichEditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [draftSpans, setDraftSpans] = useState<Span[]>(spans)
  const containerRef = useRef<HTMLElement>(null)
  const rteId = useRef(`rte-${nextRteId++}`)
  const clickPosRef = useRef<{ x: number; y: number } | null>(null)

  const viewMode = useSessionStore((s) => s.viewMode)
  const setEditingFieldId = useSessionStore((s) => s.setEditingFieldId)

  const enterEditing = useCallback(
    (x?: number, y?: number) => {
      setEditing(true)
      setEditingFieldId(rteId.current)
      requestAnimationFrame(() => {
        containerRef.current?.focus()
        registerFormatTarget(rteId.current, { toggleFormat, addLink })
        if (x !== undefined && y !== undefined) {
          const placed = placeCaretAtPoint(containerRef.current!, x, y)
          if (!placed) {
            placeCaretAtEnd(containerRef.current!)
          }
        } else {
          placeCaretAtEnd(containerRef.current!)
        }
      })
    },
    [setEditingFieldId]
  )

  const commit = useCallback(() => {
    const newValue = containerRef.current?.textContent ?? draft
    setEditing(false)
    setEditingFieldId(null)
    unregisterFormatTarget(rteId.current)
    if (newValue !== value || JSON.stringify(draftSpans) !== JSON.stringify(spans)) {
      onSave(newValue, draftSpans)
    }
  }, [draft, draftSpans, value, spans, onSave, setEditingFieldId])

  const toggleFormat = useCallback(
    (format: "bold" | "italic" | "underline") => {
      if (!editing) return
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || !containerRef.current?.contains(sel.anchorNode)) return
      const offsets = getSelectionOffsets(containerRef.current)
      if (!offsets || offsets.start === offsets.end) return
      setDraftSpans((prev) => toggleInlineFormat(prev, offsets.start, offsets.end, format))
    },
    [editing]
  )

  const addLink = useCallback(() => {
    if (!editing) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !containerRef.current?.contains(sel.anchorNode)) return
    const offsets = getSelectionOffsets(containerRef.current)
    if (!offsets || offsets.start === offsets.end) return
    const url = window.prompt("Enter URL (https://...):", "https://")
    if (!url) return
    setDraftSpans((prev) => setLinkUrl(prev, offsets.start, offsets.end, url))
    containerRef.current?.focus()
  }, [editing])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode === "diff") return
      if (editing) return
      clickPosRef.current = { x: e.clientX, y: e.clientY }
    },
    [viewMode, editing]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode === "diff") return
      if (editing) return
      e.stopPropagation()
      const pos = clickPosRef.current
      clickPosRef.current = null
      enterEditing(pos?.x ?? e.clientX, pos?.y ?? e.clientY)
    },
    [viewMode, editing, enterEditing]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode === "diff") return
      e.stopPropagation()
      enterEditing(e.clientX, e.clientY)
    },
    [viewMode, enterEditing]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        if (editing) {
          containerRef.current!.textContent = value
          setDraftSpans(structuredClone(spans))
          commit()
        }
      }
      if (e.key === "Enter" && editing && !e.shiftKey && !isBullet) {
        e.preventDefault()
        commit()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && editing) {
        e.preventDefault()
        const range = document.createRange()
        range.selectNodeContents(containerRef.current!)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        toggleFormat("bold")
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault()
        toggleFormat("italic")
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault()
        toggleFormat("underline")
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        addLink()
      }
    },
    [editing, value, spans, isBullet, commit, toggleFormat, addLink]
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!editing) return
      if (containerRef.current?.contains(e.relatedTarget as Node)) return
      if ((e.relatedTarget as HTMLElement)?.closest("[data-inline-toolbar]")) return
      commit()
    },
    [editing, commit]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!editing) return
      e.preventDefault()
      const text = e.clipboardData.getData("text/plain")
      document.execCommand("insertText", false, text)
    },
    [editing]
  )

  useEffect(() => {
    if (!editing) {
      setDraft(value)
      setDraftSpans(structuredClone(spans))
    }
  }, [value, spans, editing])

  useEffect(() => {
    if (!editing) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement)?.closest("[data-inline-toolbar]")
      ) {
        commit()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [editing, commit])

  useEffect(() => {
    if (value === " " && placeholder && !editing) {
      enterEditing()
    }
  }, [value, placeholder, editing, enterEditing])

  const isEmpty = !value || !value.trim()
  const isLink = spans.some((s) => s.link_url)

  const renderFormatted = () => {
    if (!spans.length && !value) return value
    if (isLink) {
      return (
        <span className="text-brass hover:underline cursor-pointer">
          {value}
        </span>
      )
    }
    if (!spans.length) return value
    return (
      <span>
        {Array.from(value).map((char, i) => {
          const activeFormats = spans
            .filter((s) => i >= s.start && i < s.end)
            .flatMap((s) => s.formats)
          const cls: string[] = []
          if (activeFormats.includes("bold")) cls.push("font-bold")
          if (activeFormats.includes("italic")) cls.push("italic")
          if (activeFormats.includes("underline")) cls.push("underline")
          return (
            <span key={i} className={cls.length > 0 ? cls.join(" ") : undefined}>
              {char}
            </span>
          )
        })}
      </span>
    )
  }

  const stateClass = editing
    ? "caret-brass"
    : "hover:bg-brass/5"

  const draggable = !editing

  return (
    <Tag
      ref={containerRef as any}
      contentEditable={editing}
      suppressContentEditableWarning
      data-rte-id={rteId.current}
      data-field-id={rteId.current}
      className={`cursor-text rounded px-0.5 -mx-0.5 transition-colors outline-none ${stateClass} ${className}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onInput={() => setDraft(containerRef.current?.textContent ?? "")}
      onPaste={handlePaste}
      data-drag-disabled={!draggable}
    >
      {isEmpty && placeholder && !editing ? (
        <span className="text-brass italic cursor-pointer hover:bg-brass/10 rounded px-1 -mx-1 transition-colors">
          + {placeholder}
        </span>
      ) : (
        renderFormatted()
      )}
    </Tag>
  )
}
