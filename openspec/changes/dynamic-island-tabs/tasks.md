## 1. Dynamic Island Component

- [x] 1.1 Rewrite `DocumentTabs.tsx` as a dynamic island pill component with dark background, rounded-full shape, and animated brass accent slider
- [x] 1.2 Add CSS for the dynamic island animations (pill slide transition, dark mode support) to `globals.css`

## 2. Layout Restructure

- [x] 2.1 Update `DocumentCanvas.tsx` to remove the `mt-4` gap between top bar and content
- [x] 2.2 Insert the dynamic island between `DocumentTopBar` and the content area with negative margin to float on the seam
- [x] 2.3 Add z-index layering so the island overlaps the toolbar edge cleanly

## 3. Top Bar Changes

- [x] 3.1 Remove the standalone Cover Letter button from `DocumentTopBar.tsx`
- [x] 3.2 Add conditional rendering for the Changes/Final toggle — hide (collapse to max-width: 0) when `activeDocType === "cover_letter"`
- [x] 3.3 Ensure Export button remains visible in both modes

## 4. Cover Letter Content

- [x] 4.1 Ensure `DocumentCanvas` renders cover letter content in the same paper container when `activeDocType === "cover_letter"`
- [x] 4.2 Verify `useSessionDocument` hook correctly fetches cover letter by document type

## 5. Verify

- [x] 5.1 Run frontend lint and typecheck
- [x] 5.2 Run frontend tests
