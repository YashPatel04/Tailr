## 1. Session deletion cache invalidation

- [x] 1.1 In `SidebarHistoryItem.tsx` `handleDelete`: add `queryClient.invalidateQueries({ queryKey: ["sessions", "grouped"] })` and `queryClient.invalidateQueries({ queryKey: ["companies"] })` after the existing `["sessions"]` invalidation
- [x] 1.2 In `SidebarHistoryItem.tsx` `handleArchive`: add `queryClient.invalidateQueries({ queryKey: ["sessions", "grouped"] })` and `queryClient.invalidateQueries({ queryKey: ["companies"] })` after the existing `["sessions"]` invalidation

## 2. Active session redirect on delete

- [x] 2.1 In `SidebarHistoryItem.tsx` `handleDelete`: after invalidation, check if `session.id === activeSessionId`, and if so, call `router.push("/")`

## 3. Master resume deletion UI update

- [x] 3.1 In `settings/master-resume/page.tsx` `handleDelete`: add `queryClient.setQueryData(["master-resume"], null)` after the `apiRequest` call (before or after invalidation)
- [x] 3.2 In `SettingsModal.tsx` `MasterResumeTab` `handleDelete`: add `queryClient.setQueryData(["master-resume"], null)` after the `apiRequest` call

## 4. Verification

- [x] 4.1 Run `npm run lint` and `npx prettier --check .` in the frontend directory
- [ ] 4.2 Manual test: delete a session, confirm company badge updates and history refreshes
- [ ] 4.3 Manual test: delete last session for a company, confirm company vanishes from sidebar
- [ ] 4.4 Manual test: delete the currently active session, confirm redirect to `/`
- [ ] 4.5 Manual test: delete master resume from settings page, confirm empty state renders
- [ ] 4.6 Manual test: delete master resume from settings modal, confirm empty state renders
