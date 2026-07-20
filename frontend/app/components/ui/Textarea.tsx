import { clsx } from "clsx"
import type { TextareaHTMLAttributes } from "react"

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink outline-none focus:border-brass focus:ring-1 focus:ring-brass/30 placeholder:text-[#8e8e8e] resize-y",
        className
      )}
      {...props}
    />
  )
}
