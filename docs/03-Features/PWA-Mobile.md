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

## Image-cache maintenance

Settings removes the Cache Storage buckets `mal-images`,
`dicebear-avatars` and `firebase-images`, as configured in `vite.config.ts`.
It does not delete the application shell, authentication, preferences, or
library data. Browser-managed HTTP cache cannot be cleared by JavaScript.
Unsupported Cache Storage and failed deletions produce an error, not a
simulated success.

## Push delivery

Push notifications are explicitly unavailable. Settings displays that state
instead of an enabled switch, and `usePushNotifications` never requests
permission, registers a worker or returns a pretend token.
In-app Firestore notifications remain available.

Re-enabling push requires a real VAPID public key, a correctly configured
messaging worker and a private token lifecycle (register, refresh, revoke on
sign-out/account deletion), together with supported-browser checks.
Do not enable only the permission prompt or ship placeholder keys.
