"use client"

import { useSessionStore } from "@/stores/sessionStore"
import { ArrowRightLeft, X } from "lucide-react"

interface ModeSuggestBannerProps {
  suggestedMode: "plan" | "edit"
  reason?: string
}

export function ModeSuggestBanner({ suggestedMode, reason }: ModeSuggestBannerProps) {
  const { activeMode, setActiveMode } = useSessionStore()

  if (activeMode === suggestedMode) return null

  const handleSwitch = () => setActiveMode(suggestedMode)

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-gradient-to-br from-brass/5 to-transparent border border-brass/20 px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <ArrowRightLeft size={14} className="text-brass mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-ink dark:text-[#ececec] leading-relaxed">
              {reason || `Looks like you're ${suggestedMode === "plan" ? "researching and planning" : "ready to make changes"}. Want to switch to ${suggestedMode === "plan" ? "Plan" : "Edit"} Mode?`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSwitch}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-brass text-white hover:bg-brass-hover transition-colors"
          >
            Switch to {suggestedMode === "plan" ? "Plan" : "Edit"} Mode
          </button>
          <button
            className="px-3 py-1 text-xs font-medium rounded-lg border border-muted text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] transition-colors"
          >
            Stay in {activeMode === "plan" ? "Plan" : "Edit"} Mode
          </button>
        </div>
      </div>
    </div>
  )
}
