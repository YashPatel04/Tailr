"use client"

import type { Basics } from "@/types"
import { EditableField } from "./EditableField"
import { queueEdit } from "@/lib/editQueue"
import { useSessionStore } from "@/stores/sessionStore"

export function ResumeHeader({ basics }: { basics: Basics }) {
  const queueBasisEdit = (field: string, value: string) => {
    queueEdit({ op: "update_basics_field", field, value })
  }

  return (
    <header className="mb-8 text-center">
      <h1 className="text-3xl font-bold text-ink dark:text-[#ececec] mb-2">
        <EditableField
          value={basics.name}
          onSave={(v) => queueBasisEdit("name", v)}
        />
      </h1>
      <div className="text-sm text-slate dark:text-[#8e8e8e] space-y-1">
        {basics.location !== undefined && (
          <p>
            <EditableField
              value={basics.location || ""}
              onSave={(v) => queueBasisEdit("location", v)}
            />
          </p>
        )}
        <p className="space-x-2">
          <EditableField
            value={basics.phone || ""}
            onSave={(v) => queueBasisEdit("phone", v)}
          />
          <span>|</span>
          {basics.email ? (
            <a
              href={`mailto:${basics.email}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              <EditableField
                value={basics.email}
                onSave={(v) => queueBasisEdit("email", v)}
              />
            </a>
          ) : (
            <EditableField
              value=""
              onSave={(v) => queueBasisEdit("email", v)}
            />
          )}
          {basics.profiles?.map((p, i) => (
            <span key={p.url || i}>
              <span>|</span>
              <span className="text-blue-600 dark:text-blue-400">
                <EditableField
                  value={p.username || p.network || ""}
                  onSave={(v) => {
                    // Update profile username in the queue
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
                />
              </span>
            </span>
          ))}
        </p>
      </div>
    </header>
  )
}
