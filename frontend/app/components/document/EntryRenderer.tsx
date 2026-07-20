import { useQueryClient } from "@tanstack/react-query"
import type { Entry } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { EditableField } from "./EditableField"
import { RichEditableField } from "./RichEditableField"
import { BulletRenderer } from "./BulletRenderer"
import { useDiff } from "@/components/diff/DiffView"
import { clsx } from "clsx"

interface EntryRendererProps {
  node?: any
  entry?: Entry
  sectionLabel?: string
  entryIndex?: number
}

export function EntryRenderer({ node, entry, sectionLabel, entryIndex }: EntryRendererProps) {
  if (entry) {
    return <EntryRendererNew entry={entry} sectionLabel={sectionLabel} entryIndex={entryIndex} />
  }
  if (node) {
    return <EntryRendererLegacy node={node} />
  }
  return null
}

function EntryRendererNew({ entry, sectionLabel, entryIndex }: { entry: Entry; sectionLabel?: string; entryIndex?: number }) {
  const diffState = useDiff(entry.id)
  const queryClient = useQueryClient()

  const updateCache = (updater: (entry: any) => void) => {
    if (sectionLabel === undefined || entryIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    if (!sessionId) return
    queryClient.setQueryData(
      ["sessions", sessionId, "document", docType],
      (old: any) => {
        if (!old?.content) return old
        const newContent = structuredClone(old.content)
        const section = newContent.sections.find((s: any) => s.label === sectionLabel)
        if (section && section.entries[entryIndex]) {
          updater(section.entries[entryIndex])
        }
        return { ...old, content: newContent }
      }
    )
  }

  const queueFieldEdit = (field: string, value: string | null) => {
    if (!sectionLabel || entryIndex === undefined) return
    queueEdit({
      op: "update_field",
      section_label: sectionLabel,
      entry_index: entryIndex,
      field,
      value,
    })
  }

  return (
    <div className={clsx("mb-3", {
      "bg-green-50 dark:bg-green-900/20 rounded-md p-2 -mx-2": diffState === "added",
      "bg-red-50 dark:bg-red-900/20 rounded-md p-2 -mx-2": diffState === "removed",
    })}>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-ink dark:text-[#ececec]">
          <RichEditableField
            value={entry.title}
            spans={[]}
            onSave={(v) => {
              updateCache((e) => { e.title = v })
              queueFieldEdit("title", v)
            }}
          />
        </span>
        {entry.dates && (
          <span className="text-sm text-slate dark:text-[#8e8e8e] flex-shrink-0 ml-4">
            <span className="italic">
              <EditableField
                value={entry.dates}
                onSave={(v) => {
                  updateCache((e) => { e.dates = v })
                  queueFieldEdit("dates", v)
                }}
              />
            </span>
          </span>
        )}
      </div>
      {(entry.role || entry.location) && (
        <div className="text-sm text-slate dark:text-[#8e8e8e] italic flex items-baseline justify-between">
          {entry.role && (
            <RichEditableField
              value={entry.role}
              spans={[]}
              onSave={(v) => {
                updateCache((e) => { e.role = v })
                queueFieldEdit("role", v)
              }}
            />
          )}
          {entry.location && (
            <EditableField
              value={entry.location}
              onSave={(v) => {
                updateCache((e) => { e.location = v })
                queueFieldEdit("location", v)
              }}
            />
          )}
        </div>
      )}
      {entry.organization && (
        <div className="text-sm text-slate dark:text-[#8e8e8e]">
          <EditableField
            value={entry.organization}
            onSave={(v) => {
              updateCache((e) => { e.organization = v })
              queueFieldEdit("organization", v)
            }}
          />
        </div>
      )}
      <ul>
        {entry.bullets?.map((bullet, i) => (
          <BulletRenderer
            key={bullet.id}
            bullet={bullet}
            sectionLabel={sectionLabel}
            entryIndex={entryIndex}
            bulletIndex={i}
          />
        ))}
      </ul>
    </div>
  )
}

function EntryRendererLegacy({ node }: { node: any }) {
  const diffState = useDiff(node.id)

  return (
    <div className={clsx("mb-3", {
      "bg-green-50 dark:bg-green-900/20 rounded-md p-2 -mx-2": diffState === "added",
      "bg-red-50 dark:bg-red-900/20 rounded-md p-2 -mx-2": diffState === "removed",
    })}>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-ink dark:text-[#ececec]">{node.title}</span>
        {node.dates && (
          <span className="text-sm text-slate dark:text-[#8e8e8e] italic flex-shrink-0 ml-4">{node.dates}</span>
        )}
      </div>
      {node.organization && (
        <div className="text-sm text-slate dark:text-[#8e8e8e]">{node.organization}</div>
      )}
      {node.children?.map((child: any) =>
        child.type === "bullet" ? <BulletRenderer key={child.id} node={child} /> : null
      )}
    </div>
  )
}
