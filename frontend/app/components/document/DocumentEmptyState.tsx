"use client"

import Link from "next/link"
import { FileText } from "lucide-react"
import { useSettingsStore } from "@/components/settings/SettingsModal"
import { useMasterResume } from "@/hooks/queries"
import { useSessionStore } from "@/stores/sessionStore"

export function DocumentEmptyState() {
  const { open } = useSettingsStore()
  const { data: master } = useMasterResume()
  const { setSetupOpen } = useSessionStore()
  const hasMaster = !!master

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <FileText size={64} className="text-[#e5e5e5] dark:text-[#4d4d4d]" />
      <div>
        <h2 className="text-2xl font-semibold text-ink dark:text-[#ececec]">
          {hasMaster ? "Welcome back" : "Get Started"}
        </h2>
        <p className="mt-2 text-sm text-slate dark:text-[#8e8e8e] max-w-md">
          {hasMaster
            ? "Select a session from the sidebar or create a new one to begin tailoring."
            : "Upload your master resume to begin tailoring it for specific job descriptions."}
        </p>
      </div>
      {hasMaster ? (
        <button
          onClick={() => setSetupOpen(true)}
          className="rounded-lg bg-brass px-6 py-2.5 text-sm font-medium text-white hover:bg-brass-hover transition-colors"
        >
          New session
        </button>
      ) : (
        <button
          onClick={() => open("master-resume")}
          className="rounded-lg bg-brass px-6 py-2.5 text-sm font-medium text-white hover:bg-brass-hover transition-colors"
        >
          Upload your master resume
        </button>
      )}
    </div>
  )
}
