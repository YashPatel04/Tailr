"use client"
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react"
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
  const editingRef = useRef(false)
  const mousedownInsideRef = useRef(false)
  const pendingCaretRef = useRef<{ x: number; y: number } | null>(null)

  const viewMode = useSessionStore((s) => s.viewMode)
  const setEditingFieldId = useSessionStore((s) => s.setEditingFieldId)

  const enterEditing = useCallback(
    (x?: number, y?: number) => {
      pendingCaretRef.current = x !== undefined && y !== undefined ? { x, y } : null
      setEditing(true)
      editingRef.current = true
      setEditingFieldId(rteId.current)
    },
    [setEditingFieldId]
  )

  const commit = useCallback(() => {
    if (!editingRef.current) return
    const newValue = containerRef.current?.textContent ?? draft
    editingRef.current = false
    setEditing(false)
    setEditingFieldId(null)
    unregisterFormatTarget(rteId.current)
    pendingCaretRef.current = null
    if (newValue !== value || JSON.stringify(draftSpans) !== JSON.stringify(spans)) {
      onSave(newValue, draftSpans)
    }
  }, [draft, draftSpans, value, spans, onSave, setEditingFieldId])

  const toggleFormat = useCallback((format: "bold" | "italic" | "underline") => {
    if (!editingRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !containerRef.current?.contains(sel.anchorNode)) return
    const offsets = getSelectionOffsets(containerRef.current)
    if (!offsets || offsets.start === offsets.end) return
    setDraftSpans((prev) => toggleInlineFormat(prev, offsets.start, offsets.end, format))
  }, [])

  const addLink = useCallback(() => {
    if (!editingRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !containerRef.current?.contains(sel.anchorNode)) return
    const offsets = getSelectionOffsets(containerRef.current)
    if (!offsets || offsets.start === offsets.end) return
    const url = window.prompt("Enter URL (https://...):", "https://")
    if (!url) return
    setDraftSpans((prev) => setLinkUrl(prev, offsets.start, offsets.end, url))
    containerRef.current?.focus()
  }, [])

  useLayoutEffect(() => {
    if (!editing) return
    const el = containerRef.current
    if (!el) return
    el.focus()
    registerFormatTarget(rteId.current, { toggleFormat, addLink })
    const pos = pendingCaretRef.current
    pendingCaretRef.current = null
    if (pos) {
      if (!placeCaretAtPoint(el, pos.x, pos.y)) {
        placeCaretAtEnd(el)
      }
    } else {
      placeCaretAtEnd(el)
    }
  }, [editing, toggleFormat, addLink])

  const handleMouseDown = useCallback(
    (_e: React.MouseEvent) => {
      if (viewMode === "changes") return
      mousedownInsideRef.current = true
    },
    [viewMode]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode === "changes") return
      if (editingRef.current) return
      e.stopPropagation()
      enterEditing(e.clientX, e.clientY)
    },
    [viewMode, enterEditing]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode === "changes") return
      e.stopPropagation()
      enterEditing(e.clientX, e.clientY)
    },
    [viewMode, enterEditing]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        if (editingRef.current) {
          containerRef.current!.textContent = value
          setDraftSpans(structuredClone(spans))
          commit()
        }
        return
      }
      if (e.key === "Enter" && editingRef.current && !e.shiftKey && !isBullet) {
        e.preventDefault()
        commit()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && editingRef.current) {
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
    [value, spans, isBullet, commit, toggleFormat, addLink]
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!editingRef.current) return
      if (containerRef.current?.contains(e.relatedTarget as Node)) return
      if ((e.relatedTarget as HTMLElement)?.closest("[data-inline-toolbar]")) return
      commit()
    },
    [commit]
  )

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!editingRef.current) return
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
  }, [])

  useEffect(() => {
    if (!editing) {
      setDraft(value)
      setDraftSpans(structuredClone(spans))
    }
  }, [value, spans, editing])

  useEffect(() => {
    if (!editingRef.current) return
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (!editingRef.current) return
      if (mousedownInsideRef.current) {
        mousedownInsideRef.current = false
        return
      }
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement)?.closest("[data-inline-toolbar]")
      ) {
        commit()
      }
    }
    document.addEventListener("mousedown", handleDocumentMouseDown)
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown)
  }, [editing, commit])

  const autoEnteredRef = useRef(false)

  useEffect(() => {
    if (value === " " && placeholder && !editing && !autoEnteredRef.current) {
      autoEnteredRef.current = true
      enterEditing()
    }
  }, [value, placeholder, editing, enterEditing])

  const isEmpty = !value || !value.trim()

  const stateClass = editing ? "caret-brass" : "hover:bg-brass/5"
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
      onInput={() => {
        if (editingRef.current) {
          setDraft(containerRef.current?.textContent ?? "")
        }
      }}
      onPaste={handlePaste}
      data-drag-disabled={!draggable}
    >
      {isEmpty && placeholder && !editing ? (
        <span className="text-brass italic cursor-pointer hover:bg-brass/10 rounded px-1 -mx-1 transition-colors">
          + {placeholder}
        </span>
      ) : (
        value
      )}
    </Tag>
  )
}
