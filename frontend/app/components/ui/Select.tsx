import { clsx } from "clsx"
import type { SelectHTMLAttributes } from "react"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={clsx(
        "w-full rounded-lg border border-muted bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brass focus:ring-1 focus:ring-brass/30",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
