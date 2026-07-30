## Context

The resume canvas currently has a flat layout: `DocumentTopBar` → `mt-4` → `ResumeHeader` → sections. There is no visual partition between the toolbar and document content. Cover Letter generation is a one-shot action in the top bar that copies to clipboard — the user cannot view or edit the cover letter in the canvas.

The `DocumentTabs` component exists but is unused. The Zustand session store already supports `activeDocType: "resume" | "cover_letter"` and `setDocType()`.

## Goals / Non-Goals

**Goals:**
- Create a clear visual separation between the toolbar and document content
- Provide an intuitive way to switch between Resume and Cover Letter views
- Hide the Changes/Final view-mode toggle when Cover Letter is active (no diff support)
- Maintain the existing Export functionality in both modes

**Non-Goals:**
- Redesigning the entire top bar layout
- Adding diff view support for cover letters
- Changing the underlying document fetching or rendering logic

## Decisions

### 1. Dynamic Island Pill vs Inline Tabs

**Chosen:** Floating pill-shaped island centered between toolbar and content.

**Why:** The dynamic island approach creates a clear visual hierarchy — the toolbar belongs to the app chrome, the document belongs to the canvas, and the island sits between them as a document-level control. Inline tabs (like the current unused `DocumentTabs`) would feel flat against the toolbar.

**Alternative considered:** Simple horizontal tabs with border-bottom — rejected because it doesn't create the partition the user requested.

### 2. Partition Strategy

**Chosen:** Remove the `mt-4` gap between top bar and content. Let the island float in the gap with negative margin, creating a natural seam.

**Why:** A literal horizontal line behind the island was rejected by the user. The island itself becomes the partition — its dark pill shape creates enough visual separation.

### 3. View Mode Toggle Behavior

**Chosen:** CSS transition to collapse the Changes/Final toggle to `max-width: 0` when Cover Letter is active.

**Why:** Cover letters have no diff mode, so showing the toggle would be confusing. A smooth collapse animation feels polished rather than a jarring hide/show.

### 4. DocumentTabs Reuse vs New Component

**Chosen:** Rewrite `DocumentTabs.tsx` as the dynamic island component.

**Why:** The existing component is unused and has the right store integration (`activeDocType`, `setDocType`). Rewriting it avoids creating a new component while keeping the same contract.

## Risks / Trade-offs

- **Risk:** The `DocumentCanvas` layout restructure could shift the paper position on screen. → **Mitigation:** Test with existing content; the paper div keeps its padding/margin unchanged.
- **Risk:** Cover letter content may not render well in the same paper container as resume. → **Mitigation:** The paper container is generic; cover letter text uses the same typography.
- **Trade-off:** The negative margin on the island requires careful z-index management to avoid overlapping the toolbar. → Accepted; z-index is straightforward with `z-10` on the island container.
