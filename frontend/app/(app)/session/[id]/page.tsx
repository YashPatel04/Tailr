"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSessionStore } from "@/stores/sessionStore"
import { useSession } from "@/hooks/queries"
import { DocumentCanvas } from "@/components/document/DocumentCanvas"

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const { setActiveSession } = useSessionStore()
  const { isLoading, isError } = useSession(params.id as string)

  useEffect(() => {
    if (params.id) {
      setActiveSession(params.id as string)
    }
    return () => setActiveSession(null)
  }, [params.id, setActiveSession])

  useEffect(() => {
    if (isError) {
      router.replace("/dashboard")
    }
  }, [isError, router])

  if (isLoading) return null

  return <DocumentCanvas />
}
