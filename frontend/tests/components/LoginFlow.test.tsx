import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import LoginPage from "@/app/(auth)/login/page"

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("Integration: Login Flow", () => {
  it("renders OAuth login buttons", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText("Continue with GitHub")).toBeDefined()
    expect(screen.getByText("Continue with Google")).toBeDefined()
  })

  it("links to GitHub OAuth endpoint", () => {
    renderWithProviders(<LoginPage />)
    const githubLink = screen.getByText("Continue with GitHub").closest("a")
    expect(githubLink?.getAttribute("href")).toContain("/api/auth/github/login")
  })

  it("links to Google OAuth endpoint", () => {
    renderWithProviders(<LoginPage />)
    const googleLink = screen.getByText("Continue with Google").closest("a")
    expect(googleLink?.getAttribute("href")).toContain("/api/auth/google/login")
  })
})
