"use client"

import { useState } from "react"
import { apiRequest } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/Toaster"
import { useCurrentUser } from "@/hooks/queries"

export default function AccountPage() {
  const { data: user } = useCurrentUser()
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast.error("Passwords don't match")
      return
    }
    if (newPw.length < 10) {
      toast.error("Password must be at least 10 characters")
      return
    }
    setSaving(true)
    try {
      await apiRequest("POST", "/api/users/me/change-password", {
        current_password: currentPw,
        new_password: newPw,
      })
      toast.success("Password changed")
      setCurrentPw("")
      setNewPw("")
      setConfirmPw("")
    } catch (err: any) {
      toast.error(err.message || "Failed to change password")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("This will permanently delete your account and all data. Continue?")) return
    setDeleting(true)
    try {
      await apiRequest("DELETE", "/api/users/me")
      queryClient.clear()
      window.location.href = "/login"
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink mb-6">Account</h1>
      <div className="space-y-8">
        {user?.oauth_provider && (
          <div>
            <p className="text-sm text-slate">
              Linked account: <span className="text-ink font-medium capitalize">{user.oauth_provider}</span>
            </p>
          </div>
        )}
        <div className="space-y-3 max-w-sm">
          <h2 className="text-sm font-semibold text-ink">Change password</h2>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30"
          />
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password (min 10 characters)"
            className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30"
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30"
          />
          <button
            onClick={handleChangePassword}
            disabled={saving || !currentPw || !newPw}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Change password"}
          </button>
        </div>
        <div className="border-t border-muted pt-8">
          <h2 className="text-sm font-semibold text-danger mb-2">Danger zone</h2>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  )
}
