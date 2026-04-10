# Core Hooks Reference 🧠

Hooks are the primary way Bingeki-V2 manages side effects, data orchestration, and platform-specific logic.

## 1. System & Platform Hooks

### `usePWAHandler`
Manages the Progressive Web App lifecycle.
- **Role**: Detects `beforeinstallprompt` event, manages the "Install" banner state, and tracks if the app is running in `standalone` mode.
- **Usage**:
  ```tsx
  const { isInstallable, installApp } = usePWAHandler();
  ```

### `useNotifications` / `usePushNotifications`
Handles the integration with browser Push APIs and Firebase Cloud Messaging (FCM).
- **Role**: Requests permissions, registers service worker tokens, and provides a centralized way to trigger UI-level toast notifications.

### `useHaptics`
Standardized tactile feedback.
- **Role**: Triggers vibration patterns on supporting mobile devices.
- **Patterns**: `light`, `medium`, `heavy`, `success`, `error`.

---

## 2. Data & Auth Hooks

### `useAuthSync`
The bridge between Firebase Auth and global state.
- **Role**: Listens for `onAuthStateChanged`, hydrates the `authStore`, and triggers profile fetching/synchronization from Firestore.

### `useWorkData`
Central data orchestrator for Anime/Manga details.
- **Role**: Combines data from Jikan API, local library state, and global cache. Handles loading states and error boundaries specifically for work details.

### `useThemeManager`
- **Role**: Injects the preferred theme variables into the `document.documentElement`, handles the switch to AMOLED mode, and enforces `reduced-motion` preferences via CSS class toggling.

---

## 3. Interaction Hooks

### `useMounted`
A simple utility to ensure code only runs on the client and after the initial mount, preventing hydration mismatch errors common in PWAs.

### `useShare`
- **Role**: Uses the native `navigator.share` API when available, falling back to "Copy to Clipboard" with a toast notification on desktop.
