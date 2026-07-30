## Context

The resume engine stores structured content as `ResumeContent` (Pydantic models serialized to JSONB). Each `Entry` in a section currently has `url: str | None` — a single URL string with no display text control. The LLM import pipeline extracts `\href{url}{text}` from LaTeX but discards the display text, storing only the URL. Templates render the raw URL as both the href and the visible text. The frontend exposes URL as a single editable text field via `update_field`.

The system has 16 typed content operations for editing resume content. All edits — LLM proposals and manual canvas edits — flow through `ContentApplier` and `ContentDiffer`.

## Goals / Non-Goals

**Goals:**
- Support multiple URLs per entry, each with an independent display mask
- Preserve display text during LaTeX import (`\href{url}{mask}` → `urls[url] = mask`)
- Provide a dedicated `UpdateEntryUrlsOp` for editing the urls dict
- Maintain backward compatibility: empty mask (`""` key) means "display the URL itself"
- Update all rendering paths (LaTeX, HTML, docx, txt) to iterate the dict

**Non-Goals:**
- Migration of existing database rows (user confirmed: existing resumes will be deleted)
- Redesigning the frontend URL editing UI beyond basic functionality
- Adding URL validation or normalization
- Changing `Span.link_url` (unrelated — inline formatting links stay as-is)

## Decisions

### D1: `dict[str, str]` over `list[dict]`

**Choice:** `urls: dict[str, str]` where key = URL, value = mask.

**Alternatives considered:**
- `list[{url: str, mask: str}]` — ordered, allows duplicate URLs, more natural for LLM output. But: dict is simpler to update by key, deduplicates automatically, and matches how the user described the requirement.
- Single `url` + `url_mask` fields — doesn't support multiple URLs.

**Rationale:** Dict is the simplest structure that supports the use case. The key IS the URL (natural identifier), the value IS the display text. No ordering requirement was stated. No duplicate URL use case exists.

### D2: Dedicated `UpdateEntryUrlsOp` over extending `UpdateFieldOp`

**Choice:** New op: `{"op": "update_entry_urls", "section_label": "...", "entry_index": 0, "urls": {"url": "mask"}}`

**Alternatives considered:**
- Allow `UpdateFieldOp` with `field="urls"` and value as JSON string — messes with the type system, `UpdateFieldOp.value` is `str | None` not `dict`.
- Allow `UpdateFieldOp` with `field="urls"` and value as dict — breaks the `value: str | None` type contract.

**Rationale:** `UpdateFieldOp` is designed for scalar string fields. `urls` is a structured dict. A dedicated op keeps the type system clean and makes the applier logic straightforward.

### D3: Empty key `""` as "no mask" signal

**Choice:** When the dict contains `{"" : ""}` or `{"https://example.com": ""}`, the empty string value means "use the URL itself as display text".

**Alternatives considered:**
- `null` value — Pydantic dict values are `str`, not `str | None`. Would need to change the type.
- Omit the value — dict requires a value.

**Rationale:** Empty string is the simplest signal that doesn't require type changes. The templates check: `mask if mask else url`.

### D4: Frontend shows first URL inline, full list on expand

**Choice:** The `EntryRenderer` shows the first URL's mask (or URL if no mask) as the current inline display. Editing it updates that URL's mask. A future enhancement can add a URL list editor.

**Rationale:** Keeps the frontend change minimal and matches the current UI pattern (single inline field). The frontend doesn't need to know about multiple URLs yet — it just renders what's there.

### D5: LLM produces `urls` dict in tailor responses

**Choice:** The tailor prompt instructs the LLM to produce `"urls": {"url": "mask"}` in `add_entry` operations, and a new `update_entry_urls` op for modifying existing URLs.

**Rationale:** The LLM already has the full resume JSON with `urls` dicts. It can produce matching output. The import prompt handles the `\href{url}{text}` → `urls[url] = text` mapping.

## Risks / Trade-offs

- **[Risk]** LLM may produce malformed `urls` dicts → **Mitigation:** Pydantic validation catches invalid structures; ContentApplier validates on apply.
- **[Risk]** Frontend `queueFieldEdit("url", ...)` calls break → **Mitigation:** Replace with `queueEdit({op: "update_entry_urls", ...})` — mechanical change, one file.
- **[Risk]** Existing test fixtures use `url=` kwarg → **Mitigation:** Update all test fixtures to `urls={}` — straightforward find-and-replace.
- **[Trade-off]** Dict loses ordering → Acceptable: URLs have no natural order requirement.
- **[Trade-off]** Dict deduplicates same URL with different masks → Acceptable: last-write-wins is fine for this use case.

## Migration Plan

No database migration needed. User confirmed existing resumes will be deleted. All `content_json` JSONB columns will naturally contain the new schema on next import/save.

## Open Questions

- Should the frontend support adding/removing multiple URLs per entry in this change, or is showing the first URL sufficient for now? (Deferring to implementation — minimal UI is fine.)
