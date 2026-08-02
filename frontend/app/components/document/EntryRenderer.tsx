import { useState, useRef, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Entry } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { EditableField } from "./EditableField"
import { RichEditableField } from "./RichEditableField"
import { BulletRenderer } from "./BulletRenderer"
import { SortableBullet } from "./SortableBullet"
import { DeleteButton } from "./DeleteButton"
import { AddFieldButton } from "./AddFieldButton"
import { useFieldChanges, useFieldChangesAny } from "@/components/diff/DiffContext"
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
  sectionId?: string
  sectionLabel?: string
  entryIndex?: number
}

export function EntryRenderer({ node, entry, sectionId, sectionLabel, entryIndex }: EntryRendererProps) {
  if (entry) {
    return <EntryRendererNew entry={entry} sectionId={sectionId} sectionLabel={sectionLabel} entryIndex={entryIndex} />
  }
  if (node) {
    return <EntryRendererLegacy node={node} />
  }
  return null
}

function EntryRendererNew({
  entry,
  sectionId,
  sectionLabel,
  entryIndex,
}: {
  entry: Entry
  sectionId?: string
  sectionLabel?: string
  entryIndex?: number
}) {
  const entryDiff = useFieldChanges(entry.id)
  const titleDiff = useFieldChangesAny(
    sectionId ? `s:${sectionId}:e:${entry.id}:f:title` : "",
    entry.id
  )
  const roleDiff = useFieldChanges(sectionId ? `s:${sectionId}:e:${entry.id}:f:role` : "")
  const orgDiff = useFieldChanges(sectionId ? `s:${sectionId}:e:${entry.id}:f:organization` : "")
  const datesDiff = useFieldChanges(sectionId ? `s:${sectionId}:e:${entry.id}:f:dates` : "")
  const locationDiff = useFieldChanges(sectionId ? `s:${sectionId}:e:${entry.id}:f:location` : "")
  const queryClient = useQueryClient()
  const viewMode = useSessionStore((s) => s.viewMode)

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

  const fieldHighlight = (diff: { kind?: string } | undefined) =>
    diff?.kind === "modified"
      ? "bg-[#fef7e0] dark:bg-[#e37400]/20 rounded px-1 -mx-1"
      : diff?.kind === "added"
        ? "bg-[#e6f4ea] dark:bg-[#137333]/20 rounded px-1 -mx-1"
        : ""

  const isInChangesView = viewMode === "changes"

  const updateCache = (updater: (entry: any) => void) => {
    if (sectionLabel === undefined || entryIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    if (!sessionId) return
    queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
      if (!old?.content) return old
      const newContent = structuredClone(old.content)
      const section = newContent.sections.find((s: any) => s.label === sectionLabel)
      if (section && section.entries[entryIndex]) {
        updater(section.entries[entryIndex])
      }
      return { ...old, content: newContent }
    })
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

  const editable = sectionLabel !== undefined && entryIndex !== undefined && viewMode !== "changes"
  const firstUrlKey = entry.urls ? Object.keys(entry.urls).find(k => k !== "") : undefined
  const roleOrInfo = entry.role != null ? entry.role : entry.organization != null ? entry.organization : null
  const [editingUrl, setEditingUrl] = useState(false)
  const [editUrlKey, setEditUrlKey] = useState("")
  const [editUrlText, setEditUrlText] = useState("")

  const startEditUrl = () => {
    setEditUrlKey(firstUrlKey || "")
    setEditUrlText(firstUrlKey ? (entry.urls![firstUrlKey] || "") : "")
    setEditingUrl(true)
  }

  const saveUrl = () => {
    const newUrls = { ...entry.urls }
    if (firstUrlKey) delete newUrls[firstUrlKey]
    if (editUrlKey.trim()) {
      newUrls[editUrlKey] = editUrlText || editUrlKey
    }
    updateCache((e) => { e.urls = newUrls })
    if (sectionLabel && entryIndex !== undefined) {
      queueEdit({
        op: "update_entry_urls",
        section_label: sectionLabel,
        entry_index: entryIndex,
        urls: newUrls,
      })
    }
    setEditingUrl(false)
  }

  const cancelEditUrl = () => {
    setEditingUrl(false)
  }

  const urlRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!editingUrl) return
    const handleClickOutside = (e: MouseEvent) => {
      if (urlRef.current && !urlRef.current.contains(e.target as Node)) {
        cancelEditUrl()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [editingUrl])

  return (
    <div className={clsx("mb-3 group relative overflow-hidden", diffBorder(entryDiff?.kind))}>
      {entryDiff?.kind && (
        <span
          className={clsx(
            "absolute -left-2.5 top-0 text-xs font-bold font-mono",
            diffGutterColor(entryDiff.kind)
          )}
        >
          {diffGutterChar(entryDiff.kind)}
        </span>
      )}
      {/* Row 1: Title + Date + Delete */}
      <div className="flex items-baseline justify-between">
        <span className={clsx("font-semibold text-ink dark:text-[#ececec]", fieldHighlight(isInChangesView ? titleDiff : undefined))}>
          {isInChangesView ? (
            entry.title
          ) : (
            <RichEditableField
              value={entry.title}
              spans={[]}
              onSave={(v) => {
                updateCache((e) => { e.title = v })
                queueFieldEdit("title", v)
              }}
            />
          )}
        </span>
        <div className="flex items-center gap-1">
          {entry.dates ? (
            <span className={clsx("text-sm text-slate dark:text-[#8e8e8e] italic flex-shrink-0 ml-4", fieldHighlight(isInChangesView ? datesDiff : undefined))}>
              {isInChangesView ? (
                entry.dates
              ) : (
                <RichEditableField
                  value={entry.dates}
                  spans={[]}
                  placeholder="Date"
                  onSave={(v) => {
                    updateCache((e) => { e.dates = v })
                    queueFieldEdit("dates", v)
                  }}
                />
              )}
            </span>
          ) : editable && !isInChangesView ? (
            <AddFieldButton
              label="Date"
              onClick={() => {
                updateCache((e) => { e.dates = " " })
                queueFieldEdit("dates", " ")
              }}
            />
          ) : null}
          {editable && !isInChangesView && (
            <DeleteButton
              onClick={() => {
                queueEdit({ op: "delete_entry", section_label: sectionLabel!, entry_index: entryIndex! })
                const sessionId = useSessionStore.getState().activeSessionId
                const docType = useSessionStore.getState().activeDocType
                if (sessionId) {
                  queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
                    if (!old?.content) return old
                    const newContent = structuredClone(old.content)
                    const sec = newContent.sections.find((s: any) => s.label === sectionLabel)
                    if (sec) sec.entries = sec.entries.filter((_: any, i: number) => i !== entryIndex)
                    return { ...old, content: newContent }
                  })
                }
              }}
            />
          )}
        </div>
      </div>
      {/* Row 2: Role/Info + Location + URL */}
      <div className="text-sm text-slate dark:text-[#8e8e8e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {roleOrInfo != null ? (
            entry.role != null ? (
              <span className={fieldHighlight(isInChangesView ? roleDiff : undefined)}>
                {isInChangesView ? (
                  entry.role
                ) : (
                  <RichEditableField
                    value={entry.role}
                    spans={[]}
                    placeholder="Role"
                    onSave={(v) => {
                      updateCache((e) => { e.role = v })
                      queueFieldEdit("role", v)
                    }}
                  />
                )}
              </span>
            ) : (
              <span className={fieldHighlight(isInChangesView ? orgDiff : undefined)}>
                {isInChangesView ? (
                  entry.organization!
                ) : (
                  <RichEditableField
                    value={entry.organization!}
                    spans={[]}
                    placeholder="Info"
                    onSave={(v) => {
                      updateCache((e) => { e.organization = v })
                      queueFieldEdit("organization", v)
                    }}
                  />
                )}
              </span>
            )
          ) : editable && !isInChangesView ? (
            <AddFieldButton
              label="Role"
              onClick={() => {
                updateCache((e) => { e.role = " " })
                queueFieldEdit("role", " ")
              }}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {entry.location != null ? (
            <span className={fieldHighlight(isInChangesView ? locationDiff : undefined)}>
              {isInChangesView ? (
                entry.location
              ) : (
                <RichEditableField
                  value={entry.location}
                  spans={[]}
                  placeholder="Location"
                  onSave={(v) => {
                    updateCache((e) => { e.location = v })
                    queueFieldEdit("location", v)
                  }}
                />
              )}
            </span>
          ) : editable && !isInChangesView ? (
            <AddFieldButton
              label="Location"
              onClick={() => {
                updateCache((e) => { e.location = " " })
                queueFieldEdit("location", " ")
              }}
            />
          ) : null}
          {firstUrlKey || editingUrl ? (
            editingUrl ? (
              <span ref={urlRef} className="inline-flex items-center gap-1">
                <input
                  type="url"
                  value={editUrlKey}
                  onChange={(e) => setEditUrlKey(e.target.value)}
                  placeholder="https://..."
                  className="text-xs border border-muted rounded px-1 py-0.5 w-40 bg-canvas text-ink dark:text-[#ececec] dark:bg-[#2d2d2d] focus:outline-none focus:ring-1 focus:ring-brass"
                  autoFocus
                />
                <input
                  type="text"
                  value={editUrlText}
                  onChange={(e) => setEditUrlText(e.target.value)}
                  placeholder="Label"
                  className="text-xs border border-muted rounded px-1 py-0.5 w-24 bg-canvas text-ink dark:text-[#ececec] dark:bg-[#2d2d2d] focus:outline-none focus:ring-1 focus:ring-brass"
                />
                <button onClick={saveUrl} className="text-brass hover:underline">Save</button>
                <button onClick={cancelEditUrl} className="text-slate hover:underline">Cancel</button>
              </span>
            ) : firstUrlKey ? (
              <button
                onClick={startEditUrl}
                className="text-blue-600 hover:underline text-left"
              >
                {entry.urls![firstUrlKey] || firstUrlKey}
              </button>
            ) : null
          ) : editable ? (
            <AddFieldButton
              label="URL"
              onClick={() => {
                setEditUrlKey("")
                setEditUrlText("")
                setEditingUrl(true)
              }}
            />
          ) : null}
        </div>
      </div>
      {sectionLabel && entryIndex !== undefined ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event
            if (!over || active.id === over.id) return
            const oldIdx = entry.bullets.findIndex((b) => b.id === active.id)
            const newIdx = entry.bullets.findIndex((b) => b.id === over.id)
            if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
            queueEdit({
              op: "reorder_bullets",
              section_label: sectionLabel,
              entry_index: entryIndex,
              order: reorder(entry.bullets.length, oldIdx, newIdx),
            })
            updateCache((e) => {
              const reordered = [...e.bullets]
              const [moved] = reordered.splice(oldIdx, 1)
              reordered.splice(newIdx, 0, moved)
              e.bullets = reordered
            })
          }}
        >
          <SortableContext
            items={entry.bullets.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {entry.bullets?.map((bullet, i) => (
              <SortableBullet
                key={bullet.id}
                bullet={bullet}
                sectionLabel={sectionLabel}
                entryIndex={entryIndex}
                bulletIndex={i}
              />
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
      {sectionLabel && entryIndex !== undefined && viewMode !== "changes" && (
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
              updateCache((e) => {
                e.bullets = [...(e.bullets || []), newBullet]
              })
            }}
            className="text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded px-1 py-0.5"
            title="Add bullet"
          >
            + Bullet
          </button>
        </div>
      )}
    </div>
  )
}

function EntryRendererLegacy({ node }: { node: any }) {
  const entryDiff = useFieldChanges(`e:${node.id}`)

  return (
    <div className="mb-3 relative">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-ink dark:text-[#ececec]">{node.title}</span>
        {node.dates && (
          <span className="text-sm text-slate dark:text-[#8e8e8e] italic flex-shrink-0 ml-4">
            {node.dates}
          </span>
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
