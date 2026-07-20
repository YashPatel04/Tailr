"use client"

import ReactCodeMirror from "@uiw/react-codemirror"

interface RawTexPanelProps {
  texSource: string
  onChange?: (value: string) => void
}

export function RawTexPanel({ texSource, onChange }: RawTexPanelProps) {
  return (
    <div className="my-3 rounded-lg border border-muted overflow-hidden">
      <ReactCodeMirror
        value={texSource}
        onChange={onChange}
        height="auto"
        basicSetup
        editable={!!onChange}
        className="text-sm font-mono"
        theme="light"
      />
    </div>
  )
}
