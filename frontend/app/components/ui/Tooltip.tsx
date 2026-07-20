"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface TooltipProps {
  content: string
  children: React.ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const show = () => setVisible(true)
  const hide = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 100)
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-md bg-[#2b2b2b] px-2 py-1 text-xs text-white shadow-lg pointer-events-none">
          {content}
        </div>
      )}
    </div>
  )
}
