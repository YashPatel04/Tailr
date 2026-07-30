## Why

The resume canvas has no visual separation between the top toolbar and the document content, making the UI feel flat and cluttered. The existing Cover Letter button is a one-shot action that copies to clipboard — there's no way to view/edit the cover letter in the canvas. Users need a clear way to switch between Resume and Cover Letter views within the same session.

## What Changes

- Add a floating dynamic island bezel between the top bar and document content for switching between Resume and Cover Letter
- Remove the standalone Cover Letter button from the top bar (replaced by the bezel)
- Conditionally show the Changes/Final view-mode toggle only when viewing Resume (Cover Letter has no diff mode)
- Export button remains visible in both modes
- The island uses a dark pill with brass accent slider, centered between the toolbar and content

## Capabilities

### New Capabilities
- `dynamic-island-bezel`: Floating pill-shaped tab bar for switching between Resume and Cover Letter document views, with animated slider indicator

### Modified Capabilities
- `document-topbar`: Changes/Final toggle conditionally hidden when Cover Letter is active; standalone Cover Letter button removed

## Impact

- `frontend/app/components/document/DocumentCanvas.tsx` — layout restructuring, integrate DocumentTabs as dynamic island
- `frontend/app/components/document/DocumentTopBar.tsx` — remove Cover Letter button, add conditional view-mode toggle
- `frontend/app/components/document/DocumentTabs.tsx` — restyle as dynamic island pill (currently unused, needs redesign)
- `frontend/app/globals.css` — new CSS for dynamic island animations and transitions
