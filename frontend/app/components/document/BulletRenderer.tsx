import { useQueryClient } from "@tanstack/react-query"
import type { Bullet, Span } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { RichEditableField } from "./RichEditableField"
import { FormattedText } from "./FormattedText"
import { useDiff } from "@/components/diff/DiffView"
import { clsx } from "clsx"

interface BulletRendererProps {
  node?: any
  bullet?: Bullet
  sectionLabel?: string
  entryIndex?: number
  bulletIndex?: number
}

export function BulletRenderer({ node, bullet, sectionLabel, entryIndex, bulletIndex }: BulletRendererProps) {
  const id = bullet?.id ?? node?.id
  const text = bullet?.text ?? node?.text ?? ""
  const spans = bullet?.spans ?? node?.spans ?? []
  const diffState = useDiff(id)
  const viewMode = useSessionStore((s) => s.viewMode)
  const queryClient = useQueryClient()

  const updateCache = (newText: string, newSpans: Span[]) => {
    if (sectionLabel === undefined || entryIndex === undefined || bulletIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    if (!sessionId) return
    queryClient.setQueryData(
      ["sessions", sessionId, "document", docType],
      (old: any) => {
        if (!old?.content) return old
        const newContent = structuredClone(old.content)
        const section = newContent.sections.find((s: any) => s.label === sectionLabel)
        if (section && section.entries[entryIndex]?.bullets[bulletIndex]) {
          section.entries[entryIndex].bullets[bulletIndex].text = newText
          section.entries[entryIndex].bullets[bulletIndex].spans = newSpans
        }
        return { ...old, content: newContent }
      }
    )
  }

  const handleSave = (newText: string, newSpans: Span[]) => {
    updateCache(newText, newSpans)
    if (sectionLabel !== undefined && entryIndex !== undefined && bulletIndex !== undefined) {
      queueEdit({
        op: "update_bullet",
        section_label: sectionLabel,
        entry_index: entryIndex,
        bullet_index: bulletIndex,
        text: newText,
        spans: newSpans,
      })
    }
  }

  const handleDelete = () => {
    if (sectionLabel === undefined || entryIndex === undefined || bulletIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    if (!sessionId) return
    queueEdit({
      op: "delete_bullet",
      section_label: sectionLabel,
      entry_index: entryIndex,
      bullet_index: bulletIndex,
    })
    queryClient.setQueryData(
      ["sessions", sessionId, "document", docType],
      (old: any) => {
        if (!old?.content) return old
        const newContent = structuredClone(old.content)
        const section = newContent.sections.find((s: any) => s.label === sectionLabel)
        if (section && section.entries[entryIndex]) {
          section.entries[entryIndex].bullets = section.entries[entryIndex].bullets.filter(
            (_: any, i: number) => i !== bulletIndex
          )
        }
        return { ...old, content: newContent }
      }
    )
  }

  const showEditable = sectionLabel !== undefined && entryIndex !== undefined && bulletIndex !== undefined

  return (
    <li
      className={clsx(
        "text-base text-ink dark:text-[#ececec] leading-relaxed ml-4 list-disc marker:text-slate dark:marker:text-[#8e8e8e] mb-1 group relative",
        {
          "border-l-[3px] border-[#137333] dark:border-[#81c995] pl-2": diffState === "added",
          "border-l-[3px] border-[#c5221f] dark:border-[#f28b82] pl-2": diffState === "removed",
          "border-l-[3px] border-[#e37400] dark:border-[#fdd663] pl-2": diffState === "modified",
        }
      )}
    >
      {diffState && (
        <span className={clsx("absolute -left-4 top-0 text-xs font-bold font-mono", {
          "text-[#137333] dark:text-[#81c995]": diffState === "added",
          "text-[#c5221f] dark:text-[#f28b82]": diffState === "removed",
          "text-[#e37400] dark:text-[#fdd663]": diffState === "modified",
        })}>
          {diffState === "added" ? "+" : diffState === "removed" ? "\u2013" : "~"}
        </span>
      )}
      {showEditable ? (
        <RichEditableField value={text} spans={spans} onSave={handleSave} tag="span" />
      ) : (
        <FormattedText text={text} spans={spans} />
      )}
      {showEditable && viewMode !== "diff" && (
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-1"
          title="Delete bullet"
        >×</button>
      )}
    </li>
  )
}
