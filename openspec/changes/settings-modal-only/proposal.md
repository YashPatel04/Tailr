## Why

The app maintains duplicate settings UI — standalone pages at `/settings/*` with a full-page layout AND a modal with the same 4 tabs. This creates maintenance overhead (two copies of profile, providers, account logic) and inconsistency (the modal's master resume view is less capable than the standalone page's). Consolidating to modal-only simplifies the codebase and gives users a faster, non-disruptive settings experience.

## What Changes

- **BREAKING** Remove standalone settings pages: `/settings/profile`, `/settings/providers`, `/settings/master-resume`, `/settings/account`
- **BREAKING** Remove settings layout (`app/settings/layout.tsx`) and its left sidebar navigation
- Port `ResumePreview` component from standalone master resume page into the settings modal's master resume view overlay
- Update `SidebarNewChat.tsx` to open the settings modal (master-resume tab) instead of navigating to `/settings/master-resume` when no master resume exists

## Capabilities

### New Capabilities

- `modal-settings-experience`: Settings modal is the sole settings surface, with all 4 tabs (profile, providers, master resume, account) at full feature parity including rich master resume preview

### Modified Capabilities

<!-- No existing specs to modify -->

## Impact

- **Removed files**: `app/settings/profile/page.tsx`, `app/settings/providers/page.tsx`, `app/settings/master-resume/page.tsx`, `app/settings/account/page.tsx`, `app/settings/layout.tsx`
- **Modified files**: `app/components/settings/SettingsModal.tsx` (port ResumePreview), `app/components/sidebar/SidebarNewChat.tsx` (change redirect to modal open)
- **No API changes**: All endpoints remain the same
- **No routing changes**: `/settings/*` routes simply stop existing; the modal is opened via Zustand store
