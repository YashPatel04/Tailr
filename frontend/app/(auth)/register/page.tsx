"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "@/components/ui/Toaster"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 10) {
      toast.error("Password must be at least 10 characters")
      return
    }
    if (password !== confirm) {
      toast.error("Passwords don't match")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Registration failed" }))
        throw new Error(err.detail || "Registration failed")
      }
      setSuccess(true)
    } catch (err: any) {
      toast.error(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink mb-3">Check your inbox</h1>
        <p className="text-sm text-slate">We sent a verification link to {email}.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink text-center mb-1">Create account</h1>
      <p className="text-sm text-slate text-center mb-6">Get started with Resume Tailor</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required className="w-full rounded-lg border border-muted px-3 py-2.5 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password (min 10 characters)" required className="w-full rounded-lg border border-muted px-3 py-2.5 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="Confirm password" required className="w-full rounded-lg border border-muted px-3 py-2.5 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-brass px-4 py-2.5 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate">
        Already have an account? <Link href="/login" className="text-brass hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
