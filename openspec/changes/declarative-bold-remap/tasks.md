## 1. Schema Updates

- [x] 1.1 Add `bold_added: list[str]` and `bold_removed: list[str]` fields to `UpdateBulletOp` in `content_ops.py`
- [x] 1.2 Add `bold_added: list[str]` and `bold_removed: list[str]` fields to `AddBulletOp` in `content_ops.py`

## 2. Remap Logic

- [x] 2.1 Implement `_remap_spans(old_text, new_text, old_spans, bold_added, bold_removed)` function in `content_ops.py`
- [x] 2.2 Phase 1: Remove spans matching `bold_removed` words (find word in old text, remove its span)
- [x] 2.3 Phase 2: Add spans for `bold_added` words (find word in new text, create span)
- [x] 2.4 Phase 3: Remap remaining old spans — validate against new text, find-and-remap if shifted, drop if gone

## 3. Integration

- [x] 3.1 Update `update_bullet` handler in `_apply_one` to call `_remap_spans` instead of `_clamp_spans`
- [x] 3.2 Update `add_bullet` handler in `_apply_one` to call `_clamp_spans` (no old text for remap)
- [x] 3.3 Update `add_entry` handler in `_apply_one` to call `_clamp_spans` on new bullets
- [x] 3.4 Keep `_clamp_spans` function (still needed for add_bullet, add_entry, and safety net)
- [x] 3.5 Keep safety-net span clamping in `apply()` after all operations as a fallback

## 4. Prompt Updates

- [x] 4.1 Update `V3_SYSTEM_PROMPT` in `prompts.py` to document `bold_added` and `bold_removed` fields
- [x] 4.2 Update `update_bullet` examples in prompt to include `bold_added`/`bold_removed`
- [x] 4.3 Add instruction: "For update_bullet, ALWAYS declare bold_added and bold_removed. List words you made bold that weren't before, and words you removed bold from."

## 5. Verification

- [x] 5.1 Verify existing tests still pass (backward compat with empty bold_added/bold_removed)
- [x] 5.2 Test: bold word replaced → old span removed, new span added
- [x] 5.3 Test: bold word deleted → old span removed, no new span
- [x] 5.4 Test: bold word shifted → span remapped to new position
- [x] 5.5 Test: no bold changes, just text edit → spans remapped by position
