"use client"

import { useSessionStore } from "@/stores/sessionStore"
import { useSessionMessages } from "@/hooks/queries"
import { Skeleton } from "@/components/ui/Skeleton"

export function ChatMessageListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={i % 2 === 0 ? "flex justify-end" : "flex justify-start"}>
          <div className={i % 2 === 0 ? "max-w-[85%]" : "max-w-[90%]"}>
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SidebarHistorySkeleton() {
  return (
    <div className="space-y-3 px-2 py-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function DocumentCanvasSkeleton() {
  return (
    <div className="mx-auto max-w-[820px] py-12 px-8 min-h-full space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  )
}
