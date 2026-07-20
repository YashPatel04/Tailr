import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "../msw/server"
import ProvidersPage from "@/settings/providers/page"

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn().mockResolvedValue(null),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("ProvidersPage", () => {
  beforeEach(() => {
    server.use(
      http.get("http://localhost:8000/api/providers", () =>
        HttpResponse.json([
          { id: "1", name: "My OpenAI", provider_type: "openai", api_key_last_four: "abcd", base_url: null, model: "gpt-4o", temperature: 0.7, top_p: 1.0, max_tokens: 4096, is_default: true, created_at: "2026-01-01" }
        ])
      ),
    )
  })

  it("renders providers list", () => {
    renderWithProviders(<ProvidersPage />)
    expect(screen.getByText("LLM Providers")).toBeDefined()
  })

  it("shows Add provider button", () => {
    renderWithProviders(<ProvidersPage />)
    expect(screen.getByText("Add provider")).toBeDefined()
  })

  it("shows provider card with name", () => {
    renderWithProviders(<ProvidersPage />)
    expect(screen.getByText("My OpenAI")).toBeDefined()
  })

  it("shows Test and Delete buttons on provider card", () => {
    renderWithProviders(<ProvidersPage />)
    expect(screen.getByText("Test")).toBeDefined()
    expect(screen.getByText("Delete")).toBeDefined()
  })
})
