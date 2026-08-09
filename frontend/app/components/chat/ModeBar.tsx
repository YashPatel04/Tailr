"use client"

import { useSessionStore } from "@/stores/sessionStore"

export function ModeBar() {
  const { activeMode, setActiveMode, tailoringMode, setTailoringMode } = useSessionStore()

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-muted flex-shrink-0 bg-paper dark:bg-[#212121]">
      <div className="flex bg-[#f4f4f4] dark:bg-[#2b2b2b] rounded-lg p-0.5 gap-0.5">
        <button
          onClick={() => setActiveMode("plan")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            activeMode === "plan"
              ? "bg-paper dark:bg-[#343541] text-ink dark:text-[#ececec] shadow-sm"
              : "text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec]"
          }`}
        >
          Plan
        </button>
        <button
          onClick={() => setActiveMode("edit")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            activeMode === "edit"
              ? "bg-paper dark:bg-[#343541] text-ink dark:text-[#ececec] shadow-sm"
              : "text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec]"
          }`}
        >
          Edit
        </button>
      </div>
      <div className="w-px h-5 bg-muted" />
      <div className="flex gap-1">
        {["polish", "refine", "rewrite"].map((m) => (
          <button
            key={m}
            onClick={() => setTailoringMode(m)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              tailoringMode === m
                ? "bg-brass text-white"
                : "text-slate dark:text-[#8e8e8e] hover:bg-[#f4f4f4] dark:hover:bg-[#2b2b2b] hover:text-ink dark:hover:text-[#ececec]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}
