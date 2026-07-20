"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Spinner } from "@/components/ui/Spinner"

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token provided.")
      return
    }
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/verify-email?token=${token}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid or expired token")
        setStatus("success")
        setMessage("Email verified!")
      })
      .catch((err) => { setStatus("error"); setMessage(err.message || "Invalid or expired token.") })
  }, [token])

  return (
    <div className="text-center">
      {status === "loading" && <Spinner size="lg" className="mx-auto" />}
      {status === "success" && (
        <>
          <h1 className="text-2xl font-semibold text-brass mb-3">Verified</h1>
          <p className="text-sm text-slate mb-4">{message}</p>
          <Link href="/login" className="text-brass hover:underline text-sm">Go to login</Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-semibold text-danger mb-3">Error</h1>
          <p className="text-sm text-slate mb-4">{message}</p>
          <Link href="/login" className="text-brass hover:underline text-sm">Go to login</Link>
        </>
      )}
    </div>
  )
}
