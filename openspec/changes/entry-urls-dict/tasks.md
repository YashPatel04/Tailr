## 1. Backend Model

- [x] 1.1 Change `Entry.url: str | None = None` to `Entry.urls: dict[str, str] = Field(default_factory=dict)` in `app/models/resume_schema.py`

## 2. Content Operations

- [x] 2.1 Change `AddEntryOp.url: str | None = None` to `urls: dict[str, str] = Field(default_factory=dict)` in `app/services/editing/content_ops.py`
- [x] 2.2 Remove `"url"` from `UpdateFieldOp.field` Literal in `app/services/editing/content_ops.py`
- [x] 2.3 Add `UpdateEntryUrlsOp` class with fields: `section_label`, `entry_index`, `urls: dict[str, str]`, `reasoning`
- [x] 2.4 Register `UpdateEntryUrlsOp` in `OP_CLASSES` and `_OP_MAP`
- [x] 2.5 Update `ContentApplier._apply_one` for `add_entry`: change `url=op.url` to `urls=op.urls`
- [x] 2.6 Add `ContentApplier._apply_one` handler for `update_entry_urls`: find section/entry, replace `entry.urls` with `op.urls`
- [x] 2.7 Update `ContentDiffer._compare_entry_fields`: replace `"url"` with `"urls"` in the field comparison loop

## 3. LLM Prompts

- [x] 3.1 Update `build_tailor_prompt_v3` in `app/services/llm/prompts.py`: change `add_entry` example from `"url": "..."` to `"urls": {"https://...": "Display Text"}`
- [x] 3.2 Add `update_entry_urls` operation documentation to the prompt's available ops list
- [x] 3.3 Update `EXTRACTION_PROMPT` in `app/services/importers/tex_llm_importer.py`: change schema from `"url": null` to `"urls": {}`
- [x] 3.4 Update extraction instruction #6: `\href{url}{text}` maps to `urls[url] = text`

## 4. Jinja2 Templates

- [x] 4.1 Update `resume.tex.j2`: replace `entry.url` block with loop over `entry.urls.items()` rendering `\href{url}{mask or url}`
- [x] 4.2 Update `resume.html.j2`: replace `entry.url` block with loop over `entry.urls.items()` rendering `<a href="url">{mask or url}</a>`

## 5. Frontend

- [x] 5.1 Update `EntryRenderer.tsx`: change `entry.url` reads to `entry.urls` dict access
- [x] 5.2 Update `EntryRenderer.tsx`: change `queueFieldEdit("url", ...)` to `queueEdit({op: "update_entry_urls", section_label, entry_index, urls: {...}})`
- [x] 5.3 Update `EntryRenderer.tsx`: display first URL's mask (or URL if empty) as the inline text

## 6. Tests

- [x] 6.1 Update `test_resume_schema.py`: change `Entry(url="https://acme.com")` to `Entry(urls={"https://acme.com": "acme.com"})`
- [x] 6.2 Update `test_content_editing.py`: rewrite `test_update_field_to_none` to test `UpdateEntryUrlsOp`
- [x] 6.3 Update `test_rendering.py`: change `Entry(url="https://...")` fixtures to `Entry(urls={...})`

## 7. Documentation

- [x] 7.1 Update `docs/resume-schema.md`: change `url: str | None` to `urls: dict[str, str]` in Entry table, update tree diagram, update example JSON
- [x] 7.2 Update `docs/content-editing.md`: change `add_entry` params from `url?` to `urls?`, remove `"url"` from `update_field` allowed values, add `update_entry_urls` to ops table
