"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useSessionStore } from "@/stores/sessionStore"
import { DocumentCanvas } from "@/components/document/DocumentCanvas"

export default function SessionPage() {
  const params = useParams()
  const { setActiveSession } = useSessionStore()

  useEffect(() => {
    if (params.id) {
      setActiveSession(params.id as string)
    }
    return () => setActiveSession(null)
  }, [params.id, setActiveSession])

  return <DocumentCanvas />
}
