"use client"

import { useRef, useState, useEffect } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { useSession } from "@/hooks/queries"
import { FileText, Mail } from "lucide-react"

export function DocumentTabs() {
  const { activeSessionId, activeDocType, setDocType } = useSessionStore()
  const { data: session } = useSession(activeSessionId!)
  const hasCoverLetter = session?.has_cover_letter || false

  const resumeRef = useRef<HTMLButtonElement>(null)
  const coverRef = useRef<HTMLButtonElement>(null)
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const activeRef = activeDocType === "resume" ? resumeRef : coverRef
    const islandRef = activeRef.current?.parentElement
    if (activeRef.current && islandRef) {
      const islandRect = islandRef.getBoundingClientRect()
      const btnRect = activeRef.current.getBoundingClientRect()
      setPillStyle({
        left: btnRect.left - islandRect.left,
        width: btnRect.width,
      })
    }
  }, [activeDocType])

  return (
    <div className="relative flex justify-center z-10">
      <div className="relative inline-flex items-center bg-[#171717] rounded-full p-1 gap-0.5 shadow-[0_2px_12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.04)]">
        <span
          className="absolute top-1 bottom-1 rounded-full bg-[#10a37f] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ left: pillStyle.left, width: pillStyle.width }}
        />
        <button
          ref={resumeRef}
          onClick={() => setDocType("resume")}
          className={`relative z-10 flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            activeDocType === "resume" ? "text-white" : "text-[#8e8e8e] hover:text-[#ececec]"
          }`}
        >
          <FileText size={14} />
          Resume
        </button>
        <button
          ref={coverRef}
          onClick={() => setDocType("cover_letter")}
          className={`relative z-10 flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            activeDocType === "cover_letter" ? "text-white" : "text-[#8e8e8e] hover:text-[#ececec]"
          }`}
        >
          <Mail size={14} />
          Cover Letter
          {!hasCoverLetter && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
        </button>
      </div>
    </div>
  )
}
