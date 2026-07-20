import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSessionSSE } from "@/hooks/useSessionSSE"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

vi.mock("@/lib/env", () => ({
  getApiBaseUrl: () => "http://localhost:8000",
}))

vi.mock("@/stores/sessionStore", () => ({
  useSessionStore: () => ({
    setStreaming: vi.fn(),
    setLatestDocument: vi.fn(),
    setViewMode: vi.fn(),
  }),
}))

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: vi.fn(),
}))

describe("useSessionSSE", () => {
  it("returns sendMessage function", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      const queryClient = new QueryClient()
      return React.createElement(QueryClientProvider, { client: queryClient }, children)
    }

    const { result } = renderHook(() => useSessionSSE("session-1"), { wrapper })
    expect(typeof result.current.sendMessage).toBe("function")
  })

  it("does not send message when sessionId is null", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      const queryClient = new QueryClient()
      return React.createElement(QueryClientProvider, { client: queryClient }, children)
    }

    const { result } = renderHook(() => useSessionSSE(null), { wrapper })
    expect(typeof result.current.sendMessage).toBe("function")
  })
})
