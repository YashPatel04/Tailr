## Context

The resume builder canvas currently uses a vertical floating toolbar (44px wide) positioned as a sticky sidebar to the right of the paper. This layout was inherited from Google Docs' approach, but the app's paper-centric design makes the sidebar feel detached — it floats in the canvas gap rather than being part of the document.

Variant C from the toolbar-bezel mockup proposes a glass inset bar: a horizontal toolbar embedded inside the paper at the top edge, with semi-transparent background and backdrop blur.

## Goals / Non-Goals

**Goals:**
- Move the toolbar from vertical sidebar to horizontal bar inside the paper
- Apply glass inset bezel treatment (blur + transparency + shadow)
- Keep toolbar sticky within the paper scroll context
- Maintain all existing formatting actions (Insert, Bold, Italic, Underline, Link, Undo, Redo)

**Non-Goals:**
- Changing toolbar button behavior or formatting logic
- Modifying the DocumentTopBar or DocumentTabs
- Adding new toolbar actions
- Responsive/mobile layout changes (out of scope)

## Decisions

### D1: Horizontal layout inside paper, not overlay

**Decision**: The toolbar sits as the first child inside the `.paper` card, with inset margins (`margin: 12px 12px 0`), pushing content below it.

**Rationale**: Overlay approaches (floating on top of content) risk covering text and creating z-index battles. An inset bar is part of the paper surface — it doesn't obscure content, it's always visible, and it feels native to the document.

### D2: Glass inset styling

**Decision**: Use `backdrop-filter: blur(12px)` with semi-transparent background `rgba(247,247,248,0.85)` in light mode and `rgba(43,44,54,0.8)` in dark mode. No hard border — depth from `box-shadow: 0 1px 4px rgba(0,0,0,0.04)` and a subtle 1px border at `rgba(229,229,229,0.6)`.

**Rationale**: The glass treatment makes the bar feel like it belongs to the paper surface. It's not a separate UI element — it's a translucent layer on the document.

### D3: Remove sticky sidebar from DocumentCanvas

**Decision**: Remove the `sticky top-20 self-start` sidebar container from DocumentCanvas. The toolbar now lives inside the paper, which is inside the scroll container. No separate sticky positioning needed — the toolbar scrolls with the paper and stays at the top of the paper naturally.

**Rationale**: The sidebar slot in DocumentCanvas is no longer needed. The toolbar is part of the paper, not a sibling element.

## Risks / Trade-offs

- **[Backdrop filter support]** → `backdrop-filter` is not supported in all browsers (notably Firefox had delays). Mitigation: graceful fallback to semi-transparent solid background without blur.
- **[Toolbar width on narrow papers]** → If the paper is narrow, the horizontal toolbar may feel cramped. Mitigation: the toolbar uses flex with `gap: 2px` and 32px buttons, so it fits within the 820px paper width easily.
- **[Insert dropdown positioning]** → The Insert dropdown currently opens to the right (side-bar orientation). In horizontal layout, it should open downward. This is a natural change since the button is now horizontal.
