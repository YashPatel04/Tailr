import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { DiffTooltip } from "@/components/diff/DiffTooltip"

describe("DiffTooltip", () => {
  it("renders children", () => {
    render(<DiffTooltip reasoning="Test reasoning"><span>Hover me</span></DiffTooltip>)
    expect(screen.getByText("Hover me")).toBeDefined()
  })

  it("shows reasoning on hover", () => {
    render(<DiffTooltip reasoning="This change improves clarity"><span>Hover me</span></DiffTooltip>)
    const trigger = screen.getByText("Hover me")
    fireEvent.mouseEnter(trigger)
    expect(screen.getByText("This change improves clarity")).toBeDefined()
  })
})
