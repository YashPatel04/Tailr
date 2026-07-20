"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "@/components/ui/Toaster"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 10) {
      toast.error("Password must be at least 10 characters")
      return
    }
    if (newPassword !== confirm) {
      toast.error("Passwords don't match")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      })
      if (!res.ok) throw new Error("Invalid or expired token")
      toast.success("Password reset successfully")
      router.push("/login")
    } catch (err: any) {
      toast.error(err.message || "Reset failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink text-center mb-2">New password</h1>
      <p className="text-sm text-slate text-center mb-6">Choose a new password for your account</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="New password (min 10)" required className="w-full rounded-lg border border-muted px-3 py-2.5 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="Confirm password" required className="w-full rounded-lg border border-muted px-3 py-2.5 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-brass px-4 py-2.5 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors">
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  )
}
