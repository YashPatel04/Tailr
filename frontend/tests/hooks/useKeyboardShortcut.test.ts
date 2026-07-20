import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut"

describe("useKeyboardShortcut", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls callback when key combination matches", () => {
    const callback = vi.fn()
    renderHook(() => useKeyboardShortcut({ key: "k", metaKey: true }, callback, true))

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("does not call callback when disabled", () => {
    const callback = vi.fn()
    renderHook(() => useKeyboardShortcut({ key: "k", metaKey: true }, callback, false))

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it("does not call callback when wrong key", () => {
    const callback = vi.fn()
    renderHook(() => useKeyboardShortcut({ key: "x", metaKey: true }, callback, true))

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it("cleans up listener on unmount", () => {
    const callback = vi.fn()
    const { unmount } = renderHook(() => useKeyboardShortcut({ key: "k", metaKey: true }, callback, true))

    unmount()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
    })

    expect(callback).not.toHaveBeenCalled()
  })
})
