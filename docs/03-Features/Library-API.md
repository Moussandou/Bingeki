# Feature: Library & API 📚

The heart of the application: managing your collection of Manga and Anime.

## Jikan API Integration
We use [Jikan](https://jikan.moe/), an unofficial MyAnimeList API, for all data.
- **Search**: `GET /anime?q=...`
- **Details**: `GET /anime/{id}/full`
- **Rate Limit**: Jikan has strict rate limits. We implement a local caching layer and a queue system (`src/utils/apiQueue.ts`) to handle 429 errors gracefully.

### The Request Queue (`ApiQueue`)
To ensure high availability without triggering provider blocks, all Jikan calls are throttled:
1.  **Strict Throttling**: Requests are spaced by a **min interval of 800ms** (approx. 1.25 req/sec), providing a large safety margin over Jikan's 3 req/sec limit.
2.  **Smart Deduplication**: Any concurrent GET requests for the same URL are merged into a single "inflight" promise, preventing duplicate network calls during rapid navigation.
3.  **Adaptive Retry**: Upon receiving a `429 (Too Many Requests)`, the system reads the `Retry-After` header and automatically re-queues the request at the front of the line after the specified delay.
4.  **Timeouts**: Requests have a mandatory **10s timeout** and support standard `AbortController` signals to prevent zombie processes.


## Offline Mode
The library is fully accessible offline thanks to:
1.  **PWA Caching**: Assets and JS bundles are cached by the Service Worker.
2.  **Firestore Persistence**: `enableIndexedDbPersistence()` is called in `firebase/config.ts`. This caches the user's library and profile locally, syncing changes when connection is restored.

## Library Management
- **Status**: users can categorize works (Watching, Completed, Plan to Watch, etc.).
- **Progress**: Tracking exact chapter/episode counts.
- **Manual Entry**: For rare works not on MAL, users can manually create entries via the "Recruit Work" modal (Manual Tab).

## Image Optimization 🖼️

To provide a premium and fluid visual experience (Brutalist Manga style), the app uses a custom `OptimizedImage` component. This component manages the entire image lifecycle from discovery to rendering.

### 1. Progressive Loading & Visuals
- **Skeleton Shimmer**: While an image is being requested, a CSS-animated silver shimmer effect is shown to prevent layout shifts.
- **Blur-Up Effect**: If a `lowResSrc` is provided, a tiny, blurred version of the image is shown as soon as possible, providing immediate visual context.
- **Fade-in**: Images use a `0.5s` opacity transition once fully loaded for a polished feeling.

### 2. Intelligent Fetching
- **Lazy Loading**: Uses `IntersectionObserver` with a `400px` root margin. Images only begin downloading when they are about to enter the viewport.
- **Data Saver Mode**: Integrated with `useSettingsStore`. If enabled, the component will prioritize `lowResSrc` as the main source to save mobile data.
- **Priority Prop**: Essential images (like Hero banners or the current reading volume) bypass lazy loading for immediate display.

### 3. Technical Resilience
- **CORS Management**: Dynamically assigns `anonymous` credentials for whitelisted domains (Firebase, MyAnimeList, Dicebear) to ensure canvas compatibility and prevent security blocks.
- **Failover / Fallbacks**: If both the source and fallback fail, it automatically generates a unique SVG shape via [Dicebear](https://api.dicebear.com) to maintain the UI integrity.
- **Proxying**: Infrastructure is ready via `utils/imageProxy.ts`. Currently acts as a pass-through but can be configured to use `wsrv.nl` or similar services for dynamic resizing.

