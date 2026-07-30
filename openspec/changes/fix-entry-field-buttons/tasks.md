## 1. Fix TypeScript types

- [ ] 1.1 Fix `Entry` interface in `types/index.ts`: change `url: string | null` to `urls: Record<string, string> | null`
- [ ] 1.2 Verify no compile errors after type change

## 2. Fix falsy rendering bugs in EntryRenderer.tsx

- [ ] 2.1 Fix "Add date" button: change `!entry.dates` to `entry.dates == null` (line 150)
- [ ] 2.2 Fix "Add role" button: change `!entry.role && !entry.location` to `entry.role == null && entry.location == null` (line 163)
- [ ] 2.3 Fix "Add organization" button: change `entry.organization` truthiness check to `entry.organization != null` (line 212)
- [ ] 2.4 Rename "Add title" label to "Add role" (line 193)

## 3. Implement organization progressive disclosure

- [ ] 3.1 Restructure organization row into three states: no org → org only → org + location + urls
- [ ] 3.2 Show "Add location" and "Add URL" buttons simultaneously when organization is present but location/urls are null
- [ ] 3.3 Ensure location and URL fields render when present

## 4. Fix Add URL button

- [ ] 4.1 Change "Add URL" onClick to set `urls = { "": "" }` instead of `urls = {}`
- [ ] 4.2 Add `queueFieldEdit("urls", { "": "" })` call to persist
- [ ] 4.3 Render inline URL input when urls is present but empty
- [ ] 4.4 Render clickable anchor when URL value is non-empty

## 5. Fix Add location button

- [ ] 5.1 Change "Add location" onClick to set `location = ""` and call `queueFieldEdit("location", "")`
- [ ] 5.2 Ensure the button disappears and editable field appears after click

## 6. Verify and test

- [ ] 6.1 Run `npm run lint` and fix any issues
- [ ] 6.2 Run `npm run typecheck` (or `npx tsc --noEmit`) and fix any errors
- [ ] 6.3 Manually verify all five buttons work: Add date, Add role, Add organization, Add location, Add URL
- [ ] 6.4 Verify organization progressive disclosure flow: click Add org → type name → location/links buttons appear
