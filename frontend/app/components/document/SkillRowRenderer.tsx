import type { SkillRow } from "@/types"

interface SkillRowRendererProps {
  row: SkillRow
}

export function SkillRowRenderer({ row }: SkillRowRendererProps) {
  return (
    <div className="mb-1 text-sm text-ink dark:text-[#ececec]">
      <span className="font-semibold">{row.category}:</span> {row.items}
    </div>
  )
}
