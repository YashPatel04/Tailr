import { clsx } from "clsx"
import type { InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink outline-none focus:border-brass focus:ring-1 focus:ring-brass/30 placeholder:text-[#8e8e8e]",
        className
      )}
      {...props}
    />
  )
}
