## Why

The current floating toolbar is a vertical sidebar (44px wide) pinned to the right side of the paper. It feels disconnected from the document — a separate UI element hovering beside the content rather than being part of it. The toolbar should live inside the paper surface, like a formatting bar in Google Docs or Notion, where it's visually anchored to the document it controls.

## What Changes

- **Toolbar layout shifts from vertical sidebar to horizontal bar** inside the paper, positioned at the top edge with inset margins
- **Glass inset bezel treatment**: semi-transparent background with `backdrop-filter: blur(12px)`, subtle border, soft shadow — blending into the paper surface rather than floating beside it
- **No visible border** on the bar itself — depth comes from transparency + shadow, not a hard edge
- **Toolbar is sticky inside the paper** — scrolls with the document but stays visible at the top when scrolling

## Capabilities

### New Capabilities

- `toolbar-bezel-glass`: Horizontal formatting bar with glass inset treatment, positioned inside the paper at the top with inset margins, sticky positioning within the document scroll container

### Modified Capabilities

- (none)

## Impact

- `frontend/app/components/document/FloatingToolbar.tsx` — rewrite layout from vertical sidebar to horizontal bar, apply glass inset styling
- `frontend/app/components/document/DocumentCanvas.tsx` — remove sticky sidebar slot, move toolbar rendering into the paper container
- No API or backend changes
