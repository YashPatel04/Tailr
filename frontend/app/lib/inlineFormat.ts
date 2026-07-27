import type { Span } from "@/types"

export type InlineFormat = "bold" | "italic" | "underline"

export function toggleInlineFormat(
  spans: Span[],
  start: number,
  end: number,
  format: InlineFormat
): Span[] {
  if (start === end) return spans
  const overlap = spans.find((s) => s.start === start && s.end === end)
  if (overlap) {
    const formats = [...overlap.formats] as string[]
    const idx = formats.indexOf(format)
    if (idx >= 0) {
      formats.splice(idx, 1)
      if (formats.length === 0 && !overlap.link_url) {
        return spans.filter((s) => s !== overlap)
      }
      return spans.map((s) => (s === overlap ? { ...s, formats: formats as Span["formats"] } : s))
    } else {
      return spans.map((s) =>
        s === overlap ? { ...s, formats: [...s.formats, format] as Span["formats"] } : s
      )
    }
  }
  return [...spans, { start, end, formats: [format] as Span["formats"], link_url: null }]
}

export function setLinkUrl(spans: Span[], start: number, end: number, url: string | null): Span[] {
  if (start === end) return spans
  const existing = spans.find((s) => s.start === start && s.end === end)
  if (existing) {
    if (url === null && existing.formats.length === 0) {
      return spans.filter((s) => s !== existing)
    }
    return spans.map((s) => (s === existing ? { ...s, link_url: url } : s))
  }
  if (url === null) return spans
  return [...spans, { start, end, formats: [], link_url: url }]
}

export function getActiveFormats(spans: Span[], position: number): InlineFormat[] {
  const active: InlineFormat[] = []
  for (const span of spans) {
    if (position >= span.start && position < span.end) {
      for (const f of span.formats) {
        if ((["bold", "italic", "underline"] as string[]).includes(f) && !active.includes(f as InlineFormat)) {
          active.push(f as InlineFormat)
        }
      }
    }
  }
  return active
}

export function hasLinkAtPosition(spans: Span[], position: number): boolean {
  return spans.some((s) => position >= s.start && position < s.end && s.link_url !== null)
}
