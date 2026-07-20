import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "../msw/server"
import LoginPage from "@/app/(auth)/login/page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("Integration: Login Flow", () => {
  beforeEach(() => {
    server.use(
      http.post("http://localhost:8000/api/auth/login", () =>
        HttpResponse.json({ id: "1", email: "user@test.com", is_verified: true, career_context: null, oauth_provider: null, created_at: "2026-01-01", updated_at: "2026-01-01" })
      ),
    )
  })

  it("renders login form with email and password fields", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByPlaceholderText("Email")).toBeDefined()
    expect(screen.getByPlaceholderText("Password")).toBeDefined()
  })

  it("renders OAuth buttons", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText("GitHub")).toBeDefined()
    expect(screen.getByText("Google")).toBeDefined()
  })

  it("renders sign up link", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText("Sign up")).toBeDefined()
  })

  it("renders sign in button", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText("Sign in")).toBeDefined()
  })
})
