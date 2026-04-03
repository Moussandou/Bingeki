# Design System: Brutalist Manga 🎨

Bingeki V2 adopts a **"Brutalist Manga"** aesthetic. This style combines the raw, bold nature of brutalism with the dynamic, high-energy visual language of shonen manga.

## Core Principles

1.  **Boldness**: Thick borders, high contrast, and uppercase typography.
2.  **Clarity**: UI elements are distinct and separated by clear lines.
3.  **Dynamism**: "Speed lines", sharp angles, and hover effects that feel tactile.

## Design Tokens (`tokens.css`)

### Typography
- **Heading**: `var(--font-heading)` (Outfit) - Used for titles and impact text.
- **Body**: `var(--font-body)` (Inter) - Used for long-form content.

### Spacing
Use the standard spacing scale for consistency:
`--space-xs` (0.25rem), `--space-sm` (0.5rem), `--space-md` (1rem), `--space-lg` (1.5rem), `--space-xl` (2rem).

### Animation Timing
- **Fast**: `var(--duration-fast)` (0.2s) - Hover effects, toggles.
- **Normal**: `var(--duration-normal)` (0.4s) - Page transitions, modal openings.
- **Easing**: `var(--ease-expo)` for premium feel, `var(--ease-elastic)` for playful elements.

## Motion & Animations (`animations.css`)

Bingeki makes heavy use of **Framer Motion** and CSS Keyframes.

### CSS Animation Classes
- `.animate-float`: Subtle floating effect for icons or badges.
- `.animate-pulse`: Pulsing glow effect (used for primary actions).
- `.animate-glitch`: High-energy glitch effect (hover only).
- `.holo-badge`: Holographic shine effect for rare rewards.

### Framer Motion Guidelines
When creating new components, prefer these standard variants:

```tsx
const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] }
};
```

## Utility Classes (`global.css` & `manga-theme.css`)

### Manga Patterns
- `.manga-halftone`: Adds a theme-aware dot pattern background.
- `.manga-speedlines`: Adds a radial "speed line" background for emphasis.
- `.text-outline`: Black outline around text for better readability on busy backgrounds.
- `.manga-title`: Inverted text style (white on black/red) with a subtle `-1deg` rotation.

### Other Utilities
- `.text-gradient`: Applies the primary brand gradient to text.
- `.scrollbar-hide`: Hides the scrollbar while maintaining scroll functionality.
- `.glass-panel`: Soft translucent background (use sparingly, prefer solid panels).

## Component Recipes

### 1. The Standard Manga Panel
All major cards should follow this pattern:
```html
<div class="manga-panel" data-hoverable="true">
  <h3>Impactful Title</h3>
  <p>Content goes here...</p>
</div>
```
*   **Requirements**: Heavy 4px border, sharp corners, solid black shadow (`6px 6px 0px var(--color-shadow-solid)`).

### 2. High-Impact Title
```html
<h2 class="manga-title">QUEST COMPLETED</h2>
```

## Responsive Layouts
- **Desktop**: 12-column grid or flexible flex containers.
- **Mobile**: Use `.mobile-stack` to convert grids to single columns. Ensure hit targets are at least `44px`.
