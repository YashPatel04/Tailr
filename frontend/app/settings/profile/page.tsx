"use client"

import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { useCurrentUser } from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"

export default function ProfilePage() {
  const { data: user } = useCurrentUser()
  const [careerContext, setCareerContext] = useState("")
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (user?.career_context !== undefined) {
      setCareerContext(user.career_context || "")
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiRequest("PATCH", "/api/users/me", { career_context: careerContext })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      toast.success("Saved")
    } catch (err: any) {
      toast.error(err.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink mb-6">Profile</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Career context</label>
          <p className="text-xs text-slate mb-2">This is injected into every tailoring prompt.</p>
          <textarea
            value={careerContext}
            onChange={(e) => setCareerContext(e.target.value)}
            rows={6}
            className="w-full min-h-[160px] rounded-lg border border-muted px-3 py-2 text-sm focus:border-brass focus:ring-1 focus:ring-brass/30 outline-none resize-y"
            placeholder="I'm a senior engineer with 10 years of experience in..."
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  )
}
