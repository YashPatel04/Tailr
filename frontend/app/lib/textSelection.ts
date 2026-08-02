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
