# Feature: PWA & Mobile 📱

Bingeki is designed as a "Mobile-First" experience, installable on iOS and Android.

## Installation Flow
We use the `beforeinstallprompt` event to detect installability.

1.  **Detection**: `src/components/pwa/InstallPWA.tsx` listens for the event.
2.  **Promotional UI**:
    -   **Landing Page**: A dedicated section highlights the app.
    -   **Footer**: A discrete "APP MOBILE" button appears if installable.
3.  **Prompt**: Clicking the button triggers the native OS install dialog.

*Note: On iOS, the prompt is not supported. We show a manual instruction alert ("Tap Share > Add to Home Screen").*

## Mobile UX Optimizations
- **Touch Targets**: Minimized precision requirement for buttons.
- **Navigation**: Bottom tab bar (`Header.tsx` mobile nav) for thumb-friendly access.
- **Layout**: CSS Grid layouts switch to single-column stacks with `minmax(0, 1fr)` to prevent overflow.
- **Hiding Elements**: Desktop-first elements (large headers, complex tables) are hidden or simplified via `hidden-mobile` classes.

## Service Worker
Generated via `vite-plugin-pwa`.
- **Strategy**: Stale-While-Revalidate for most resources.
- **Precache**: Critical assets (HTML, CSS, JS) are downloaded on first load for instant subsequent startups.
