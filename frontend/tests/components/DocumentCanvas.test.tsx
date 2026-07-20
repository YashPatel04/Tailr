import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { DocumentCanvas } from "@/components/document/DocumentCanvas"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "../msw/server"

vi.mock("@/stores/sessionStore", () => ({
  useSessionStore: () => ({
    activeSessionId: null,
    activeDocType: "resume",
    viewMode: "final",
    setupOpen: false,
    isStreaming: false,
    latestDocument: null,
    setActiveSession: vi.fn(),
    setDocType: vi.fn(),
    setViewMode: vi.fn(),
    setSetupOpen: vi.fn(),
    setStreaming: vi.fn(),
    setLatestDocument: vi.fn(),
  }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("DocumentCanvas", () => {
  it("renders empty state when no active session", () => {
    renderWithProviders(<DocumentCanvas />)
    expect(screen.getByText("Get Started")).toBeDefined()
  })

  it("shows upload button in empty state", () => {
    renderWithProviders(<DocumentCanvas />)
    expect(screen.getByText("Upload your master resume")).toBeDefined()
  })
})
