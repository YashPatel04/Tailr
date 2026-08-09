"use client"

import { useCurrentUser } from "@/hooks/queries"
import { Spinner } from "@/components/ui/Spinner"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (error || (!isLoading && !user)) {
      router.push("/login")
    }
  }, [error, isLoading, user, router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-paper">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-paper">
        <Spinner size="lg" />
      </div>
    )
  }

  return <>{children}</>
}
