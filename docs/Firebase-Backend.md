# Firebase & Backend Architecture ☁️

Bingeki V2 is a "Serverless" application relying heavily on **Firebase** for its backend infrastructure.

## 1. Cloud Firestore (NoSQL Database)

We use Firestore as our primary database. It is structured into high-level collections with strictly defined security rules.

### Core Collections:
*   **`users/`**: Profile data, levels, XP, and settings.
    *   **`data/gamification`**: Persistent RPG stats (Nen chart, badges).
    *   **`data/library`**: User's manga/anime collection.
*   **`news/`**: Global articles and updates.
*   **`activities/`**: Public feed of user actions (Watch/Read/Level up).
*   **`watchparties/`**: Real-time synchronization data for shared sessions.

### Security Strategy (`firestore.rules`):
*   **Authentication**: Most read/write operations require an authenticated user.
*   **Ownership**: Users can only write to their own `/users/{userId}` sub-collections.
*   **Admin Role**: Users with the `isAdmin: true` flag in their document bypass common write restrictions for moderation.
*   **Server-Side Only**: Fields like `isAdmin`, `isBanned`, and `createdAt` are protected from client-side updates.

---

## 2. Cloud Functions & SEO Handler 🤖

The `seoHandler` is a critical Firebase Function that acts as a middleware between the user (or bot) and the application.

-   **Rewrites**: Configured in `firebase.json`, it intercepts requests to profiles, news articles, and common landing pages.
-   **Bot Detection**: Uses the `isBot` utility to detect crawlers (Google, Discord, Twitter).
-   **Dynamic Metadata**:
    1.  Fetches the target data (e.g., User Profile) from Firestore.
    2.  Injects specific `<meta>` tags (OpenGraph, Twitter Cards) into the HTML document.
    3.  Serves the modified HTML to the requester.
-   **Localized Entry Points**: Serves `index-en.html` or `index-fr.html` depending on the URL path.

---

## 3. Storage & Binary Assets

We use Firebase Storage for user-generated content and shared assets.

*   **Profiles**: `/users/{userId}/avatars/`
*   **Dynamic OG Images**: `/assets/og/` (generated via the SEO handler or manually).

---

## 4. Hosting & Domain Management

*   **Site ID**: `bingeki`
*   **Security Headers**: We implement strict Content-Security-Policy (CSP) and Permissions-Policy headers via `firebase.json` to ensure a premium, secure user experience.
*   **Asset Hashing**: Vite generates hashed filenames for assets, which are cached long-term, while `index.html` and `sw.js` are never cached (`no-cache`).

---

## 🛠️ Modifying the Backend

1.  **Rules**: Edit `firestore.rules` or `storage.rules`. ALWAYS run `npm test` after modifying rules to ensure no regressions.
2.  **Functions**: Source code is in the `functions/` directory. Deploy using `firebase deploy --only functions`.
3.  **Indexes**: Required for complex queries (e.g., sorting by XP across all users). Defined in `firestore.indexes.json`.
