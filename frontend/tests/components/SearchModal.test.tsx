import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SearchModal } from "@/components/search/SearchModal"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "../msw/server"

let mockOpen = vi.fn()
let mockClose = vi.fn()

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: () => ({ isOpen: true, open: mockOpen, close: mockClose }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("SearchModal", () => {
  beforeEach(() => {
    mockClose.mockClear()
    vi.stubGlobal("scrollTo", vi.fn())
    server.use(
      http.get("http://localhost:8000/api/sessions", () => HttpResponse.json([])),
      http.get("http://localhost:8000/api/companies", () => HttpResponse.json([])),
      http.get("http://localhost:8000/api/tags", () => HttpResponse.json([])),
    )
  })

  it("renders search input", () => {
    renderWithProviders(<SearchModal />)
    expect(screen.getByPlaceholderText("Search chats, companies, tags...")).toBeDefined()
  })

  it("closes on Escape", () => {
    renderWithProviders(<SearchModal />)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(mockClose).toHaveBeenCalled()
  })
})
