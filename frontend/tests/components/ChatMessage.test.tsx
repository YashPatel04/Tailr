import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChatMessage } from "@/components/chat/ChatMessage"
import type { ChatMessage as ChatMessageType } from "@/types"

function makeMessage(overrides: Partial<ChatMessageType> = {}): ChatMessageType {
  return {
    id: "1",
    session_id: "s1",
    role: "user",
    content: "Hello",
    metadata_json: null,
    patch_id: null,
    llm_provider_id: null,
    model: null,
    created_at: "2026-01-01",
    ...overrides,
  }
}

function getBubble(text: string): HTMLElement | null {
  let el = screen.getByText(text)
  while (el && !el.className?.includes("rounded-2xl")) {
    if (!el.parentElement) return null
    el = el.parentElement
  }
  return el
}

describe("ChatMessage", () => {
  it("renders user message right-aligned", () => {
    render(<ChatMessage message={makeMessage({ content: "Hello" })} />)
    const bubble = getBubble("Hello")
    expect(bubble?.parentElement?.className).toContain("justify-end")
  })

  it("renders assistant message left-aligned", () => {
    render(<ChatMessage message={makeMessage({ role: "assistant", content: "Hi there" })} />)
    const bubble = getBubble("Hi there")
    expect(bubble?.parentElement?.className).toContain("justify-start")
  })

  it("renders user bubble with paper background", () => {
    render(<ChatMessage message={makeMessage({ content: "Tailor this" })} />)
    const bubble = getBubble("Tailor this")
    expect(bubble?.className).toContain("bg-[#f4f4f4]")
  })

  it("renders assistant bubble with assistant background", () => {
    render(<ChatMessage message={makeMessage({ role: "assistant", content: "Done" })} />)
    const bubble = getBubble("Done")
    expect(bubble?.className).toContain("bg-[#f7f7f8]")
  })
})
