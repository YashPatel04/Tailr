"use client"

import { useParams } from "next/navigation"
import { useSessions } from "@/hooks/queries"
import Link from "next/link"
import { Spinner } from "@/components/ui/Spinner"

export default function TagPage() {
  const params = useParams()
  const tag = decodeURIComponent(params.tag as string)
  const { data: sessions, isLoading } = useSessions()

  const taggedSessions = sessions?.filter((s) => s.tags?.includes(tag)) || []

  if (isLoading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )

  return (
    <div className="flex-1 overflow-y-auto bg-canvas dark:bg-[#212121]">
      <div className="mx-auto max-w-[820px] px-8 py-12">
        <h1 className="text-2xl font-semibold text-ink dark:text-[#ececec] mb-6">#{tag}</h1>
        {taggedSessions.length > 0 ? (
          <div className="space-y-2">
            {taggedSessions.map((s) => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="block rounded-lg border border-muted p-4 hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors"
              >
                <h3 className="text-sm font-medium text-ink dark:text-[#ececec]">
                  {s.company_name} - {s.role_title}
                </h3>
                <p className="text-xs text-slate dark:text-[#8e8e8e] mt-1">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate dark:text-[#8e8e8e]">No sessions with this tag.</p>
        )}
      </div>
    </div>
  )
}
