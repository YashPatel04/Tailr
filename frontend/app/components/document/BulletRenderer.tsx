import { useQueryClient } from "@tanstack/react-query"
import type { Bullet } from "@/types"
import { useSessionStore } from "@/stores/sessionStore"
import { queueEdit } from "@/lib/editQueue"
import { EditableField } from "./EditableField"
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
  const queryClient = useQueryClient()

  const updateCache = (newText: string) => {
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
        }
        return { ...old, content: newContent }
      }
    )
  }

  const handleSave = (newText: string) => {
    updateCache(newText)
    if (sectionLabel !== undefined && entryIndex !== undefined && bulletIndex !== undefined) {
      queueEdit({
        op: "update_bullet",
        section_label: sectionLabel,
        entry_index: entryIndex,
        bullet_index: bulletIndex,
        text: newText,
      })
    }
  }

  const showEditable = sectionLabel !== undefined && entryIndex !== undefined && bulletIndex !== undefined

  return (
    <li
      className={clsx(
        "text-base text-ink dark:text-[#ececec] leading-relaxed ml-4 list-disc marker:text-slate dark:marker:text-[#8e8e8e] mb-1",
        {
          "bg-green-50 dark:bg-green-900/20 rounded px-1": diffState === "added",
          "bg-red-50 dark:bg-red-900/20 rounded px-1": diffState === "removed",
        }
      )}
    >
      {showEditable ? (
        <EditableField value={text} onSave={handleSave} tag="span" />
      ) : (
        <FormattedText text={text} spans={spans} />
      )}
    </li>
  )
}
