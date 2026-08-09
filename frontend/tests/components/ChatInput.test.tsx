import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ChatInput } from "@/components/chat/ChatInput"

vi.mock("@/stores/sessionStore", () => ({
  useSessionStore: () => ({ isStreaming: false, setupOpen: false }),
}))

const onSend = vi.fn()

function renderInput() {
  return render(<ChatInput onSend={onSend} />)
}

describe("ChatInput", () => {
  beforeEach(() => {
    onSend.mockClear()
  })

  it("renders textarea", () => {
    renderInput()
    expect(screen.getByRole("textbox")).toBeDefined()
  })

  it("has send button disabled when empty", () => {
    renderInput()
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
  })

  it("submits on Enter without shift", () => {
    renderInput()
    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "Test message" } })
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false })
    expect(onSend).toHaveBeenCalledWith("Test message")
  })

  it("does not submit on Shift+Enter", () => {
    renderInput()
    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "Test message" } })
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })
})
