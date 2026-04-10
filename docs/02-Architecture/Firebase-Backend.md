# Firebase Backend Documentation

This document outlines the Firebase-powered backend architectural patterns, data models, and server-side logic used in Bingeki.

## Firestore Data Architecture

Bingeki follows a hybrid structure of root collections for global features and user-centric subcollections for private data.

### 1. User Documents (`/users/{userId}`)
The root of all user data. Contains essential profile information synced for social features and leaderboards.

| Field | Type | Description |
| :--- | :--- | :--- |
| `uid` | string | Unique identifier from Firebase Auth |
| `displayName` | string | User-chosen name |
| `xp` | number | Current level progress |
| `level` | number | Current user level |
| `totalXp` | number | Cumulative XP (used for ranking) |
| `badges` | array | List of earned badge objects |

#### User Data Subcollections
*   **`/data/library`**: Stores the user's manga/anime list (`works` array).
*   **`/data/gamification`**: Stores detailed progress, streaks, and bonus XP history.
*   **`/friends`**: Stores friendship status and friend profile snapshots (managed by Cloud Functions).

### 2. Global Collections
*   **`/news`**: Manga/Anime news articles.
*   **`/activities`**: Global/Friend activity feed (Read-only for clients).
*   **`/comments`**: User comments on news or works.
*   **`/challenges`**: Global events and community goals.

---

## Security Rules (`firestore.rules`)

Security is built on a "Closed by Default" principle.

### Key Security Patterns
1.  **Ownership Check**: `request.auth.uid == userId` ensures users can only write to their own data.
2.  **Field Protection**: Prevent users from manually promoting themselves to Admin by blocking updates to the `isAdmin` field in `/users/{userId}`.
3.  **Server-Only Writes**: The `/activities` and `/friends` collections are locked for clients (`allow write: if false`). These are managed exclusively via Admin SDK in Cloud Functions.

```javascript
// Example: Blocking specific field updates
allow update: if isOwner(userId) && 
              !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin', 'isBanned']);
```

---

## Cloud Functions (`functions/index.js`)

Bingeki leverages Firebase Functions (v2) for specialized tasks that require elevated privileges or server-side rendering.

### 1. SEO & Dynamic OG Images (`seoHandler`)
A production-grade Express app running as a Function to provide:
*   **Dynamic Meta Tags**: Injects `<meta>` tags based on the requested route (Profile, News, etc.).
*   **OG-Image Generation**: Returns on-the-fly generated SVGs (Hunter License style) for social sharing.
*   **Localization**: Serves localized versions of `index.html` based on URL prefix (`/en` or `/fr`).

### 2. Gamification Engine (`onLibraryUpdate`)
A Firestore trigger that automatically synchronizes data when a user's library changes.
*   **Automatic XP**: Calculates XP based on chapters read/watched.
*   **Badge Detection**: Automatically unlocks badges (e.g., "Otaku" for 25 works).
*   **Anti-Cheat**: Implements server-side hard caps for XP to prevent manual data injection.
*   **Activity Logging**: Automatically logs "Read", "Watched", or "Completed" events to the global feed.

### 3. Social Logic (`sendFriendRequestFn`, etc.)
Dedicated `onCall` functions for managing friendships.
*   Ensures mutual acceptance before displaying users as friends.
*   Maintains data integrity by updating both users' friend subcollections atomically.

---

## Service Layer (`src/firebase/firestore.ts`)

The frontend interacts with Firestore through a clean service layer.

### Pattern: Safe Data Merging
To prevent accidental data loss during multi-device sync, we use a `mergeLibraryData` utility before saving to Firestore.

```typescript
export async function saveLibraryToFirestore(userIdStr, works, folders) {
    const docRef = doc(db, 'users', userIdStr, 'data', 'library');
    const existing = (await getDoc(docRef)).data();
    
    // Create backup before merge
    logDataBackup(userIdStr, 'library', existing);
    
    const mergedWorks = mergeLibraryData(works, existing?.works);
    await setDoc(docRef, { works: mergedWorks, ... }, { merge: true });
}
```

### Key Service Methods
*   `saveUserProfileToFirestore`: Keeps Auth Profile and Firestore Profile in sync.
*   `loadFullLibraryData`: Loads works, folders, and sharing settings.
*   `getFilteredLeaderboard`: Fetches the top hunters based on XP or Chapters.
