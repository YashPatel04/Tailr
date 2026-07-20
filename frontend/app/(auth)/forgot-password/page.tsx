"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }))
        throw new Error(err.detail || "Request failed")
      }
      setSent(true)
    } catch {} finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink mb-3">Check your inbox</h1>
        <p className="text-sm text-slate">If that email exists, we sent a reset link.</p>
        <Link href="/login" className="mt-4 inline-block text-brass hover:underline text-sm">Back to login</Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink text-center mb-2">Reset password</h1>
      <p className="text-sm text-slate text-center mb-6">Enter your email to receive a reset link</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required className="w-full rounded-lg border border-muted px-3 py-2.5 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-brass px-4 py-2.5 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors">
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate">
        <Link href="/login" className="text-brass hover:underline">Back to login</Link>
      </p>
    </div>
  )
}
