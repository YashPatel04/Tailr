import type { Bullet } from "@/types"
import { FormattedText } from "./FormattedText"
import { useDiff } from "@/components/diff/DiffView"
import { clsx } from "clsx"

interface BulletRendererProps {
  node?: any
  bullet?: Bullet
}

export function BulletRenderer({ node, bullet }: BulletRendererProps) {
  const id = bullet?.id ?? node?.id
  const text = bullet?.text ?? node?.text ?? ""
  const spans = bullet?.spans ?? node?.spans ?? []
  const diffState = useDiff(id)

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
      <FormattedText text={text} spans={spans} />
    </li>
  )
}
