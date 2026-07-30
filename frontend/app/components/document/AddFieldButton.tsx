"use client"

interface AddFieldButtonProps {
  label: string
  onClick: (e: React.MouseEvent) => void
}

export function AddFieldButton({ label, onClick }: AddFieldButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      className="text-xs italic text-slate dark:text-[#8e8e8e] hover:text-brass dark:hover:text-brass px-1 py-0.5 rounded hover:bg-brass/10 transition-all shrink-0"
    >
      + {label}
    </button>
  )
}
