"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/components/ui/Toaster"
import { useQueryClient } from "@tanstack/react-query"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || "Login failed")
        }
        return res.json()
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      router.push("/")
    } catch (err: any) {
      toast.error(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink text-center mb-1">Welcome back</h1>
      <p className="text-sm text-slate text-center mb-6">Sign in to Resume Tailor</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required className="w-full rounded-lg border border-muted px-3 py-2.5 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required className="w-full rounded-lg border border-muted px-3 py-2.5 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-brass px-4 py-2.5 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="mt-4 flex gap-2">
        <a href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/github/login`} className="flex-1 rounded-lg border border-muted px-3 py-2.5 text-center text-sm text-slate hover:bg-[#f7f7f8] transition-colors dark:hover:bg-[#40414f]">GitHub</a>
        <a href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/google/login`} className="flex-1 rounded-lg border border-muted px-3 py-2.5 text-center text-sm text-slate hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors">Google</a>
      </div>
      <p className="mt-4 text-center text-sm text-slate">
        Don&apos;t have an account? <Link href="/register" className="text-brass hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
