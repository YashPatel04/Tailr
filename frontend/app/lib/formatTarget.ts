type FormatAction = "bold" | "italic" | "underline" | "link"

interface FormatTarget {
  toggleFormat: (format: "bold" | "italic" | "underline" | "code") => void
  addLink: () => void
}

const targets = new Map<string, FormatTarget>()

export function registerFormatTarget(id: string, target: FormatTarget) {
  targets.set(id, target)
}
export function unregisterFormatTarget(id: string) {
  targets.delete(id)
}

export function applyFormatAction(action: FormatAction) {
  const el = document.activeElement as HTMLElement | null
  if (!el) return
  const id = el.getAttribute("data-rte-id")
  if (!id) return
  const target = targets.get(id)
  if (!target) return
  if (action === "link") {
    target.addLink()
  } else {
    target.toggleFormat(action)
  }
}
