import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "../msw/server"

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("Sidebar", () => {
  beforeEach(() => {
    server.use(
      http.get("http://localhost:8000/api/companies", () =>
        HttpResponse.json([{ company_name: "TestCorp", session_count: 3, last_active_at: "2026-01-01" }])
      ),
      http.get("http://localhost:8000/api/sessions/grouped", () =>
        HttpResponse.json({ today: [{ id: "1", company_name: "TestCo", role_title: "Dev", created_at: "2026-01-01", updated_at: "2026-01-01" }], yesterday: [], previous_7_days: [], older: [] })
      ),
      http.get("http://localhost:8000/api/users/me", () =>
        HttpResponse.json({ id: "1", email: "test@test.com", career_context: null, oauth_provider: null, created_at: "2026-01-01", updated_at: "2026-01-01" })
      ),
    )
  })

  it("renders expanded sidebar with header text", () => {
    renderWithProviders(<Sidebar collapsed={false} onToggle={vi.fn()} />)
    expect(screen.getByText("Resume Tailor")).toBeDefined()
  })

  it("renders collapsed sidebar without header text", () => {
    renderWithProviders(<Sidebar collapsed={true} onToggle={vi.fn()} />)
    expect(screen.queryByText("Resume Tailor")).toBeNull()
  })

  it("renders new chat button in expanded state", () => {
    renderWithProviders(<Sidebar collapsed={false} onToggle={vi.fn()} />)
    expect(screen.getByText("New Chat")).toBeDefined()
  })
})
