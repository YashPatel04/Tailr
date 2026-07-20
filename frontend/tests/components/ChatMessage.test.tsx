import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChatMessage } from "@/components/chat/ChatMessage"
import type { ChatMessage as ChatMessageType } from "@/types"

describe("ChatMessage", () => {
  it("renders user message right-aligned", () => {
    const msg: ChatMessageType = {
      id: "1", session_id: "s1", role: "user", content: "Hello",
      metadata_json: null, patch_id: null, created_at: "2026-01-01",
    }
    render(<ChatMessage message={msg} />)
    const container = screen.getByText("Hello").closest("div")
    expect(container?.className).toContain("justify-end")
  })

  it("renders assistant message left-aligned", () => {
    const msg: ChatMessageType = {
      id: "2", session_id: "s1", role: "assistant", content: "Hi there",
      metadata_json: null, patch_id: null, created_at: "2026-01-01",
    }
    render(<ChatMessage message={msg} />)
    const container = screen.getByText("Hi there").closest("div")
    expect(container?.className).toContain("justify-start")
  })

  it("renders user bubble with brass background", () => {
    const msg: ChatMessageType = {
      id: "3", session_id: "s1", role: "user", content: "Tailor this",
      metadata_json: null, patch_id: null, created_at: "2026-01-01",
    }
    render(<ChatMessage message={msg} />)
    const bubble = screen.getByText("Tailor this")
    expect(bubble.className).toContain("bg-brass")
  })

  it("renders assistant bubble with slate background", () => {
    const msg: ChatMessageType = {
      id: "4", session_id: "s1", role: "assistant", content: "Done",
      metadata_json: null, patch_id: null, created_at: "2026-01-01",
    }
    render(<ChatMessage message={msg} />)
    const bubble = screen.getByText("Done")
    expect(bubble.className).toContain("bg-slate/10")
  })
})
