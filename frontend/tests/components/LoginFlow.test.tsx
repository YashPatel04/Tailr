import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "../msw/server"
import LoginPage from "@/(auth)/login/page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("Integration: Login Flow", () => {
  beforeEach(() => {
    server.use(
      http.get("http://localhost:8000/api/users/me", () => HttpResponse.json({}, { status: 401 }))
    )
  })

  it("renders OAuth login buttons", async () => {
    renderWithProviders(<LoginPage />)
    expect(await screen.findByText("Continue with GitHub")).toBeDefined()
    expect(screen.getByText("Continue with Google")).toBeDefined()
  })

  it("links to GitHub OAuth endpoint", async () => {
    renderWithProviders(<LoginPage />)
    const githubLink = (await screen.findByText("Continue with GitHub")).closest("a")
    expect(githubLink?.getAttribute("href")).toContain("/api/auth/github/login")
  })

  it("links to Google OAuth endpoint", async () => {
    renderWithProviders(<LoginPage />)
    const googleLink = (await screen.findByText("Continue with Google")).closest("a")
    expect(googleLink?.getAttribute("href")).toContain("/api/auth/google/login")
  })
})
