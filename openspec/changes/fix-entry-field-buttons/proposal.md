## Why

The "Add organization", "Add date", "Add location", and "Add URL" buttons on entry cards are broken. They set fields to `""` (empty string), which is falsy in JavaScript, so the editable fields never render — the buttons reappear in an infinite loop. Additionally, the "Add URL" button has no input mechanism and never persists to backend. The organization field needs progressive disclosure: show a text field first, then reveal location/links once organization text exists.

## What Changes

- Fix falsy empty-string bug: "Add date", "Add organization", "Add location" buttons set fields to `""` which is falsy, causing the editable field to never appear. Change rendering logic to check `!== null` instead of truthy.
- Organization progressive disclosure: clicking "Add organization" shows an editable text field on the left. Once organization text exists, location and links fields appear on the right side simultaneously.
- Fix "Add URL" button: currently sets `urls = {}` with no input and no persistence. Replace with a working URL input that accepts a URL string and persists via `queueFieldEdit`.
- Fix "Add title" mislabel: the button labeled "Add title" actually sets the `role` field. Rename to "Add role".
- Fix TypeScript type mismatch: `Entry.url` should be `urls: Record<string, string>` not `url: string | null`.

## Capabilities

### New Capabilities
- `entry-field-editing`: Progressive disclosure for entry field buttons (organization, date, location, URL) with proper empty-but-present state handling

### Modified Capabilities

## Impact

- `frontend/app/components/document/EntryRenderer.tsx` — main rendering logic for entry fields and add buttons
- `frontend/app/types/index.ts` — Entry type fix (`url` → `urls`)
- No backend changes needed (backend already handles empty strings correctly)
