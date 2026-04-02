# Feature: Library & API 📚

The heart of the application: managing your collection of Manga and Anime.

## Jikan API Integration
We use [Jikan](https://jikan.moe/), an unofficial MyAnimeList API, for all data.
- **Search**: `GET /anime?q=...`
- **Details**: `GET /anime/{id}/full`
- **Rate Limit**: Jikan has strict rate limits. We implement a local caching layer and a queue system (`src/utils/apiQueue.ts`) to handle 429 errors gracefully.

## Offline Mode
The library is fully accessible offline thanks to:
1.  **PWA Caching**: Assets and JS bundles are cached by the Service Worker.
2.  **Firestore Persistence**: `enableIndexedDbPersistence()` is called in `firebase/config.ts`. This caches the user's library and profile locally, syncing changes when connection is restored.

## Library Management
- **Status**: users can categorize works (Watching, Completed, Plan to Watch, etc.).
- **Progress**: Tracking exact chapter/episode counts.
- **Manual Entry**: For rare works not on MAL, users can manually create entries via the "Recruit Work" modal (Manual Tab).

## Image Optimization 🖼️
To provide a premium and fluid visual experience (Brutalist Manga style), the app uses a custom `OptimizedImage` component:
- **Proxying**: All external images are proxied through `wsrv.nl`. This improves availability (bypassing MAL rate limits/blocks) and allows for resizing/format conversion.
- **Lazy Loading**: Images are loaded only when they enter the viewport, except when the `priority` prop is used (e.g., Hero sections).
- **Fade-in Effect**: A smooth CSS transition is applied once the image is fully loaded, replacing the need for complex skeleton screens.
- **Failover**: Automatic fallback to a localized placeholder if the proxy or source fails.
