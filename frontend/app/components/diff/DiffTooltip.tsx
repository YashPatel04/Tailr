"use client"

import { useState, useRef, useEffect } from "react"

interface DiffTooltipProps {
  reasoning: string
  children: React.ReactNode
}

export function DiffTooltip({ reasoning, children }: DiffTooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className="relative inline"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute z-40 max-w-xs rounded-lg bg-[#2b2b2b] text-white px-3 py-2 text-xs shadow-lg left-full top-1/2 -translate-y-1/2 ml-2 pointer-events-none">
          {reasoning}
        </div>
      )}
    </div>
  )
}
