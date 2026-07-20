export function OpaqueNodeRenderer({ node }: { node: any }) {
  return (
    <div
      className="my-2 rounded-lg border border-muted bg-[#f7f7f8] dark:bg-[#2b2b2b] px-4 py-3 text-xs text-slate dark:text-[#8e8e8e] cursor-default font-mono"
      title="Template-specific content — not editable by AI"
    >
      {node.content || ""}
    </div>
  )
}
