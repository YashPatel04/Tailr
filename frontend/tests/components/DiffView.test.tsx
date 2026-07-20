import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DiffMark } from "@/components/diff/DiffMark"

describe("DiffMark", () => {
  it("renders added mark with green border", () => {
    const { container } = render(<DiffMark type="added"><span>New content</span></DiffMark>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain("border-proof-green")
    expect(screen.getByText("New content")).toBeDefined()
  })

  it("renders removed mark with red border and strikethrough", () => {
    const { container } = render(<DiffMark type="removed"><span>Old content</span></DiffMark>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain("border-proof-red")
    expect(div.className).toContain("line-through")
  })

  it("renders moved mark with dashed border", () => {
    const { container } = render(<DiffMark type="moved"><span>Moved content</span></DiffMark>)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain("border-dashed")
  })

  it("renders children without mark for unknown type", () => {
    render(<DiffMark type={"added" as any}><span>Normal content</span></DiffMark>)
    expect(screen.getByText("Normal content")).toBeDefined()
  })
})
