# Bingeki V2: Design System — Brutalist Manga 🎨

Bingeki V2 adopts a **"Brutalist Manga"** aesthetic—a high-energy visual language that merges the raw, unpolished nature of web brutalism with the dynamic storytelling elements of shonen manga. This system is designed for **impact, clarity, and tactile responsiveness**.

This document serves as both a high-level visual guide and a surgical-level technical API reference for developers maintaining the core UI primitives.

---

## 1. Core Philosophy

The design system is built on three pillars:

1.  **High Contrast & Bold Borders**: Everything is bounded by heavy lines (minimum 4px). This creates a "comic book" feel where elements are distinct and "drawn" onto the canvas.
2.  **Kinetic Energy**: Usage of "speed lines," halftones, and sharp angles to suggest movement and urgency, mirroring the pace of an action manga.
3.  **Modern Brutalism**: While the foundations are raw, we integrate modern techniques like **glassmorphism**, **holographic gradients**, and **smooth Expo easings** to ensure a premium user experience.

---

## 2. Style Architecture

Styling is modularized across four core CSS files located in `src/styles/`:

| File | Responsibility |
| :--- | :--- |
| `tokens.css` | Raw design tokens (colors, spacing, typography, effects). |
| `animations.css` | All `@keyframes`, easing functions, and transition utilities. |
| `manga-theme.css` | Domain-specific manga effects (Panels, Halftones, Speedlines). |
| `global.css` | Reset, high-level responsive logic, and common utility classes. |

---

## 3. Design Tokens

### 3.1 Color Palette
Bingeki supports three distinct themes. All colors are defined as CSS variables in `tokens.css`.

| Token | Light Theme | Dark Theme | AMOLED (True Black) |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#FF2E63` (Hot Pink) | `#FF2E63` | `#FF2E63` |
| `--color-secondary` | `#08D9D6` (Cyan) | `#08D9D6` | `#08D9D6` |
| `--color-background` | `#F5F5F5` (Off-white) | `#121212` | `#000000` |
| `--color-surface` | `#FFFFFF` | `#1E1E1E` | `#0A0A0A` |
| `--color-text` | `#1A1A1A` | `#E0E0E0` | `#FFFFFF` |
| `--color-border-heavy`| `#000000` | `#444444` | `#333333` |
| `--color-shadow-solid`| `#000000` | `#000000` | `#000000` |

> [!TIP]
> **Accessibility**: Ensure a minimum contrast ratio of 4.5:1 for body text and 3:1 for large text/UI elements. The Red/Cyan pairing is optimized for accessibility while maintaining high energy.

### 3.2 Typography
We utilize Google Fonts for a distinct hierarchy.

-   **Headings**: `Outfit` (700+ Bold). Used for impact, uppercase text, and primary call-to-actions.
-   **Body**: `Inter` (400 Regular, 700 Bold). Used for legibility in descriptions, lists, and metadata.

#### Type Scale:
- **Display**: `3rem` (48px) | Bold | Uppercase | Letter-spacing: `-0.02em`
- **Heading 1**: `2.25rem` (36px) | Bold
- **Heading 2**: `1.5rem` (24px) | Bold
- **Body Large**: `1.125rem` (18px) | Regular
- **Body**: `1rem` (16px) | Regular
- **Caption**: `0.875rem` (14px) | Bold / Uppercase

### 3.3 Spacing & Borders
The system is built on a **4px base grid**.
- **Unit Scale**: `4px` (xs), `8px` (sm), `16px` (md), `24px` (lg), `32px` (xl).
- **Global Border Width**: `4px` (used for `.manga-panel`).
- **Corner Radius**: `0px` (Sharp angles are mandatory for the brutalist aesthetic).

### 3.4 Iconography
We strictly avoid heavy image-based icons. All branding and social icons are implemented as **Pure SVG Components**.
- **Source**: `src/components/ui/BrandIcons.tsx`
- **Behavior**: Icons accept `size` and `color` props. They default to `currentColor` to automatically inherit the text color of their parent container.
- **Available Icons**: Discord, TikTok, Github, Linkedin, Instagram, Youtube, Chrome.


---

## 4. Signature Components (Visuals)

### 4.1 The "Manga Panel" (`.manga-panel`)
The foundational container of the application.
- **Specification**: `border: 4px solid var(--color-border-heavy)`.
- **Shadow**: `box-shadow: 6px 6px 0px var(--color-shadow-solid)`.
- **Interaction**: On hover, the panel uses an **Expo shift**:
  - `transform: translate(-2px, -2px)`
  - `box-shadow: 8px 8px 0px var(--color-primary)`

### 4.2 Manga Title (`.manga-title`)
An ultra-bold title element typically used for Section headers.
- **Style**: Black background with inverse text color.
- **Geometry**: Rotated by `-1deg` to create a "pasted on" feeling typical of manga sound effects.

### 4.3 Glass Brutalism (`.manga-panel-glass`)
A hybrid component merging brutalist borders with modern glassmorphism.
- **Backdrop**: `blur(12px)`.
- **Opacity**: `0.8` (Theme aware).
- **Usage**: Used for floating overlays, navigation bars, and modals to maintain depth without losing the manga aesthetic.

---

## 5. Visual Effects & Patterns

### 5.1 Halftone Patterns (`.manga-halftone`)
Inspired by Ben-Day dots used in comic printing.
- **Logic**: A radial gradient grid (`20px x 20px`) with variable opacity (`0.05` to `0.1`).
- **Placement**: Used as a subtle layer behind page content or within specific panels to add texture.

### 5.2 Speed Lines (`.manga-speedlines`)
Used for high-intensity sections or backgrounds.
- **Logic**: A repeating conic gradient at high frequency.
- **Usage**: Use sparingly at low opacity (`0.05`) to prevent visual fatigue.

### 5.3 Holographic Badges (`.holo-badge`)
Used for ultra-rare rewards (Legendary status).
- **Effect**: An animated linear gradient `backround-position` shift across a spectral palette.
- **Animation**: `holoShine` (3s duration, linear, infinite).

### 5.4 Special Transitions
- **Page Transitions**: Framer Motion `variants` are defined to stagger entry for all `.manga-panel` elements, ensuring a "reading" flow from top to bottom.
- **Micro-interactions**: Every `<Button>` triggers a `haptic('light')` call and a subtle `0.95` scale down to provide tactile confirmation.


---

## 6. Motion & Interaction

### 6.1 Easings & Durations
Transitions should feel snappy and instantaneous, not sluggish.
- **Normal Duration**: `0.4s` (`--duration-normal`).
- **Fast Duration**: `0.2s` (`--duration-fast`).
- **Primary Easing**: `cubic-bezier(0.19, 1, 0.22, 1)` (Expo Out) for a premium, damped-spring feel.

### 6.2 Kinetic Effects
- **Pulse Glow**: Used for active notifications or primary buttons (`box-shadow` animation).
- **Glitch**: Used on hover for action-oriented elements (`@keyframes glitch`).
- **Float**: Used for floating assets (mascots, decorative elements) to bring the page to life.

---

## 7. UI Primitive API Reference (React)

### 7.1 Card Component (`<Card />`)
Low-level container for all layout pieces.

- **Status**: ✅ Production Ready
- **Path**: `src/components/ui/Card.tsx`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'default' \| 'glass' \| 'manga'` | `'default'` | Determines the border/background logic. |
| `hoverable` | `boolean` | `false` | Enables lift-off or shadow expansion on hover. |

### 7.2 Button Component (`<Button />`)
Primary action trigger with integrated haptics.

- **Path**: `src/components/ui/Button.tsx`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'manga'` | `'primary'` | Visual style architecture. |
| `size` | `'sm' \| 'md' \| 'lg' \| 'icon'` | `'md'` | Padding and font-size scale. |
| `isLoading` | `boolean` | `false` | Replaces content with a theme-aware spinner. |
| `icon` | `ReactNode` | - | Prepends an icon before the children. |

**Logic**: Triggers `haptic('light')` on every click via `useHaptics` hook.

### 7.3 Input Component (`<Input />`)
Form primitive with focus and error states.

| State | CSS Rule | Visual Feedback |
| :--- | :--- | :--- |
| **Normal** | `.input` | 1px glass border, `--color-surface` bg. |
| **Focus** | `.input:focus` | 2px `--color-primary-glow` shadow, surface hover bg. |
| **Error** | `.error` | `#ff3333` border color. |

### 7.4 Optimized Image (`<OptimizedImage />`)
The core engine for all visual media. It follows a multi-stage loading pipeline to ensure 0ms perceived lag.

- **Path**: `src/components/ui/OptimizedImage.tsx`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `src` | `string` | - | The primary high-resolution image URL. |
| `lowResSrc` | `string` | - | Used for the blur-up effect or Data Saver mode. |
| `priority` | `boolean` | `false`| Bypasses lazy loading. Use for Hero assets. |
| `showSkeleton`| `boolean` | `true` | Toggles the Shimmer animation during fetch. |
| `objectFit` | `string` | `'cover'`| CSS object-fit property applied to the image. |
| `fill` | `boolean` | `false`| Sets the image to `position: absolute` inset 0. |

**Loading Lifecycle**:
1. **Shimmer**: (`.shimmer`) A silver gradient animation.
2. **Blur-Up**: (`.placeholder`) If `lowResSrc` is present, it's displayed with a `10px` blur.
3. **Loaded**: (`.imageLoaded`) The final image fades in with a `0.5s` ease-in-out transition.

### 7.5 Carousel (`<Carousel />`)
A high-energy scrollable container for dense media lists.
- **Snap Logic**: `x mandatory` CSS scroll-snapping ensures a card always centers on finish.
- **Props**:
    - `items`: Array of Jikan results.
    - `showRank`: Adds an absolute-positioned `#1`, `#2` badge with theme colors.
    - `priority`: First 4 images are set to `priority` for the `OptimizedImage` engine.

### 7.6 Modal (`<Modal />`)
The standard overlay primitive.
- **Blur**: Applies `backdrop-filter: blur(8px)` to the background.
- **Manga Border**: Uses `4px` black borders and unique corner angles.
- **Z-Index**: `100` (Overlay Layer).

### 7.7 Error Boundary (`<ErrorBoundary />`)
Prevents application-wide crashes. 
- **Visuals**: Displays the `MaintenanceScreen` UI with a "Repair System" button that clears the problematic store part and reloads.



---

## 8. Responsive Logic & Mobile Interface Matrix

The application uses three primary breakpoints to ensure the manga aesthetic scales correctly.

| Component | Desktop (>1024px) | Tablet (768px - 1023px) | Mobile (<767px) |
| :--- | :--- | :--- | :--- |
| `.container` | `max-width: 1200px` | `padding: 0 1rem` | `padding: 0 0.75rem` |
| `h1` size | Browser Default | `1.75rem` | `1.5rem` |
| `.manga-panel` | `padding: var(--space-md)` | `padding: var(--space-md)` | `padding: 1rem` |
| Navigation | Grid/Flex row | Persistent sidebar/Flex | Bottom Sheet / Bottom Navbar |

### 8.1 Mobile Interface Architecture (Web Responsive)
The web mobile layout deviates from standard desktop web patterns to mimic a native app flow, focusing heavily on thumb accessibility.

#### 1. Bottom Dock Navbar (`.mobileNav`)
- **Placement**: Fixed to the bottom of the screen.
- **Content**: Strictly limited to core daily routes (Dashboard, Discover, Library).
- **Styling**: Uses `<Button variant="icon">` with a `12px` border radius to act as soft anchors against the brutalist panels. The active route is highlighted via `variant="primary"`.
- **Z-Index**: `Sticky UI` layer.

#### 2. Floating Action Button Menu (`<MobileMenuFAB />`)
- **Purpose**: Replaces the desktop "More" dropdown and Profile menu, consolidating secondary actions into a single thumb-reachable component.
- **Placement**: Bottom-right floating position, sitting just above the Bottom Dock Navbar.
- **Animation**: Uses Framer Motion for a spring-damped icon rotation (Menu <-> X) and staggering child menu items.
- **State Logic**: Opening the FAB locks the `document.body` scroll (`overflow: hidden`) to prevent background scrolling while the user interacts with the expanding list of `<Link>` cards.

**Mobile Utilities**:
- `.hidden-mobile`: Removes element below 768px.
- `.desktopOnly`: Fully unmounts/hides elements intended purely for desktop (e.g., Streak counters).
- `.mobile-stack`: Forces `grid-template-columns: 1fr` on mobile grids.

---

## 9. System Guidelines

### 9.1 Layering (z-index) Hierarchy
To avoid z-index wars, follow this standardized scale:

| Level | z-index | Usage |
| :--- | :--- | :--- |
| **Background** | `-1` | `.manga-bg-container`, `.manga-halftone`. |
| **Base** | `1` | All standard page content and cards. |
| **Sticky UI** | `10` | Navigation bars, floating action buttons (FAB). |
| **Overlays** | `100` | Modals, context menus, and tooltips. |
| **System** | `999` | Critical alerts, loading screens, maintenance pages. |

### 9.2 Performance & Bot Context
The design system is **context-aware** regarding SEO crawlers and speed analysis robots:
- **Bot Detection**: When `body.is-bot` is present, `* { animation: none !important; transition: none !important; }` is applied. This ensures page-speed tools and bots see the final, stable UI immediately without waiting for CSS transitions.
- **Scrollbar**: Custom styled using `-webkit-scrollbar` pseudo-elements to match the theme colors (`--color-primary` on hover).

### 9.3 Accessibility (A11y) Standards
1.  **Motion Control**: Always use `initial={false}` in Framer Motion for non-critical layout changes to prevent "flash of unstyled animation" on first load.
2.  **Focus States**: All interactive elements MUST have a visible `:focus` state. Default: `outline: none` but replaced by `box-shadow` or `border-color` matching `--color-primary`.
3.  **Spoilers**: The `.spoiler-blur` utility (5px blur) must be accessible via click/hover to reveal content safely.

---

## 10. React Native Mobile App Equlivalents
For consistency with the Web version, the `Bingeki-Mobile` App codebase follows these aligned rules:
- **SafeArea**: Systematically respect safe areas (notches).
- **Haptics**: Heavy use of `useHaptics` and native vibrator feedback on brutalist actions (button presses, list sorting, menu FABs).
- **Bottom Sheets**: Replace web modals with native bottom sheets for better touch ergonomics.
- **FlashList**: Use to ensure 60 FPS brutalist scrolling for dense anime lists.

> [!CAUTION]
> **Implementation Warning**: Never use hardcoded colors in CSS modules. Always use the CSS variables from `tokens.css` to ensure full theme compatibility across Light, Dark, and AMOLED modes.
