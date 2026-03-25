# Design System: Brutalist Manga 🎨

Bingeki V2 adopts a **"Brutalist Manga"** aesthetic. This style combines the raw, bold nature of brutalism with the dynamic, high-energy visual language of shonen manga.

## Core Principles

1.  **Boldness**: Thick borders, high contrast, and uppercase typography.
2.  **Clarity**: UI elements are distinct and separated by clear lines.
3.  **Dynamism**: "Speed lines", sharp angles, and hover effects that feel tactile.

## Design Tokens

All colors are defined as CSS variables in `src/styles/theme.css` to support seamless Dark/Light mode switching.

### Colors
| Variable | Usage | Dark Mode (Default) |
| :--- | :--- | :--- |
| `--color-background` | App background | `#000000` |
| `--color-surface` | Card/Modal backgrounds | `#111111` |
| `--color-primary` | Main accent (Bingeki Red) | `#ff3e3e` |
| `--color-text` | Primary text | `#ffffff` |
| `--color-border-heavy` | Thick borders (4px) | `#444444` |
| `--color-shadow-solid` | Absolute pure black shadows | `#000000` |

### Typography
- **Headings**: `var(--font-heading)` (Impactful, bold sans-serif)
- **Body**: `system-ui` (Readable sans-serif)

## Components Guide

### Buttons
- **Primary**: Solid background (`--color-primary`), uppercase, sharp corners.
- **Ghost**: Transparent background, thick border (`--color-border`).

### Cards & Modals (`.manga-panel`)
- **Unified Style**: All major components should use the `.manga-panel` class for consistency.
- **No Glassmorphism**: We avoid blur effects in favor of solid, opaque backgrounds.
- **Borders**: Heavy 4px solid borders (`var(--manga-panel-border)`) with sharp 0px border-radius.
- **Shadows**: No soft drop shadows. Absolute hard solid black shadows (`box-shadow: 6px 6px 0 var(--color-shadow-solid)`) are required for depth to convey the "Brutalist Manga" aesthetic.

### Mobile First
- **Hit Areas**: All interactive elements are at least 44x44px.
- **Layout**: Stacks vertically on mobile, expands to grid on desktop.
- **Navigation**: Bottom bar for core mobile actions, Top bar for desktop.
