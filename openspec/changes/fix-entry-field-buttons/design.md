## Context

Entry cards in the document canvas have a row of "Add field" buttons that let users populate empty fields (date, role, location, organization, URL). These buttons are broken because they set fields to `""` (empty string), which is falsy in JavaScript, so the condition `!entry.dates` evaluates to `true` and the button re-renders instead of the editable field. The organization field also needs progressive disclosure: show text first, then reveal location/links once text exists. The "Add URL" button has no input mechanism and doesn't persist.

## Goals / Non-Goals

**Goals:**
- Fix all "Add field" buttons so they transition from button → editable field
- Organization field follows progressive disclosure: left side text first, then right side location/links
- "Add URL" button accepts URL input and persists
- Fix "Add title" mislabel → "Add role"
- Fix TypeScript type mismatch (`url` → `urls`)

**Non-Goals:**
- No backend changes
- No changes to how fields are stored or synced
- No new field types beyond existing ones

## Decisions

### Rendering check: `!== null` instead of truthy

The current code uses `!entry.dates` to decide whether to show the "Add date" button. Since `""` is falsy, this means the button shows even after setting the field. Fix: use `entry.dates != null` (loose null check) to distinguish "field not set" from "field set to empty string".

### Organization progressive disclosure

Three states:
1. **No organization**: Show "Add organization" button on left
2. **Organization present, no location/urls**: Show organization field on left, "Add location" and "Add URL" buttons on right
3. **Organization + location/urls**: Show all fields

This keeps the entry card compact until the user opts into the secondary fields.

### URL input mechanism

Currently "Add URL" just sets `urls = {}` with no key/value and no input. Fix: the button should set `urls = { "": "" }` and render a small inline input for the URL value. The link renders as a clickable anchor when non-empty.

### Field persistence pattern

All "Add field" buttons follow the same pattern:
1. `updateCache` — set field to empty string `""` (makes it present but empty)
2. `queueFieldEdit` — persist the empty string to backend

This ensures the field exists in the database even when empty, preventing the button from re-appearing.

## Risks / Trade-offs

- **Risk**: Empty strings in the database for fields the user never intended to fill → **Mitigation**: Backend already handles empty strings gracefully; these are draft documents where empty fields are expected
- **Risk**: Organization field UX may be confusing if user doesn't realize location/links appear after typing → **Mitigation**: The buttons appear immediately next to the organization field, making the flow discoverable

## Migration Plan

No migration needed. Frontend-only change. Deploy as part of normal frontend build.

## Open Questions

None
