import type { ResumeContent, DiffChange, DiffKind } from "@/types"

export interface WordDiffSegment {
  text: string
  type: "same" | "added" | "removed"
}

export function wordDiff(
  oldText: string,
  newText: string
): { old: WordDiffSegment[]; new: WordDiffSegment[] } {
  const oldWords = oldText.split(/(\s+)/).filter((w) => w.trim().length > 0)
  const newWords = newText.split(/(\s+)/).filter((w) => w.trim().length > 0)

  const m = oldWords.length
  const n = newWords.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldWords[i - 1] === newWords[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const oldResult: WordDiffSegment[] = []
  const newResult: WordDiffSegment[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      oldResult.unshift({ text: oldWords[i - 1], type: "same" })
      newResult.unshift({ text: newWords[j - 1], type: "same" })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newResult.unshift({ text: newWords[j - 1], type: "added" })
      j--
    } else {
      oldResult.unshift({ text: oldWords[i - 1], type: "removed" })
      i--
    }
  }

  return { old: oldResult, new: newResult }
}

function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

function set(
  map: Map<string, DiffChange>,
  key: string,
  kind: DiffKind,
  old?: unknown,
  new_?: unknown
) {
  map.set(key, {
    kind,
    old: old != null ? (typeof old === "string" ? old : JSON.stringify(old)) : undefined,
    new: new_ != null ? (typeof new_ === "string" ? new_ : JSON.stringify(new_)) : undefined,
  })
}

export function computeFieldDiffs(
  master: ResumeContent | null | undefined,
  session: ResumeContent | null | undefined
): Map<string, DiffChange> {
  const changes = new Map<string, DiffChange>()
  if (!master || !session) return changes

  const basicsFields = ["name", "email", "phone", "location"] as const
  for (const field of basicsFields) {
    if (!eq(master.basics[field], session.basics[field])) {
      set(changes, `basics:${field}`, "modified", master.basics[field], session.basics[field])
    }
  }

  const masterSections = new Map(master.sections.map((s) => [s.id, s]))
  const sessionSections = new Map(session.sections.map((s) => [s.id, s]))

  for (const [id, ss] of sessionSections) {
    const ms = masterSections.get(id)
    if (!ms) {
      set(changes, `s:${id}`, "added")
      continue
    }

    let sectionChanged = false
    if (!eq(ms.label, ss.label)) {
      set(changes, `s:${id}:label`, "modified", ms.label, ss.label)
      sectionChanged = true
    }
    if (!eq(ms.metadata, ss.metadata)) {
      set(changes, `s:${id}:metadata`, "modified", ms.metadata, ss.metadata)
      sectionChanged = true
    }

    const masterEntries = new Map(ms.entries.map((e) => [e.id, e]))
    const sessionEntries = new Map(ss.entries.map((e) => [e.id, e]))

    for (const [eid, se] of sessionEntries) {
      const me = masterEntries.get(eid)
      if (!me) {
        set(changes, `s:${id}:e:${eid}`, "added")
        set(changes, eid, "added")
        sectionChanged = true
        continue
      }

      let entryChanged = false
      for (const field of ["title", "role", "organization", "dates", "location"] as const) {
        if (!eq(me[field], se[field])) {
          set(changes, `s:${id}:e:${eid}:f:${field}`, "modified", me[field], se[field])
          entryChanged = true
        }
      }
      if (!eq(me.urls, se.urls)) {
        set(changes, `s:${id}:e:${eid}:f:urls`, "modified", me.urls, se.urls)
        entryChanged = true
      }

      const masterBullets = new Map(me.bullets.map((b) => [b.id, b]))
      const sessionBullets = new Map(se.bullets.map((b) => [b.id, b]))

      for (const [bid, sb] of sessionBullets) {
        const mb = masterBullets.get(bid)
        if (!mb) {
          set(changes, `s:${id}:e:${eid}:b:${bid}`, "added")
          set(changes, bid, "added")
          entryChanged = true
          continue
        }
        if (!eq(mb.text, sb.text)) {
          set(changes, `s:${id}:e:${eid}:b:${bid}`, "modified", mb.text, sb.text)
          set(changes, bid, "modified", mb.text, sb.text)
          entryChanged = true
        }
      }

      for (const [bid] of masterBullets) {
        if (!sessionBullets.has(bid)) {
          set(changes, `s:${id}:e:${eid}:b:${bid}`, "removed")
          set(changes, bid, "removed")
          entryChanged = true
        }
      }

      if (entryChanged) {
        set(changes, eid, "modified")
        sectionChanged = true
      }
    }

    for (const [eid] of masterEntries) {
      if (!sessionEntries.has(eid)) {
        set(changes, `s:${id}:e:${eid}`, "removed")
        set(changes, eid, "removed")
        sectionChanged = true
      }
    }

    const masterRows = new Map(ms.skill_rows.map((r) => [r.id, r]))
    const sessionRows = new Map(ss.skill_rows.map((r) => [r.id, r]))

    for (const [rid, sr] of sessionRows) {
      const mr = masterRows.get(rid)
      if (!mr) {
        set(changes, `s:${id}:sr:${rid}`, "added")
        set(changes, rid, "added")
        sectionChanged = true
        continue
      }
      let rowChanged = false
      if (!eq(mr.category, sr.category)) {
        set(changes, `s:${id}:sr:${rid}:category`, "modified", mr.category, sr.category)
        rowChanged = true
      }
      if (!eq(mr.items, sr.items)) {
        set(changes, `s:${id}:sr:${rid}:items`, "modified", mr.items, sr.items)
        rowChanged = true
      }
      if (rowChanged) {
        set(changes, rid, "modified")
        sectionChanged = true
      }
    }

    for (const [rid] of masterRows) {
      if (!sessionRows.has(rid)) {
        set(changes, `s:${id}:sr:${rid}`, "removed")
        set(changes, rid, "removed")
        sectionChanged = true
      }
    }

    if (sectionChanged) {
      set(changes, id, "modified")
    }
  }

  for (const [id] of masterSections) {
    if (!sessionSections.has(id)) {
      set(changes, `s:${id}`, "removed")
      set(changes, id, "removed")
    }
  }

  return changes
}
