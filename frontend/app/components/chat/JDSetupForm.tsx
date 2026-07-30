"use client"

import { useState } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { useAnalyzeMutation } from "@/hooks/useAnalyzeMutation"
import { apiRequest, getCsrfToken } from "@/lib/api"
import { getApiBaseUrl } from "@/lib/env"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/Toaster"

type Step = "input" | "extracted" | "error"

export function JDSetupForm() {
  const [step, setStep] = useState<Step>("input")
  const [jdText, setJdText] = useState("")
  const [useUrl, setUseUrl] = useState(false)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [mode, setMode] = useState<string>("polish")
  const [clarifyingQuestion, setClarifyingQuestion] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { setActiveSession, setSetupOpen } = useSessionStore()
  const analyzeMutation = useAnalyzeMutation()
  const queryClient = useQueryClient()

  const handleAnalyze = async () => {
    if (!jdText.trim()) return
    const payload = useUrl
      ? { job_description_url: jdText }
      : { job_description: jdText }

    try {
      const result = await analyzeMutation.mutateAsync(payload)
      if (result.extracted) {
        setCompany(result.company_name || "")
        setRole(result.role_title || "")
        setSourceUrl(result.source_url || "")
        setStep("extracted")
      } else {
        setClarifyingQuestion(result.question || "Could not extract fields. Please provide them manually.")
        setStep("error")
      }
    } catch {
      toast.error("Failed to analyze job description")
    }
  }

  const handleCreateSession = async () => {
    if (!company || !role) return
    setSubmitting(true)
    try {
      const session = await apiRequest<any>("POST", "/api/sessions", {
        company_name: company,
        role_title: role,
        job_description: useUrl ? undefined : jdText,
        job_description_url: useUrl ? jdText : undefined,
        tailoring_mode: mode,
      })

      setActiveSession(session.id)
      setSetupOpen(false)

      const csrfToken = await getCsrfToken()
      fetch(`${getApiBaseUrl()}/api/sessions/${session.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          content: "Tailor my resume for this role. Highlight relevant experience and skills that match the job description.",
          role: "user",
          mode: "edit",
          tailoring_mode: mode,
        }),
        credentials: "include",
      }).catch(() => {})

      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      toast.success("Session created")
    } catch (err: any) {
      toast.error(err.message || "Failed to create session")
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualFill = () => {
    setCompany("")
    setRole("")
    setStep("extracted")
  }

  if (step === "input") {
    return (
      <div className="px-3 pb-3">
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-ink dark:text-[#ececec] mb-0.5">Tailor your resume</h3>
            <p className="text-xs text-slate dark:text-[#8e8e8e]">Paste a job description or URL. We&apos;ll extract the details.</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => { setUseUrl(false); setJdText("") }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${!useUrl ? "bg-brass text-white" : "bg-[#f4f4f4] dark:bg-[#2b2b2b] text-slate dark:text-[#8e8e8e] hover:bg-[#e8e8e8] dark:hover:bg-[#4d4d5e]"}`}
            >
              Paste JD
            </button>
            <button
              onClick={() => { setUseUrl(true); setJdText("") }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${useUrl ? "bg-brass text-white" : "bg-[#f4f4f4] dark:bg-[#2b2b2b] text-slate dark:text-[#8e8e8e] hover:bg-[#e8e8e8] dark:hover:bg-[#4d4d5e]"}`}
            >
              JD URL
            </button>
          </div>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder={useUrl ? "Paste job posting URL..." : "Paste job description..."}
            rows={5}
            className="w-full rounded-lg border border-muted px-3 py-2 text-sm text-ink dark:text-[#ececec] placeholder:text-[#8e8e8e] outline-none focus:border-brass focus:ring-1 focus:ring-brass/30 resize-none bg-paper dark:bg-[#2b2b2b]"
          />
          <button
            onClick={handleAnalyze}
            disabled={!jdText.trim() || analyzeMutation.isPending}
            className="w-full rounded-lg bg-brass px-3 py-2.5 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
          >
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Job Posting"}
          </button>
        </div>
      </div>
    )
  }

  if (step === "error") {
    return (
      <div className="px-3 pb-3">
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {clarifyingQuestion}
          </div>
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
          <button
            onClick={handleCreateSession}
            disabled={!company || !role || submitting}
            className="w-full rounded-lg bg-brass px-3 py-2.5 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Start Session"}
          </button>
          <button
            onClick={() => setStep("input")}
            className="w-full text-xs text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] transition-colors"
          >
            Back to job description
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 pb-3">
      <div className="space-y-3">
        <div className="rounded-lg bg-[#f7f7f8] dark:bg-[#2b2b2b] border border-muted px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate dark:text-[#8e8e8e] w-14">Company</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="flex-1 text-sm text-ink dark:text-[#ececec] bg-transparent outline-none border-b border-transparent hover:border-muted focus:border-brass transition-colors py-0.5"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate dark:text-[#8e8e8e] w-14">Role</span>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex-1 text-sm text-ink dark:text-[#ececec] bg-transparent outline-none border-b border-transparent hover:border-muted focus:border-brass transition-colors py-0.5"
            />
          </div>
          {sourceUrl && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate dark:text-[#8e8e8e] w-14">Source</span>
              <span className="text-xs text-slate dark:text-[#8e8e8e] truncate">{sourceUrl}</span>
            </div>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate dark:text-[#8e8e8e] mb-1.5">Tailoring Intensity</div>
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
        </div>
        <button
          onClick={handleCreateSession}
          disabled={!company || !role || submitting}
          className="w-full rounded-lg bg-brass px-3 py-2.5 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
        >
          {submitting ? "Creating..." : "Start Session"}
        </button>
        <button
          onClick={() => setStep("input")}
          className="w-full text-xs text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] transition-colors"
        >
          Back to job description
        </button>
      </div>
    </div>
  )
}
