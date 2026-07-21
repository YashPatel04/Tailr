"use client"

import { useState } from "react"
import type { Basics } from "@/types"
import { RichEditableField } from "./RichEditableField"
import { queueEdit } from "@/lib/editQueue"

function LinkableField({ value, onSave, isUrl }: { value: string; onSave: (v: string) => void; isUrl?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft.trim() !== value) onSave(draft.trim()) }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { setEditing(false); if (draft.trim() !== value) onSave(draft.trim()) }
          if (e.key === "Escape") { setDraft(value); setEditing(false) }
        }}
        className="border border-blue-400 rounded px-1 py-0 bg-white dark:bg-[#2d2d2d] text-inherit outline-none text-sm"
        autoFocus
      />
    )
  }

  if (isUrl && value) {
    const href = value.startsWith("http") ? value : value.includes("@") ? `mailto:${value}` : `https://${value}`
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
         className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
         onDoubleClick={(e) => { e.preventDefault(); setEditing(true) }}>
        {value}
      </a>
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
  const queueBasisEdit = (field: string, value: string) => {
    queueEdit({ op: "update_basics_field", field, value })
  }

  return (
    <header className="mb-8 text-center">
      <h1 className="text-3xl font-bold text-ink dark:text-[#ececec] mb-2">
        <LinkableField
          value={basics.name}
          onSave={(v) => queueBasisEdit("name", v)}
        />
      </h1>
      <div className="text-sm text-slate dark:text-[#8e8e8e] space-y-1">
        {basics.location !== undefined && (
          <p>
            <LinkableField
              value={basics.location || ""}
              onSave={(v) => queueBasisEdit("location", v)}
            />
          </p>
        )}
        <p className="space-x-2">
          <LinkableField
            value={basics.phone || ""}
            onSave={(v) => queueBasisEdit("phone", v)}
          />
          <span>|</span>
          <LinkableField
            value={basics.email || ""}
            onSave={(v) => queueBasisEdit("email", v)}
            isUrl
          />
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
                      basics.profiles.map((pr, j) =>
                        j === i ? { ...pr, username: v } : pr
                      )
                    ),
                  })
                }}
                isUrl
              />
            </span>
          ))}
        </p>
      </div>
    </header>
  )
}
