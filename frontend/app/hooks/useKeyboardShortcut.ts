"use client"

import { useEffect } from "react"

export function useKeyboardShortcut(
  keys: { key: string; metaKey?: boolean; ctrlKey?: boolean },
  callback: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const metaMatch = keys.metaKey ? e.metaKey : true
      const ctrlMatch = keys.ctrlKey ? e.ctrlKey : true
      if (e.key === keys.key && metaMatch && ctrlMatch) {
        e.preventDefault()
        callback()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [keys.key, keys.metaKey, keys.ctrlKey, callback, enabled])
}
