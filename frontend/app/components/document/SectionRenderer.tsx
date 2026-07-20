"use client"

import { useState } from "react"
import type { Section } from "@/types"
import { EntryRenderer } from "./EntryRenderer"
import { BulletRenderer } from "./BulletRenderer"
import { SkillRowRenderer } from "./SkillRowRenderer"
import { FormattedText } from "./FormattedText"
import { OpaqueNodeRenderer } from "./OpaqueNodeRenderer"
import { RawTexPanel } from "./RawTexPanel"
import { useDiff } from "@/components/diff/DiffView"
import { clsx } from "clsx"

interface SectionRendererProps {
  node?: any
  section?: Section
  texSource?: string | null
}

export function SectionRenderer({ node, section, texSource }: SectionRendererProps) {
  const [showSource, setShowSource] = useState(false)
  const contextDiff = useDiff(section ? section.id : node?.id)
  const effectiveDiff = contextDiff

  if (section) {
    return (
      <section className={clsx("mb-8", {
        "bg-green-50 dark:bg-green-900/20 rounded-lg p-3 -mx-3": effectiveDiff === "added",
        "bg-red-50 dark:bg-red-900/20 rounded-lg p-3 -mx-3": effectiveDiff === "removed",
      })}>
        {section.label && (
          <h2 className="text-2xl font-semibold text-ink dark:text-[#ececec] border-b border-muted pb-1 mb-3">
            {section.label}
          </h2>
        )}
        {section.entries?.map((entry) => (
          <EntryRenderer key={entry.id} entry={entry} />
        ))}
        {section.skill_rows?.map((row) => (
          <SkillRowRenderer key={row.id} row={row} />
        ))}
      </section>
    )
  }

  if (!node) return null

  if (node.type === "opaque") {
    return <OpaqueNodeRenderer node={node} />
  }

  return (
    <section className={clsx("mb-8", {
      "bg-green-50 dark:bg-green-900/20 rounded-lg p-3 -mx-3": effectiveDiff === "added",
      "bg-red-50 dark:bg-red-900/20 rounded-lg p-3 -mx-3": effectiveDiff === "removed",
    })}>
      {node.type === "section" && node.label && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink dark:text-[#ececec] border-b border-muted pb-1 mb-3 flex-1">
            {node.label}
          </h2>
          {texSource && (
            <button
              onClick={() => setShowSource(!showSource)}
              className="ml-2 rounded border border-brass px-2 py-0.5 text-xs text-brass hover:bg-brass/10 transition-colors font-mono"
            >
              tex
            </button>
          )}
        </div>
      )}

      {showSource && texSource ? (
        <RawTexPanel texSource={texSource} />
      ) : (
        node.children?.map((child: any) => {
          switch (child.type) {
            case "entry":
              return <EntryRenderer key={child.id} node={child} />
            case "bullet":
              return <BulletRenderer key={child.id} node={child} />
            case "skill_row":
              return (
                <div key={child.id} className="mb-1 text-sm text-ink dark:text-[#ececec]">
                  <span className="font-semibold">{child.category} </span>
                  <FormattedText text={child.items || ""} spans={[]} />
                </div>
              )
            case "text":
              return <FormattedText key={child.id} text={child.text || ""} spans={child.spans || []} />
            case "section":
              return <SectionRenderer key={child.id} node={child} texSource={child.tex_source || null} />
            case "opaque":
              return <OpaqueNodeRenderer key={child.id} node={child} />
            default:
              return null
          }
        })
      )}
    </section>
  )
}
