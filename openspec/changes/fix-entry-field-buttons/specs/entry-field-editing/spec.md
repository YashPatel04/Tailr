# entry-field-editing

## Purpose

Entry cards in the document canvas allow users to progressively populate fields via "Add field" buttons. These buttons must transition from button → editable field on click, and the organization field must follow a two-stage progressive disclosure pattern.

## Requirements

### R1: Add field buttons must transition to editable fields

When a user clicks an "Add field" button (Add date, Add role, Add location, Add organization), the button must disappear and be replaced by an editable field. The field is set to `""` (empty string) in the cache and persisted via `queueFieldEdit`.

**Acceptance criteria:**
- Clicking "Add date" replaces the button with a `RichEditableField` for dates
- Clicking "Add role" replaces the button with a `RichEditableField` for role
- Clicking "Add location" replaces the button with a `RichEditableField` for location
- Clicking "Add organization" replaces the button with a `RichEditableField` for organization
- The editable field appears immediately (optimistic cache update)
- The field persists to backend via `queueFieldEdit`

### R2: Rendering check must use null check, not truthiness

The condition guarding "Add field" buttons must check `entry.field != null` (or equivalent) instead of `entry.field` (truthy). This ensures empty string `""` renders the editable field, not the button.

**Acceptance criteria:**
- `entry.dates = ""` renders `RichEditableField`, not "Add date" button
- `entry.role = ""` renders `RichEditableField`, not "Add role" button
- `entry.location = ""` renders `RichEditableField`, not "Add location" button
- `entry.organization = ""` renders `RichEditableField`, not "Add organization" button
- `entry.dates = null` or `entry.dates = undefined` renders the "Add date" button

### R3: Organization progressive disclosure

The organization row follows a three-state pattern:

**State 1 — No organization, no urls:**
```
Left:  [+ Add organization]
Right: (empty)
```

**State 2 — Organization present, no location/urls:**
```
Left:  [Organization field]
Right: [+ Add location]  [+ Add URL]
```

**State 3 — Fully populated:**
```
Left:  [Organization field]
Right: [Location field]  [URL link]
```

**Acceptance criteria:**
- "Add location" and "Add URL" buttons appear simultaneously when organization is present
- "Add location" and "Add URL" buttons do NOT appear when organization is null
- Once location/URL are added, they show as editable fields

### R4: Add URL button must accept input and persist

The "Add URL" button currently sets `urls = {}` with no input mechanism. Fix:
- Button sets `urls = { "": "" }` to make the field present
- Renders a small inline input for the URL value
- Persists via `queueFieldEdit("urls", { "": "" })`
- When URL is non-empty, renders as a clickable anchor

**Acceptance criteria:**
- Clicking "Add URL" shows an editable URL input
- User can type a URL and it persists
- The URL renders as a clickable link
- The link opens in a new tab

### R5: Fix "Add title" mislabel

The button labeled "Add title" actually sets the `role` field. Rename to "Add role".

**Acceptance criteria:**
- Button text reads "Add role" not "Add title"

### R6: Fix TypeScript type mismatch

`Entry.url` (singular, `string | null`) should be `Entry.urls` (plural, `Record<string, string>`). The component code already uses the dict shape correctly.

**Acceptance criteria:**
- `Entry` interface has `urls: Record<string, string> | null`
- No compile errors

## Constraints

- Frontend-only change, no backend modifications
- Must work with existing `RichEditableField` and `AddFieldButton` components
- Must preserve existing field persistence pattern (`updateCache` + `queueFieldEdit`)
