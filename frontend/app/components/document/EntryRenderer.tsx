import type { Entry } from "@/types"
import { BulletRenderer } from "./BulletRenderer"
import { useDiff } from "@/components/diff/DiffView"
import { clsx } from "clsx"

interface EntryRendererProps {
  node?: any
  entry?: Entry
}

export function EntryRenderer({ node, entry }: EntryRendererProps) {
  if (entry) {
    return <EntryRendererNew entry={entry} />
  }
  if (node) {
    return <EntryRendererLegacy node={node} />
  }
  return null
}

function EntryRendererNew({ entry }: { entry: Entry }) {
  const diffState = useDiff(entry.id)

  return (
    <div className={clsx("mb-3", {
      "bg-green-50 dark:bg-green-900/20 rounded-md p-2 -mx-2": diffState === "added",
      "bg-red-50 dark:bg-red-900/20 rounded-md p-2 -mx-2": diffState === "removed",
    })}>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-ink dark:text-[#ececec]">{entry.title}</span>
        {entry.dates && (
          <span className="text-sm text-slate dark:text-[#8e8e8e] italic flex-shrink-0 ml-4">{entry.dates}</span>
        )}
      </div>
      {(entry.role || entry.location) && (
        <div className="text-sm text-slate dark:text-[#8e8e8e] italic">
          {entry.role}{entry.location ? ` — ${entry.location}` : ""}
        </div>
      )}
      {entry.organization && (
        <div className="text-sm text-slate dark:text-[#8e8e8e]">{entry.organization}</div>
      )}
      <ul>
        {entry.bullets?.map((bullet) => (
          <BulletRenderer key={bullet.id} bullet={bullet} />
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
