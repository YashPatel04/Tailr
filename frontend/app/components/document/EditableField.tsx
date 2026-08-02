"use client"
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { placeCaretAtPoint, placeCaretAtEnd } from "@/lib/textSelection"

interface EditableFieldProps {
  value: string
  onSave: (newValue: string) => void
  className?: string
  tag?: "span" | "div" | "h2" | "h1"
}

export function EditableField({
  value,
  onSave,
  className = "",
  tag: Tag = "span",
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const containerRef = useRef<HTMLElement>(null)
  const fieldId = useRef(`field-${Math.random().toString(36).slice(2, 9)}`)
  const editingRef = useRef(false)
  const mousedownInsideRef = useRef(false)
  const initialValueRef = useRef(value)
  const pendingCaretRef = useRef<{ x: number; y: number } | null>(null)

  const viewMode = useSessionStore((s) => s.viewMode)
  const setEditingFieldId = useSessionStore((s) => s.setEditingFieldId)

  useLayoutEffect(() => {
    if (!editing) return
    const el = containerRef.current
    if (!el) return
    el.focus()
    const pos = pendingCaretRef.current
    pendingCaretRef.current = null
    if (pos) {
      if (!placeCaretAtPoint(el, pos.x, pos.y)) {
        placeCaretAtEnd(el)
      }
    } else {
      placeCaretAtEnd(el)
    }
  }, [editing])

  const enterEditing = useCallback(
    (x?: number, y?: number) => {
      initialValueRef.current = value
      pendingCaretRef.current = x !== undefined && y !== undefined ? { x, y } : null
      setEditing(true)
      editingRef.current = true
      setEditingFieldId(fieldId.current)
    },
    [value, setEditingFieldId]
  )

  const commit = useCallback(() => {
    if (!editingRef.current) return
    const el = containerRef.current
    const newValue = el?.textContent ?? value
    editingRef.current = false
    setEditing(false)
    setEditingFieldId(null)
    pendingCaretRef.current = null
    if (newValue !== initialValueRef.current) {
      onSave(newValue.trim())
    }
  }, [value, onSave, setEditingFieldId])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode === "changes") return
      if (editingRef.current) {
        mousedownInsideRef.current = true
        return
      }
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
          const el = containerRef.current
          if (el) el.textContent = initialValueRef.current
          commit()
        }
        return
      }
      if (e.key === "Enter" && editingRef.current) {
        e.preventDefault()
        commit()
      }
    },
    [commit]
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!editingRef.current) return
      if (containerRef.current?.contains(e.relatedTarget as Node)) return
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

  const stateClass = editing ? "caret-brass" : "hover:bg-brass/5"

  const draggable = !editing

  return (
    <Tag
      ref={containerRef as any}
      contentEditable={editing}
      suppressContentEditableWarning
      data-field-id={fieldId.current}
      className={`cursor-text rounded px-0.5 -mx-0.5 transition-colors outline-none ${stateClass} ${className}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPaste={handlePaste}
      data-drag-disabled={!draggable}
    >
      {value}
    </Tag>
  )
}
