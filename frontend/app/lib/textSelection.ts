export function getTextOffset(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
  let total = 0
  while (walker.nextNode()) {
    if (walker.currentNode === node) {
      return total + offset
    }
    total += walker.currentNode.textContent?.length ?? 0
  }
  return total
}

export function getSelectionOffsets(container: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !container.contains(sel.anchorNode)) return null
  const range = sel.getRangeAt(0)
  const start = getTextOffset(container, range.startContainer, range.startOffset)
  const end = getTextOffset(container, range.endContainer, range.endOffset)
  return { start, end }
}

export function setSelectionFromOffsets(container: HTMLElement, start: number, end: number): void {
  const sel = window.getSelection()
  if (!sel) return
  const startNode = findTextNodeAtOffset(container, start)
  const endNode = findTextNodeAtOffset(container, end)
  if (!startNode || !endNode) return
  const range = document.createRange()
  range.setStart(startNode.node, startNode.offset)
  range.setEnd(endNode.node, endNode.offset)
  sel.removeAllRanges()
  sel.addRange(range)
}

function findTextNodeAtOffset(
  container: HTMLElement,
  offset: number
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
  let total = 0
  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text
    const len = textNode.textContent?.length ?? 0
    if (total + len >= offset) {
      return { node: textNode, offset: offset - total }
    }
    total += len
  }
  return null
}

export function placeCaretAtPoint(container: HTMLElement, x: number, y: number): boolean {
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y)
    if (pos && container.contains(pos.offsetNode)) {
      const sel = window.getSelection()
      if (!sel) return false
      const range = document.createRange()
      range.setStart(pos.offsetNode, pos.offset)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
      return true
    }
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y)
    if (range && container.contains(range.startContainer)) {
      const sel = window.getSelection()
      if (!sel) return false
      sel.removeAllRanges()
      sel.addRange(range)
      return true
    }
  }
  return false
}

export function placeCaretAtEnd(container: HTMLElement): void {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.selectNodeContents(container)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

export function selectWordAtPoint(container: HTMLElement, x: number, y: number): void {
  if (!placeCaretAtPoint(container, x, y)) {
    placeCaretAtEnd(container)
  }
  const sel = window.getSelection()
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0)
    try {
      range.expand("word" as any)
      sel.removeAllRanges()
      sel.addRange(range)
    } catch {
      // expand not supported in all browsers, ignore
    }
  }
}
