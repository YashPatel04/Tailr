import type { SpanAnnotation } from "@/types"

interface FormattedTextProps {
  text: string
  spans: SpanAnnotation[]
}

export function FormattedText({ text, spans }: FormattedTextProps) {
  if (!spans || spans.length === 0) {
    return <>{text}</>
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start)
  const parts: { text: string; formats: string[] }[] = []
  let lastEnd = 0

  for (const span of sorted) {
    if (span.start > lastEnd) {
      parts.push({ text: text.slice(lastEnd, span.start), formats: [] })
    }
    parts.push({ text: text.slice(span.start, span.end), formats: span.formats })
    lastEnd = span.end
  }

  if (lastEnd < text.length) {
    parts.push({ text: text.slice(lastEnd), formats: [] })
  }

  return (
    <>
      {parts.map((part, i) => {
        const classes = []
        if (part.formats.includes("bold")) classes.push("font-bold")
        if (part.formats.includes("italic")) classes.push("italic")
        if (part.formats.includes("underline")) classes.push("underline")
        if (part.formats.includes("code"))
          classes.push("font-mono text-sm bg-slate/10 px-1 rounded")

        if (classes.length === 0) return <span key={i}>{part.text}</span>
        return (
          <span key={i} className={classes.join(" ")}>
            {part.text}
          </span>
        )
      })}
    </>
  )
}
