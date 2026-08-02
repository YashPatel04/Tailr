import { describe, it, expect } from "vitest"
import { parseSSELines, parseSSEStream, SSEEvent } from "@/lib/sseParser"

describe("parseSSELines", () => {
  it("parses a single complete SSE message", () => {
    const buffer = 'event: thinking\ndata: {"message":"Thinking..."}\n\n'
    const { events, remainder } = parseSSELines(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ event: "thinking", data: '{"message":"Thinking..."}' })
    expect(remainder).toBe("")
  })

  it("parses multiple SSE messages in one buffer", () => {
    const buffer =
      'event: researching\ndata: {"message":"Researching..."}\n\nevent: thinking\ndata: {"message":"Thinking..."}\n\n'
    const { events, remainder } = parseSSELines(buffer)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ event: "researching", data: '{"message":"Researching..."}' })
    expect(events[1]).toEqual({ event: "thinking", data: '{"message":"Thinking..."}' })
    expect(remainder).toBe("")
  })

  it("returns partial message as remainder", () => {
    const buffer = 'event: thinking\ndata: {"message":"Thinking...'
    const { events, remainder } = parseSSELines(buffer)
    expect(events).toHaveLength(0)
    expect(remainder).toBe(buffer)
  })

  it("handles message with no explicit event (defaults to message)", () => {
    const buffer = 'data: {"some":"data"}\n\n'
    const { events, remainder } = parseSSELines(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ event: "message", data: '{"some":"data"}' })
    expect(remainder).toBe("")
  })

  it("skips empty messages", () => {
    const buffer = '\n\nevent: done\ndata: {"done":true}\n\n'
    const { events, remainder } = parseSSELines(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ event: "done", data: '{"done":true}' })
    expect(remainder).toBe("")
  })

  it("handles message with only event and no data", () => {
    const buffer = "event: ping\n\n"
    const { events, remainder } = parseSSELines(buffer)
    expect(events).toHaveLength(0)
    expect(remainder).toBe("")
  })

  it("handles complete message followed by partial", () => {
    const buffer =
      'event: thinking\ndata: {"message":"Thinking..."}\n\nevent: writing\ndata: {"mess'
    const { events, remainder } = parseSSELines(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ event: "thinking", data: '{"message":"Thinking..."}' })
    expect(remainder).toBe('event: writing\ndata: {"mess')
  })

  it("handles error event", () => {
    const buffer = 'event: error\ndata: {"message":"Something went wrong"}\n\n'
    const { events, remainder } = parseSSELines(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      event: "error",
      data: '{"message":"Something went wrong"}',
    })
    expect(remainder).toBe("")
  })
})

describe("parseSSEStream", () => {
  function createStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    let i = 0
    return new ReadableStream({
      pull(controller) {
        if (i < chunks.length) {
          controller.enqueue(encoder.encode(chunks[i]))
          i++
        } else {
          controller.close()
        }
      },
    })
  }

  it("parses a complete stream with one chunk", async () => {
    const stream = createStream([
      'event: thinking\ndata: {"message":"Thinking..."}\n\nevent: done\ndata: {"done":true}\n\n',
    ])
    const events: SSEEvent[] = []
    const controller = new AbortController()
    await parseSSEStream(stream, (e) => events.push(e), controller.signal)
    expect(events).toHaveLength(2)
    expect(events[0].event).toBe("thinking")
    expect(events[1].event).toBe("done")
  })

  it("handles chunked stream where message spans multiple chunks", async () => {
    const stream = createStream(["event: thin", 'king\ndata: {"message":"Thin', 'king..."}\n\n'])
    const events: SSEEvent[] = []
    const controller = new AbortController()
    await parseSSEStream(stream, (e) => events.push(e), controller.signal)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ event: "thinking", data: '{"message":"Thinking..."}' })
  })

  it("handles empty stream", async () => {
    const stream = createStream([])
    const events: SSEEvent[] = []
    const controller = new AbortController()
    await parseSSEStream(stream, (e) => events.push(e), controller.signal)
    expect(events).toHaveLength(0)
  })

  it("aborts when signal is triggered", async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(encoder.encode('event: thinking\ndata: {"message":"Thinking..."}\n\n'))
        controller.close()
      },
    })
    const events: SSEEvent[] = []
    const controller = new AbortController()
    controller.abort()
    await expect(parseSSEStream(stream, (e) => events.push(e), controller.signal)).rejects.toThrow(
      "Aborted"
    )
  })
})
