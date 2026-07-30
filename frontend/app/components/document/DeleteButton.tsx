"use client"

import { Trash2 } from "lucide-react"

interface DeleteButtonProps {
  onClick: (e: React.MouseEvent) => void
  label?: string
}

export function DeleteButton({ onClick, label = "Delete" }: DeleteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-0.5 transition-opacity shrink-0"
      title={label}
    >
      <Trash2 size={16} />
    </button>
  )
}
