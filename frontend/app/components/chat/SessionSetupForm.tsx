"use client"

import { useState } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { useProviders } from "@/hooks/queries"
import { apiRequest } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/Toaster"

export function SessionSetupForm() {
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [jdText, setJdText] = useState("")
  const [jdUrl, setJdUrl] = useState("")
  const [useUrl, setUseUrl] = useState(false)
  const [mode, setMode] = useState<string>("polish")
  const [providerId, setProviderId] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { setActiveSession, setSetupOpen } = useSessionStore()
  const { data: providers } = useProviders()
  const queryClient = useQueryClient()

  const handleSubmit = async () => {
    if (!company || !role) return
    setSubmitting(true)

    try {
      const session = await apiRequest<any>("POST", "/api/sessions", {
        company_name: company,
        role_title: role,
        job_description: useUrl ? undefined : jdText,
        job_description_url: useUrl ? jdUrl : undefined,
        tailoring_mode: mode,
        llm_provider_id: providerId || null,
        notes: notes || null,
      })

      setActiveSession(session.id)
      setSetupOpen(false)

      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      toast.success("Session created")
    } catch (err: any) {
      toast.error(err.message || "Failed to create session")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-3 pb-3">
      <div className="space-y-2">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company name"
          className="w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink placeholder:text-[#8e8e8e] outline-none focus:border-brass focus:ring-1 focus:ring-brass/30"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role title"
          className="w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink placeholder:text-[#8e8e8e] outline-none focus:border-brass focus:ring-1 focus:ring-brass/30"
        />
        <div className="flex gap-1">
          <button
            onClick={() => setUseUrl(false)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${!useUrl ? "bg-brass text-white" : "bg-[#f4f4f4] dark:bg-[#2b2b2b] text-slate dark:text-[#8e8e8e] hover:bg-[#e8e8e8] dark:hover:bg-[#4d4d5e]"}`}
          >
            Paste JD
          </button>
          <button
            onClick={() => setUseUrl(true)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${useUrl ? "bg-brass text-white" : "bg-[#f4f4f4] dark:bg-[#2b2b2b] text-slate dark:text-[#8e8e8e] hover:bg-[#e8e8e8] dark:hover:bg-[#4d4d5e]"}`}
          >
            JD URL
          </button>
        </div>
        {useUrl ? (
          <input
            value={jdUrl}
            onChange={(e) => setJdUrl(e.target.value)}
            placeholder="Paste job posting URL"
            className="w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink placeholder:text-[#8e8e8e] outline-none focus:border-brass focus:ring-1 focus:ring-brass/30"
          />
        ) : (
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste job description..."
            rows={3}
            className="w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink placeholder:text-[#8e8e8e] outline-none focus:border-brass focus:ring-1 focus:ring-brass/30 resize-none"
          />
        )}
        <div className="flex gap-1">
          {["polish", "refine", "rewrite"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${mode === m ? "bg-brass text-white" : "bg-[#f4f4f4] dark:bg-[#2b2b2b] text-slate dark:text-[#8e8e8e] hover:bg-[#e8e8e8] dark:hover:bg-[#4d4d5e]"}`}
            >
              {m}
            </button>
          ))}
        </div>
        {providers && providers.length > 0 && (
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink outline-none focus:border-brass focus:ring-1 focus:ring-brass/30 bg-paper"
          >
            <option value="">Default provider</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.model})
              </option>
            ))}
          </select>
        )}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink placeholder:text-[#8e8e8e] outline-none focus:border-brass focus:ring-1 focus:ring-brass/30 resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!company || !role || submitting}
          className="w-full rounded-lg bg-brass px-3 py-2.5 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
        >
          {submitting ? "Creating..." : "Create Session"}
        </button>
      </div>
    </div>
  )
}
