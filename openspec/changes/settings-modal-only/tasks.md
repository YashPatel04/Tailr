## 1. Port ResumePreview to modal

- [x] 1.1 Copy the `ResumePreview` component from `app/settings/master-resume/page.tsx` into `app/components/settings/SettingsModal.tsx` (above the `MasterResumeTab` function)
- [x] 1.2 In `MasterResumeTab`'s view overlay, replace the raw JSON `<pre>` block with `<ResumePreview content={master.content_json} />`

## 2. Update SidebarNewChat redirect

- [x] 2.1 In `SidebarNewChat.tsx`: import `useSettingsStore`, replace `router.push("/settings/master-resume")` with `useSettingsStore().open("master-resume")`

## 3. Remove standalone settings pages

- [x] 3.1 Delete `app/settings/profile/page.tsx`
- [x] 3.2 Delete `app/settings/providers/page.tsx`
- [x] 3.3 Delete `app/settings/master-resume/page.tsx`
- [x] 3.4 Delete `app/settings/account/page.tsx`
- [x] 3.5 Delete `app/settings/layout.tsx`

## 4. Verification

- [x] 4.1 Run `npx prettier --check` on modified files
- [x] 4.2 Verify no remaining imports/references to deleted pages
- [ ] 4.3 Manual test: open settings modal, verify all 4 tabs work
- [ ] 4.4 Manual test: master resume view shows structured preview
- [ ] 4.5 Manual test: new chat with no master resume opens modal
