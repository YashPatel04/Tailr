"use client"

import { useState, useMemo } from "react"
import type { Basics } from "@/types"
import { queueEdit } from "@/lib/editQueue"
import { useSessionStore } from "@/stores/sessionStore"
import { useDiffChanges } from "@/components/diff/DiffView"
import { diffBorderClass, diffGutterClass, diffGutter, renderDiffText } from "@/lib/wordDiff"
import type { DiffState } from "@/components/diff/DiffView"

function LinkableField({
  value,
  onSave,
  isUrl,
}: {
  value: string
  onSave: (v: string) => void
  isUrl?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft.trim() !== value) onSave(draft.trim())
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false)
            if (draft.trim() !== value) onSave(draft.trim())
          }
          if (e.key === "Escape") {
            setDraft(value)
            setEditing(false)
          }
        }}
        className="border border-blue-400 rounded px-1 py-0 bg-white dark:bg-[#2d2d2d] text-inherit outline-none text-sm"
        autoFocus
      />
    )
  }

  if (isUrl && value) {
    return (
      <span
        onDoubleClick={() => setEditing(true)}
        className="text-blue-600 dark:text-blue-400 hover:underline cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-0.5 -mx-0.5 transition-colors"
        title="Double-click to edit"
      >
        {value}
      </span>
    )
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className="cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-0.5 -mx-0.5 transition-colors"
      title="Double-click to edit"
    >
      {value || <span className="text-slate/30 italic">click to add</span>}
    </span>
  )
}

export function ResumeHeader({ basics }: { basics: Basics }) {
  const viewMode = useSessionStore((s) => s.viewMode)
  const allDiffs = useDiffChanges("basics")

  const fieldDiffMap = useMemo(() => {
    const map = new Map<string, DiffState>()
    allDiffs.forEach((d) => {
      if (!d.path) return
      const field = d.path.replace(/^basics\./, "")
      if (field && !map.has(field)) map.set(field, d)
    })
    return map
  }, [allDiffs])

  const queueBasisEdit = (field: string, value: string) => {
    queueEdit({ op: "update_basics_field", field, value })
  }

  const getFieldDiff = (field: string): DiffState | undefined => {
    if (viewMode !== "diff") return undefined
    return fieldDiffMap.get(field)
  }

  const nameDiff = getFieldDiff("name")
  const locationDiff = getFieldDiff("location")
  const phoneDiff = getFieldDiff("phone")
  const emailDiff = getFieldDiff("email")
  const summaryDiff = getFieldDiff("summary")

  return (
    <header className="mb-8 text-center">
      <h1 className={diffBorderClass(nameDiff?.kind || null)}>
        {viewMode === "diff" && nameDiff?.kind && (
          <span className={`text-xs font-bold font-mono mr-1 ${diffGutterClass(nameDiff.kind)}`}>
            {diffGutter(nameDiff.kind)}
          </span>
        )}
        <span className="text-3xl font-bold text-ink dark:text-[#ececec] mb-2 inline-block">
          <LinkableField value={basics.name} onSave={(v) => queueBasisEdit("name", v)} />
        </span>
        {viewMode === "diff" &&
          nameDiff?.kind === "modified" &&
          nameDiff.oldVal !== undefined &&
          nameDiff.newVal !== undefined && (
            <span className="text-xs ml-2">
              {renderDiffText(nameDiff.kind, basics.name, nameDiff.oldVal, nameDiff.newVal)}
            </span>
          )}
      </h1>
      <div className="text-sm text-slate dark:text-[#8e8e8e] space-y-1">
        {basics.location !== undefined && (
          <p className={diffBorderClass(locationDiff?.kind || null)}>
            {viewMode === "diff" && locationDiff?.kind && (
              <span
                className={`text-xs font-bold font-mono mr-1 ${diffGutterClass(locationDiff.kind)}`}
              >
                {diffGutter(locationDiff.kind)}
              </span>
            )}
            <LinkableField
              value={basics.location || ""}
              onSave={(v) => queueBasisEdit("location", v)}
            />
          </p>
        )}
        <p className="space-x-2">
          <span className={diffBorderClass(phoneDiff?.kind || null)}>
            {viewMode === "diff" && phoneDiff?.kind && (
              <span
                className={`text-xs font-bold font-mono mr-1 ${diffGutterClass(phoneDiff.kind)}`}
              >
                {diffGutter(phoneDiff.kind)}
              </span>
            )}
            <LinkableField value={basics.phone || ""} onSave={(v) => queueBasisEdit("phone", v)} />
          </span>
          <span>|</span>
          <span className={diffBorderClass(emailDiff?.kind || null)}>
            {viewMode === "diff" && emailDiff?.kind && (
              <span
                className={`text-xs font-bold font-mono mr-1 ${diffGutterClass(emailDiff.kind)}`}
              >
                {diffGutter(emailDiff.kind)}
              </span>
            )}
            <LinkableField
              value={basics.email || ""}
              onSave={(v) => queueBasisEdit("email", v)}
              isUrl
            />
          </span>
          {basics.profiles?.map((p, i) => (
            <span key={p.url || i}>
              <span>|</span>
              <LinkableField
                value={p.username || p.network || p.url || ""}
                onSave={(v) => {
                  queueEdit({
                    op: "update_basics_field",
                    field: "profiles",
                    value: JSON.stringify(
                      basics.profiles.map((pr, j) => (j === i ? { ...pr, username: v } : pr))
                    ),
                  })
                }}
                isUrl
              />
            </span>
          ))}
        </p>
        {basics.summary !== undefined && (
          <p className={`text-sm text-ink dark:text-[#ececec] mt-2 whitespace-pre-wrap ${diffBorderClass(summaryDiff?.kind || null)}`}>
            {viewMode === "diff" && summaryDiff?.kind && (
              <span className={`text-xs font-bold font-mono mr-1 ${diffGutterClass(summaryDiff.kind)}`}>
                {diffGutter(summaryDiff.kind)}
              </span>
            )}
            <LinkableField
              value={basics.summary || ""}
              onSave={(v) => queueBasisEdit("summary", v)}
            />
            {viewMode === "diff" &&
              summaryDiff?.kind === "modified" &&
              summaryDiff.oldVal !== undefined &&
              summaryDiff.newVal !== undefined && (
                <span className="text-xs ml-2">
                  {renderDiffText(summaryDiff.kind, basics.summary || "", summaryDiff.oldVal, summaryDiff.newVal)}
                </span>
              )}
          </p>
        )}
      </div>
    </header>
  )
}
