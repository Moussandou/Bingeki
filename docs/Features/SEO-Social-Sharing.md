# Feature: SEO & Social Sharing 🌍

Bingeki V2 is designed to be highly shareable and search-engine friendly. We use a combination of server-side meta-tag injection and dynamic image generation to ensure every link shared on social media looks premium.

## Dynamic Open Graph Images

When a link (like a user profile or a news article) is shared, social platforms (Discord, Twitter/X, WhatsApp) look for `og:image` tags. Bingeki generates these images on the fly.

### 1. SVG-Based Cards
Our `seoHandler` Cloud Function can serve direct SVG binaries. This is extremely fast and ensures crisp text:
-   **Profiles**: Generates a "Hunter License" card including the user's level, XP, streak, and a custom "Nen Chart" (Radar Chart).
-   **News Articles**: Creates a stylized新闻 layout with the article's title, date, and source.
-   **Generic Pages**: A standard Bingeki-branded card for search, leaderboard, etc.

### 2. High-Fidelity Screenshots
For even better visual fidelity, we integrate with **Microlink**. On specific routes, the SEO handler uses a proxied Microlink URL to take a real screenshot of the page:
-   **Viewport**: 1200x630 (standard OG size).
-   **Wait**: 4 seconds delay to ensure all animations and data are loaded.
-   **Color Scheme**: Forced to `dark` for consistency.

## SEO Handler (Cloud Function)
Traditional React apps often struggle with SEO because crawlers see an empty root div. Bingeki solves this with a specialized function:
-   **Security**: The handler is hardened to prevent serving binary or static assets (`/assets/`, `/public/`, etc.). This ensures that the function only handles localized HTML requests and meta-tag injection.
-   **URL Parsing**: Detects the language (`/fr/`, `/en/`) and the target resource (profile, news article).
-   **Data Prefetching**: Fetches the relevant document from Firestore before the HTML is even sent to the user.
-   **Meta-Tag Injection**: Replaces placeholders in `index.html` with real data using Regex.
-   **Permissions-Policy**: Injects Headers for modern browser features like `browsing-topics` to comply with privacy regulations.
-   **Caching**: Responses are cached at the CDN level (`Cache-Control`) for 5-10 minutes to balance performance and freshness.

## Bot Optimization

We treat bots (crawlers) differently to ensure they see the best version of our app:
-   **IsBot Utility**: A simple utility detects bot user agents.
-   **Forced Theme**: Bots are always served the `dark` theme to ensure contrast and readability in screenshots.
-   **Bypass Animations**: To speed up crawling and screenshotting, bots skip intro animations and heavy UI transitions.

---
*Technical Note: See `functions/index.js` for the implementation and `src/components/layout/SEO.tsx` for client-side tag management.*
