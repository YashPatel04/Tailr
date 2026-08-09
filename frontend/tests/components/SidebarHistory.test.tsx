import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SidebarHistory } from "@/components/sidebar/SidebarHistory"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "../msw/server"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("SidebarHistory", () => {
  beforeEach(() => {
    server.use(
      http.get("http://localhost:8000/api/health", () =>
        HttpResponse.json({ status: "ok" }, { headers: { "X-CSRF-Token": "test-token" } })
      ),
      http.get("http://localhost:8000/api/sessions/grouped", () =>
        HttpResponse.json({
          today: [
            {
              id: "1",
              company_name: "TodayCo",
              role_title: "Dev",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user_id: "1",
              master_resume_id: null,
              job_description: null,
              tailoring_mode: "polish",
              llm_provider_id: null,
              notes: null,
              research_summary_json: null,
              tags: [],
              is_archived: false,
            },
          ],
          yesterday: [
            {
              id: "2",
              company_name: "YesterdayCo",
              role_title: "Eng",
              created_at: new Date(Date.now() - 86400000).toISOString(),
              updated_at: new Date(Date.now() - 86400000).toISOString(),
              user_id: "1",
              master_resume_id: null,
              job_description: null,
              tailoring_mode: "polish",
              llm_provider_id: null,
              notes: null,
              research_summary_json: null,
              tags: [],
              is_archived: false,
            },
          ],
          previous_7_days: [],
          older: [],
        })
      )
    )
  })

  it("renders Today and Yesterday group headers", async () => {
    renderWithProviders(<SidebarHistory collapsed={false} />)
    expect(await screen.findByText("Today")).toBeDefined()
    expect(screen.getByText("Yesterday")).toBeDefined()
  })

  it("shows session entries under groups", async () => {
    renderWithProviders(<SidebarHistory collapsed={false} />)
    expect(await screen.findByText(/TodayCo/)).toBeDefined()
    expect(screen.getByText(/YesterdayCo/)).toBeDefined()
  })

  it("returns null when collapsed", () => {
    const { container } = renderWithProviders(<SidebarHistory collapsed={true} />)
    expect(container.firstChild).toBeNull()
  })
})
