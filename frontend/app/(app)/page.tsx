"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessions } from "@/hooks/queries"
import { useSessionStore } from "@/stores/sessionStore"
import { DocumentCanvas } from "@/components/document/DocumentCanvas"
import { Spinner } from "@/components/ui/Spinner"

export default function HomePage() {
  const { data: sessions, isLoading } = useSessions()
  const { setupOpen } = useSessionStore()
  const router = useRouter()

  useEffect(() => {
    if (!setupOpen && sessions && sessions.length > 0) {
      const recent = sessions[0]
      router.replace(`/session/${recent.id}`)
    }
  }, [sessions, router, setupOpen])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <DocumentCanvas />
}
