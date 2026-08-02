"use client"
import { useState, useRef, useCallback, useEffect } from "react"
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
  const clickPosRef = useRef<{ x: number; y: number } | null>(null)
  const initialValueRef = useRef(value)

  const viewMode = useSessionStore((s) => s.viewMode)
  const setEditingFieldId = useSessionStore((s) => s.setEditingFieldId)

  const enterEditing = useCallback(
    (x?: number, y?: number) => {
      initialValueRef.current = value
      setEditing(true)
      setEditingFieldId(fieldId.current)
      requestAnimationFrame(() => {
        const el = containerRef.current
        if (!el) return
        el.focus()
        if (x !== undefined && y !== undefined) {
          const placed = placeCaretAtPoint(el, x, y)
          if (!placed) {
            placeCaretAtEnd(el)
          }
        } else {
          placeCaretAtEnd(el)
        }
      })
    },
    [value, setEditingFieldId]
  )

  const commit = useCallback(() => {
    const el = containerRef.current
    const newValue = el?.textContent ?? value
    setEditing(false)
    setEditingFieldId(null)
    if (newValue !== initialValueRef.current) {
      onSave(newValue.trim())
    }
  }, [value, onSave, setEditingFieldId])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode === "changes") return
      if (editing) return
      clickPosRef.current = { x: e.clientX, y: e.clientY }
    },
    [viewMode, editing]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode === "changes") return
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
        if (editing) {
          const el = containerRef.current
          if (el) el.textContent = initialValueRef.current
          commit()
        }
      }
      if (e.key === "Enter" && editing) {
        e.preventDefault()
        commit()
      }
    },
    [editing, commit]
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!editing) return
      if (containerRef.current?.contains(e.relatedTarget as Node)) return
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

  const stateClass = editing
    ? "caret-brass"
    : "hover:bg-brass/5"

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
