export interface DiffSegment {
  text: string
  type: "same" | "added" | "removed"
}

export function wordDiff(oldText: string, newText: string): { old: DiffSegment[]; new: DiffSegment[] } {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  const oldFlat = oldWords.filter(w => w.trim().length > 0)
  const newFlat = newWords.filter(w => w.trim().length > 0)

  const lcsMatrix: number[][] = Array(oldFlat.length + 1).fill(null).map(() => Array(newFlat.length + 1).fill(0))

  for (let i = 1; i <= oldFlat.length; i++) {
    for (let j = 1; j <= newFlat.length; j++) {
      if (oldFlat[i - 1] === newFlat[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1])
      }
    }
  }

  const oldResult: DiffSegment[] = []
  const newResult: DiffSegment[] = []

  let i = oldFlat.length
  let j = newFlat.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldFlat[i - 1] === newFlat[j - 1]) {
      oldResult.unshift({ text: oldFlat[i - 1], type: "same" })
      newResult.unshift({ text: newFlat[j - 1], type: "same" })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
      newResult.unshift({ text: newFlat[j - 1], type: "added" })
      j--
    } else if (i > 0) {
      oldResult.unshift({ text: oldFlat[i - 1], type: "removed" })
      i--
    }
  }

  return { old: oldResult, new: newResult }
}

export function renderDiffText(
  kind: string | null,
  currentText: string,
  oldVal?: string,
  newVal?: string
): React.ReactNode {
  if (!kind) return currentText

  if (kind === "added") {
    return <span className="diff-added">{currentText}</span>
  }

  if (kind === "removed") {
    return <span className="diff-removed">{currentText}</span>
  }

  if (kind === "modified" && oldVal !== undefined && newVal !== undefined) {
    const diff = wordDiff(oldVal, newVal)
    return (
      <span>
        {diff.old.map((seg, i) =>
          seg.type === "removed" ? (
            <span key={i} className="diff-removed">{seg.text}</span>
          ) : seg.type === "same" ? (
            <span key={i} className="opacity-50">{seg.text}</span>
          ) : null
        )}
        <span className="mx-1" />
        {diff.new.map((seg, i) =>
          seg.type === "added" ? (
            <span key={i} className="diff-added">{seg.text}</span>
          ) : seg.type === "same" ? (
            <span key={i}>{seg.text}</span>
          ) : null
        )}
      </span>
    )
  }

  if (kind === "modified" && newVal !== undefined && oldVal === undefined) {
    return <span className="diff-modified"><span className="diff-removed text-slate">{currentText}</span><span className="mx-1"/><span className="diff-added">{newVal}</span></span>
  }

  return currentText
}

export function diffGutter(kind: string | null): string {
  if (kind === "added") return "+"
  if (kind === "removed") return "\u2013"
  if (kind === "modified") return "~"
  return ""
}

export function diffBorderClass(kind: string | null): string {
  if (kind === "added") return "border-l-[3px] border-[#137333] dark:border-[#81c995]"
  if (kind === "removed") return "border-l-[3px] border-[#c5221f] dark:border-[#f28b82]"
  if (kind === "modified") return "border-l-[3px] border-[#e37400] dark:border-[#fdd663]"
  return ""
}

export function diffGutterClass(kind: string | null): string {
  if (kind === "added") return "text-[#137333] dark:text-[#81c995]"
  if (kind === "removed") return "text-[#c5221f] dark:text-[#f28b82]"
  if (kind === "modified") return "text-[#e37400] dark:text-[#fdd663]"
  return ""
}
