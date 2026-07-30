## Context

The resume tailoring pipeline uses LLM-generated content operations to edit bullet text. Each bullet has `spans` — formatting metadata (bold, italic, etc.) with `start`/`end` indices into the text. When the LLM rewrites a bullet via `update_bullet`, it sends new text + spans, but the spans frequently reference the old text's character positions. This causes Pydantic validation errors and the entire operation fails.

Current mitigation (`_clamp_spans`) drops invalid spans silently, losing formatting. The root cause is that index-based span communication is inherently fragile — the LLM must track character offsets through its own edits, which it consistently fails to do.

## Goals / Non-Goals

**Goals:**
- Preserve bold formatting across LLM bullet edits when the bolded word still exists in the new text
- Gracefully remove formatting when bolded words are deleted
- Handle new bold words the LLM adds
- Maintain backward compatibility with existing span-based operations

**Non-Goals:**
- Preserving formatting when the LLM rewords a bold word itself (e.g., "Engineered" → "Designed" — different word, can't preserve)
- Supporting complex multi-format overlapping spans (bold + italic on same text)
- Changing the Span data model or Bullet validation

## Decisions

### 1. Declarative bold fields on operations

Add `bold_added: list[str]` and `bold_removed: list[str]` to `update_bullet` and `add_bullet` operations. The LLM declares which words it bolded or un-bolded rather than computing indices.

**Why not just fix the indices?** The LLM consistently miscalculates character offsets. Asking it to declare intent (which words changed formatting) is a simpler task than asking it to compute precise indices.

**Why keep `spans` as fallback?** For unchanged bold words that just shifted position due to surrounding text edits, the LLM's span indices may still be correct or close enough to remap. The declarative fields handle additions/removals; spans handle positional shifts.

### 2. Three-phase remap in `_remap_spans`

```
Phase 1: Remove spans matching bold_removed words
  - Find each word in OLD text, identify its span, remove it

Phase 2: Add spans for bold_added words  
  - Find each word in NEW text, create new span

Phase 3: Remap remaining spans (unchanged bold that shifted)
  - For each remaining old span:
    a. Validate against new text (does new_text[start:end] == old substring?)
    b. If valid → keep as-is
    c. If invalid → find old substring in new text → remap
    d. If not found → drop (word was deleted/changed)
```

**Why three phases?** Separation of concerns: removals are unambiguous (word existed, now un-bolded), additions are unambiguous (word exists, now bolded), and positional shifts require string matching. Mixing them creates ordering conflicts.

### 3. First-match for ambiguous remap

When an old bold word appears multiple times in the new text, use `str.find()` (first occurrence). This is a pragmatic trade-off — full NLP alignment is overkill for resume bullets which rarely have duplicate bold words.

## Risks / Trade-offs

- **[LLM doesn't populate bold_added/bold_removed]** → Fallback: span-based remap still runs on old spans. Degraded to current behavior (clamp/drop) but no worse than today.
- **[Bold word appears multiple times]** → First-match heuristic may bold the wrong occurrence. Low risk in resume context (rare duplicate bold words).
- **[Performance]** → String matching is O(n*m) per span. Negligible for resume bullet lengths (< 500 chars, < 10 spans).
- **[Backward compatibility]** → Old LLM responses without `bold_added`/`bold_removed` still work — the fields default to empty lists, and span remap proceeds as before.
