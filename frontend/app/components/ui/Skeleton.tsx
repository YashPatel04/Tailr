import { clsx } from "clsx"

interface SkeletonProps {
  className?: string
  variant?: "text" | "rect" | "circle"
  width?: string
  height?: string
}

export function Skeleton({ className, variant = "text", width, height }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-slate/10",
        variant === "circle" && "rounded-full",
        variant === "text" && "h-4",
        className
      )}
      style={{ width, height }}
    />
  )
}
