import { clsx } from "clsx"
import { CaretRight, ArrowRightLeft } from "lucide-react"

interface DiffMarkProps {
  type: "added" | "removed" | "modified" | "moved"
  children: React.ReactNode
}

export function DiffMark({ type, children }: DiffMarkProps) {
  switch (type) {
    case "added":
      return (
        <div className="border-l-2 border-proof-green pl-3 transition-all duration-200 ease-out animate-diff-in">
          <CaretRight size={12} className="text-proof-green mb-1" />
          {children}
        </div>
      )
    case "removed":
      return (
        <div className="border-l-2 border-proof-red pl-3 transition-all duration-200 ease-out animate-diff-in line-through text-slate/70">
          {children}
        </div>
      )
    case "moved":
      return (
        <div className="border-l-2 border-brass border-dashed pl-3 transition-all duration-200 ease-out animate-diff-in">
          <ArrowRightLeft size={12} className="text-brass mb-1" />
          {children}
        </div>
      )
    case "modified":
      return (
        <div className="border-l-2 border-brass pl-3 transition-all duration-200 ease-out animate-diff-in">
          <ArrowRightLeft size={12} className="text-brass mb-1" />
          <div className="line-through text-slate/70">{children}</div>
        </div>
      )
    default:
      return <>{children}</>
  }
}
