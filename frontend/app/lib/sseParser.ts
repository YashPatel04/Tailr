export interface SSEEvent {
  event: string
  data: string
}

export function parseSSELines(buffer: string): { events: SSEEvent[]; remainder: string } {
  const events: SSEEvent[] = []
  const parts = buffer.split("\n\n")
  const remainder = parts.pop()!

  for (const part of parts) {
    if (!part.trim()) continue
    let event = "message"
    let data = ""
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim()
      } else if (line.startsWith("data:")) {
        data = line.slice(5).trim()
      }
    }
    if (data) {
      events.push({ event, data })
    }
  }

  return { events, remainder }
}

export async function parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      if (signal.aborted) {
        throw new DOMException("Aborted", "AbortError")
      }

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const { events, remainder } = parseSSELines(buffer)
      buffer = remainder

      for (const event of events) {
        onEvent(event)
      }
    }

    if (buffer.trim()) {
      const { events } = parseSSELines(buffer + "\n\n")
      for (const event of events) {
        onEvent(event)
      }
    }
  } finally {
    reader.releaseLock()
  }
}
