import { useQueryClient } from "@tanstack/react-query"
import type { Bullet, Span } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { RichEditableField } from "./RichEditableField"
import { FormattedText } from "./FormattedText"
import { DeleteButton } from "./DeleteButton"
import { useFieldChanges } from "@/components/diff/DiffContext"
import { wordDiff } from "@/lib/fieldDiff"
import { clsx } from "clsx"

interface BulletRendererProps {
  node?: any
  bullet?: Bullet
  sectionLabel?: string
  entryIndex?: number
  bulletIndex?: number
}

export function BulletRenderer({
  node,
  bullet,
  sectionLabel,
  entryIndex,
  bulletIndex,
}: BulletRendererProps) {
  const id = bullet?.id ?? node?.id
  const text = bullet?.text ?? node?.text ?? ""
  const spans = bullet?.spans ?? node?.spans ?? []
  const bulletDiff = useFieldChanges(bullet?.id ?? node?.id ?? "")
  const viewMode = useSessionStore((s) => s.viewMode)
  const queryClient = useQueryClient()

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

  const renderWordDiff = (oldText: string, newText: string) => {
    const diff = wordDiff(oldText, newText)
    const segments: React.ReactNode[] = []

    let oi = 0
    let ni = 0
    while (oi < diff.old.length || ni < diff.new.length) {
      const oldSeg = diff.old[oi]
      const newSeg = diff.new[ni]

      if (oldSeg?.type === "same" && newSeg?.type === "same") {
        segments.push(<span key={`s-${oi}`}>{oldSeg.text}</span>)
        oi++
        ni++
      } else if (oldSeg?.type === "removed") {
        segments.push(
          <span key={`r-${oi}`} className="bg-[#fce8e6] dark:bg-[#a50e0e]/30 line-through text-[#c5221f] dark:text-[#f28b82] decoration-1">{oldSeg.text}</span>
        )
        oi++
      } else if (newSeg?.type === "added") {
        segments.push(
          <span key={`a-${ni}`} className="bg-[#e6f4ea] dark:bg-[#137333]/30 text-[#137333] dark:text-[#81c995]">{newSeg.text}</span>
        )
        ni++
      } else if (oldSeg?.type === "same") {
        segments.push(<span key={`s-${oi}`}>{oldSeg.text}</span>)
        oi++
        ni++
      } else {
        oi++
        ni++
      }
    }

    return <span className="break-words">{segments}</span>
  }

  const updateCache = (newText: string, newSpans: Span[]) => {
    if (sectionLabel === undefined || entryIndex === undefined || bulletIndex === undefined) return
    const sessionId = useSessionStore.getState().activeSessionId
    const docType = useSessionStore.getState().activeDocType
    if (!sessionId) return
    queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
      if (!old?.content) return old
      const newContent = structuredClone(old.content)
      const section = newContent.sections.find((s: any) => s.label === sectionLabel)
      if (section && section.entries[entryIndex]?.bullets[bulletIndex]) {
        section.entries[entryIndex].bullets[bulletIndex].text = newText
        section.entries[entryIndex].bullets[bulletIndex].spans = newSpans
      }
      return { ...old, content: newContent }
    })
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
    queryClient.setQueryData(["sessions", sessionId, "document", docType], (old: any) => {
      if (!old?.content) return old
      const newContent = structuredClone(old.content)
      const section = newContent.sections.find((s: any) => s.label === sectionLabel)
      if (section && section.entries[entryIndex]) {
        section.entries[entryIndex].bullets = section.entries[entryIndex].bullets.filter(
          (_: any, i: number) => i !== bulletIndex
        )
      }
      return { ...old, content: newContent }
    })
  }

  const showEditable =
    sectionLabel !== undefined && entryIndex !== undefined && bulletIndex !== undefined

  const isInChangesView = viewMode === "changes"

  return (
    <li
      className={clsx(
        "text-base text-ink dark:text-[#ececec] leading-relaxed ml-4 list-disc marker:text-slate dark:marker:text-[#8e8e8e] mb-1 group relative overflow-hidden break-words",
        diffBorder(bulletDiff?.kind)
      )}
    >
      {bulletDiff?.kind && (
        <span
          className={clsx(
            "absolute -left-4 top-0 text-xs font-bold font-mono",
            diffGutterColor(bulletDiff.kind)
          )}
        >
          {diffGutterChar(bulletDiff.kind)}
        </span>
      )}
      {isInChangesView && bulletDiff?.kind === "modified" &&
        bulletDiff.old !== undefined &&
        bulletDiff.new !== undefined ? (
        <span>{renderWordDiff(bulletDiff.old, bulletDiff.new)}</span>
      ) : showEditable && !isInChangesView ? (
        <RichEditableField value={text} spans={spans} onSave={handleSave} tag="span" />
      ) : (
        <FormattedText text={text} spans={spans} />
      )}
      {showEditable && !isInChangesView && <DeleteButton onClick={handleDelete} />}
    </li>
  )
}
