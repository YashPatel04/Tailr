import { useQueryClient } from "@tanstack/react-query"
import type { Entry } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { EditableField } from "./EditableField"
import { RichEditableField } from "./RichEditableField"
import { BulletRenderer } from "./BulletRenderer"
import { SortableBullet } from "./SortableBullet"
import { useDiff } from "@/components/diff/DiffView"
import { clsx } from "clsx"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

function reorder(length: number, from: number, to: number): number[] {
  const arr = Array.from({ length }, (_, i) => i)
  const [moved] = arr.splice(from, 1)
  arr.splice(to, 0, moved)
  return arr
}

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
  const viewMode = useSessionStore((s) => s.viewMode)

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
    <div className={clsx("mb-3 group", {
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
        <div className="text-sm text-slate dark:text-[#8e8e8e] flex items-baseline justify-between">
          <EditableField
            value={entry.organization}
            onSave={(v) => {
              updateCache((e) => { e.organization = v })
              queueFieldEdit("organization", v)
            }}
          />
          {entry.url && (
            <a href={entry.url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0 ml-4">
              {entry.url.replace(/^https?:\/\//, '').replace(/\/$/, '').substring(0, 30)}
            </a>
          )}
        </div>
      )}
      <div className="text-xs text-slate dark:text-[#8e8e8e] mt-1 flex items-center gap-1">
        <span className="text-slate dark:text-[#8e8e8e] shrink-0">🔗</span>
        <EditableField
          value={entry.url || ""}
          onSave={(v) => {
            updateCache((e) => { e.url = v || null })
            queueFieldEdit("url", v || null)
          }}
        />
      </div>
      {sectionLabel && entryIndex !== undefined ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event
          if (!over || active.id === over.id) return
          const oldIdx = entry.bullets.findIndex(b => b.id === active.id)
          const newIdx = entry.bullets.findIndex(b => b.id === over.id)
          if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
          queueEdit({ op: "reorder_bullets", section_label: sectionLabel, entry_index: entryIndex, order: reorder(entry.bullets.length, oldIdx, newIdx) })
          updateCache((e) => {
            const reordered = [...e.bullets]
            const [moved] = reordered.splice(oldIdx, 1)
            reordered.splice(newIdx, 0, moved)
            e.bullets = reordered
          })
        }}>
          <SortableContext items={entry.bullets.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {entry.bullets?.map((bullet, i) => (
              <SortableBullet key={bullet.id} bullet={bullet} sectionLabel={sectionLabel} entryIndex={entryIndex} bulletIndex={i} />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
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
      )}
      {sectionLabel && entryIndex !== undefined && viewMode !== "diff" && (
        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              const newBullet = { id: crypto.randomUUID(), text: "New bullet point", spans: [] }
              queueEdit({
                op: "add_bullet",
                section_label: sectionLabel,
                entry_index: entryIndex,
                after_index: (entry.bullets?.length || 0) - 1,
                text: "New bullet point",
                spans: [],
              })
              updateCache((e) => { e.bullets = [...(e.bullets || []), newBullet] })
            }}
            className="text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded px-1 py-0.5"
            title="Add bullet"
          >+ Bullet</button>
        </div>
      )}
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
