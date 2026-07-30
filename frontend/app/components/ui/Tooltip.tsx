"use client"

import { useState, useRef, useEffect } from "react"

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: "top" | "bottom" | "left" | "right"
}

const positionClasses: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const show = () => {
    clearTimeout(timeoutRef.current)
    setVisible(true)
  }
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
        <div
          className={`absolute z-50 whitespace-nowrap rounded-md bg-[#2b2b2b] px-2 py-1 text-xs text-white shadow-lg pointer-events-none ${positionClasses[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
