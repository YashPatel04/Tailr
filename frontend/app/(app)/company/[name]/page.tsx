"use client"

import { useParams } from "next/navigation"
import { apiRequest } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Spinner } from "@/components/ui/Spinner"

export default function CompanyPage() {
  const params = useParams()
  const name = decodeURIComponent(params.name as string)

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["companies", name, "sessions"],
    queryFn: () => apiRequest<any[]>("GET", `/api/companies/${encodeURIComponent(name)}/sessions`),
  })

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>

  return (
    <div className="flex-1 overflow-y-auto bg-canvas dark:bg-[#212121]">
      <div className="mx-auto max-w-[820px] px-8 py-12">
        <h1 className="text-2xl font-semibold text-ink dark:text-[#ececec] mb-6">{name}</h1>
        {sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Link key={s.id} href={`/session/${s.id}`} className="block rounded-lg border border-muted p-4 hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors">
                <h3 className="text-sm font-medium text-ink dark:text-[#ececec]">{s.role_title}</h3>
                <p className="text-xs text-slate dark:text-[#8e8e8e] mt-1">{s.tailoring_mode} &middot; {new Date(s.created_at).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate dark:text-[#8e8e8e]">No sessions for this company.</p>
        )}
      </div>
    </div>
  )
}
