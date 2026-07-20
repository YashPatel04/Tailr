import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProgressMessage } from "@/components/chat/ProgressMessage"
import type { ChatMessage } from "@/types"

describe("ProgressMessage", () => {
  it("renders researching phase with Search icon", () => {
    const msg: ChatMessage = {
      id: "1", session_id: "s1", role: "system", content: "",
      metadata_json: { phase: "researching" },
      patch_id: null, created_at: "2026-01-01",
    }
    render(<ProgressMessage message={msg} />)
    expect(screen.getByText("Researching...")).toBeDefined()
  })

  it("renders thinking phase", () => {
    const msg: ChatMessage = {
      id: "2", session_id: "s1", role: "system", content: "",
      metadata_json: { phase: "thinking" },
      patch_id: null, created_at: "2026-01-01",
    }
    render(<ProgressMessage message={msg} />)
    expect(screen.getByText("Thinking...")).toBeDefined()
  })

  it("renders writing phase", () => {
    const msg: ChatMessage = {
      id: "3", session_id: "s1", role: "system", content: "",
      metadata_json: { phase: "writing" },
      patch_id: null, created_at: "2026-01-01",
    }
    render(<ProgressMessage message={msg} />)
    expect(screen.getByText("Writing changes...")).toBeDefined()
  })

  it("renders done phase", () => {
    const msg: ChatMessage = {
      id: "4", session_id: "s1", role: "system", content: "",
      metadata_json: { phase: "done" },
      patch_id: null, created_at: "2026-01-01",
    }
    render(<ProgressMessage message={msg} />)
    expect(screen.getByText("Done")).toBeDefined()
  })

  it("renders fallback for unknown phase", () => {
    const msg: ChatMessage = {
      id: "5", session_id: "s1", role: "system", content: "Unknown phase content",
      metadata_json: { phase: "unknown" },
      patch_id: null, created_at: "2026-01-01",
    }
    render(<ProgressMessage message={msg} />)
    expect(screen.getByText("Unknown phase content")).toBeDefined()
  })
})
