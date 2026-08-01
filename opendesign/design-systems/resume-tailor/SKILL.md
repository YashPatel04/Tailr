# Tailr — Design System

A design system for the Tailr web application — a three-column desktop app that tailors LaTeX resumes to job descriptions using LLMs.

## Tokens
- `tokens/colors_and_type.css` — all color and typography custom properties

## Key characteristics
- **Temperature**: neutral-warm. Paper (#F1F2EE) and Ink (#171B22) have near-zero chroma. Brass (#B8863A) is the single accent.
- **Typography**: Newsreader (serif) for headings and editorial moments; Public Sans (sans-serif) for UI controls and body; JetBrains Mono for code and LaTeX source.
- **Layout**: Three-column desktop shell — collapsible sidebar, document canvas, chat rail.
- **Mode**: Light-first with full dark-mode support via `.dark` class on `<html>`.
- **Component philosophy**: One-off inline Tailwind. No reusable component library exposed; every page builds its UI from raw elements with shared utility classes.
- **Toast**: react-hot-toast, bottom-right, dark pill style.
- **Animations**: minimal. `transition-colors` on interactive elements, `diff-in` slide for patch diffs.
- **Radii**: rounded-lg (8px) for inputs/buttons, rounded-2xl (16px) for chat bubbles.
- **Borders**: `border-slate/20` (`rgba(91,100,114,0.2)`) used throughout — subtle enough to recede in both modes.
