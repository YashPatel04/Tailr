"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessions } from "@/hooks/queries"
import { DocumentCanvas } from "@/components/document/DocumentCanvas"
import { Spinner } from "@/components/ui/Spinner"

export default function HomePage() {
  const { data: sessions, isLoading } = useSessions()
  const router = useRouter()

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      const recent = sessions[0]
      router.replace(`/session/${recent.id}`)
    }
  }, [sessions, router])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <DocumentCanvas />
}
