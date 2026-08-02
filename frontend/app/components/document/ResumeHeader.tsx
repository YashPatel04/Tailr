"use client"

import { useState } from "react"
import type { Basics } from "@/types"
import { queueEdit } from "@/lib/editQueue"
import { useSessionStore } from "@/stores/sessionStore"
import { useFieldChanges } from "@/components/diff/DiffContext"

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
          const trimmed = draft.trim()
          if (trimmed !== value && trimmed !== "") onSave(trimmed)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false)
            const trimmed = draft.trim()
            if (trimmed !== value && trimmed !== "") onSave(trimmed)
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
  const nameDiff = useFieldChanges("basics:name")
  const locationDiff = useFieldChanges("basics:location")
  const phoneDiff = useFieldChanges("basics:phone")
  const emailDiff = useFieldChanges("basics:email")

  const queueBasisEdit = (field: string, value: string) => {
    queueEdit({ op: "update_basics_field", field, value })
  }

  const isDiff = viewMode === "changes"

  const diffBorder = (kind: string | undefined) =>
    kind === "added"
      ? "border-l-[3px] border-[#137333] dark:border-[#81c995]"
      : kind === "removed"
        ? "border-l-[3px] border-[#c5221f] dark:border-[#f28b82]"
        : kind === "modified"
          ? "border-l-[3px] border-[#e37400] dark:border-[#fdd663]"
          : ""

  const diffGutterColor = (kind: string | undefined) =>
    kind === "added"
      ? "text-[#137333] dark:text-[#81c995]"
      : kind === "removed"
        ? "text-[#c5221f] dark:text-[#f28b82]"
        : kind === "modified"
          ? "text-[#e37400] dark:text-[#fdd663]"
          : ""

  const diffGutterChar = (kind: string | undefined) =>
    kind === "added" ? "+" : kind === "removed" ? "\u2013" : kind === "modified" ? "~" : ""

  return (
    <header className="mb-8 text-center">
      <h1 className={diffBorder(nameDiff?.kind)}>
        {isDiff && nameDiff?.kind && (
          <span className={`text-xs font-bold font-mono mr-1 ${diffGutterColor(nameDiff.kind)}`}>
            {diffGutterChar(nameDiff.kind)}
          </span>
        )}
        <span className="text-3xl font-bold text-ink dark:text-[#ececec] mb-2 inline-block">
          <LinkableField value={basics.name} onSave={(v) => queueBasisEdit("name", v)} />
        </span>
      </h1>
      <div className="text-sm text-slate dark:text-[#8e8e8e] space-y-1">
        {basics.location !== undefined && (
          <p className={diffBorder(locationDiff?.kind)}>
            {isDiff && locationDiff?.kind && (
              <span className={`text-xs font-bold font-mono mr-1 ${diffGutterColor(locationDiff.kind)}`}>
                {diffGutterChar(locationDiff.kind)}
              </span>
            )}
            <LinkableField
              value={basics.location || ""}
              onSave={(v) => queueBasisEdit("location", v)}
            />
          </p>
        )}
        <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 overflow-hidden">
          <span className={diffBorder(phoneDiff?.kind)}>
            {isDiff && phoneDiff?.kind && (
              <span className={`text-xs font-bold font-mono mr-1 ${diffGutterColor(phoneDiff.kind)}`}>
                {diffGutterChar(phoneDiff.kind)}
              </span>
            )}
            <LinkableField value={basics.phone || ""} onSave={(v) => queueBasisEdit("phone", v)} />
          </span>
          <span>|</span>
          <span className={diffBorder(emailDiff?.kind)}>
            {isDiff && emailDiff?.kind && (
              <span className={`text-xs font-bold font-mono mr-1 ${diffGutterColor(emailDiff.kind)}`}>
                {diffGutterChar(emailDiff.kind)}
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
              <a
                href={p.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                onDoubleClick={(e) => {
                  e.preventDefault()
                  const newUsername = window.prompt("Username:", p.username || "")
                  if (newUsername !== null) {
                    queueEdit({
                      op: "update_basics_field",
                      field: "profiles",
                      value: JSON.stringify(
                        basics.profiles.map((pr, j) => (j === i ? { ...pr, username: newUsername } : pr))
                      ),
                    })
                  }
                }}
                title={`${p.network}: ${p.username} (${p.url})`}
              >
                {p.username || p.network}
              </a>
            </span>
          ))}
        </p>
      </div>
    </header>
  )
}
