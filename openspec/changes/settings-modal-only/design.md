## Context

The app has two settings surfaces: standalone pages at `/settings/*` (wrapped by a layout with left sidebar nav) and a modal (`SettingsModal.tsx`) triggered from the sidebar profile gear icon. The modal already has all 4 tabs (profile, providers, master resume, account) with functionally equivalent content. The only gap is the master resume view — the standalone page has a rich `ResumePreview` component while the modal dumps raw JSON.

The `SidebarNewChat` component navigates to `/settings/master-resume` when no master resume exists. This route will break after page removal.

## Goals / Non-Goals

**Goals:**
- Modal is the only settings surface
- Master resume view in modal matches standalone page quality (ResumePreview)
- No dead routes or broken redirects after removal
- All existing functionality preserved

**Non-Goals:**
- Changing modal layout or tab design
- Modifying any API endpoints
- Adding new settings features

## Decisions

### 1. Port ResumePreview into modal's view overlay

**Decision:** Move the `ResumePreview` component from `settings/master-resume/page.tsx` into `SettingsModal.tsx`. The modal's view overlay currently shows raw JSON in a `<pre>` block; replace it with the structured preview.

**Rationale:** The component is self-contained (takes `content: ResumeContent`, renders JSX). No external dependencies beyond Tailwind classes already in the modal.

### 2. Update SidebarNewChat to open modal instead of navigating

**Decision:** Replace `router.push("/settings/master-resume")` with `useSettingsStore().open("master-resume")` in `SidebarNewChat.tsx`.

**Rationale:** The settings store already exposes `open(tab)` which opens the modal to a specific tab. This is the established pattern (used by `DocumentEmptyState.tsx`).

### 3. Remove pages and layout atomically

**Decision:** Delete all 5 files (`page.tsx` for each route + `layout.tsx`) in one commit. No incremental removal.

**Rationale:** The layout is tightly coupled to the pages (renders nav sidebar with links to them). Removing pages without the layout would leave orphan nav links.

## Risks / Trade-offs

- **External links to `/settings/*` break** → Acceptable for a local/internal app. If needed, a catch-all redirect could be added later.
- **ResumePreview duplication** → Acceptable. It's a pure presentation component with no logic; keeping it in one place (the modal) is the goal.
