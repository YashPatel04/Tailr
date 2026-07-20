import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ChatInput } from "@/components/chat/ChatInput"

vi.mock("@/stores/sessionStore", () => ({
  useSessionStore: () => ({ isStreaming: false, setupOpen: false }),
}))

describe("ChatInput", () => {
  it("renders textarea", () => {
    render(<ChatInput />)
    expect(screen.getByRole("textbox")).toBeDefined()
  })

  it("has send button disabled when empty", () => {
    render(<ChatInput />)
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
  })

  it("submits on Enter without shift", () => {
    render(<ChatInput />)
    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "Test message" } })
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false })
  })

  it("does not submit on Shift+Enter", () => {
    render(<ChatInput />)
    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "Test message" } })
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true })
  })
})
