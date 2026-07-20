import { clsx } from "clsx"

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
}

const colorClasses = {
  brass: "border-brass",
  slate: "border-slate",
  paper: "border-paper",
}

interface SpinnerProps {
  size?: "sm" | "md" | "lg"
  color?: "brass" | "slate" | "paper"
  className?: string
}

export function Spinner({ size = "md", color = "brass", className }: SpinnerProps) {
  return (
    <div
      className={clsx(
        "animate-spin rounded-full border-transparent",
        sizeClasses[size],
        colorClasses[color],
        "border-t-current",
        className
      )}
      style={{ borderTopColor: "currentColor" }}
    />
  )
}
