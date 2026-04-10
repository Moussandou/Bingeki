# Synchronization & Offline Design

Bingeki is designed as an "Offline-First" application. This document explains how we handle data persistence, cloud synchronization, and conflict resolution between multiple devices.

## Overview

The sync engine follows a **Local-First, Cloud-Synced** pattern:
1.  **Direct Read/Write**: The UI always interacts with the local Zustand store.
2.  **Immediate Persistence**: Zustand middleware automatically mirrors the store to `localStorage`.
3.  **Debounced Cloud Sync**: Changes in the local store trigger a debounced (3s) write to Firestore.
4.  **Smart Merge on Login**: When a user logs in, local data is merged with cloud data instead of being overwritten.

---

## Technical Stack

*   **State Management**: Zustand
*   **Local Persistence**: `zustand/middleware/persist` (Target: `localStorage`)
*   **Cloud Provider**: Firebase Firestore
*   **Conflict Resolution**: Custom logic in `src/utils/dataProtection.ts`

---

## 1. Local Storage Strategy
We use `localStorage` to ensure the app is usable instantly even without an internet connection.

*   **Key Names**: 
    *   `bingeki-library-storage`: Main manga/anime list.
    *   `bingeki-gamification-storage`: XP, level, and stats.
    *   `bingeki-settings`: UI preferences and language.
*   **Reliability**: Since we use the `persist` middleware, data survives page refreshes and browser restarts.

---

## 2. Firestore Sync Lifecycle

The sync process is managed primarily in `src/App.tsx`.

### A. Initialization (Auth Change)
When the Auth state changes to "Logged In":
1.  **Retrieve Local**: Get the current contents of `localStorage`.
2.  **Fetch Cloud**: Pull the latest data from the user's Firestore document.
3.  **Merge**: Run `mergeLibraryData` to resolve differences.
4.  **Hydrate Store**: Update the Zustand store with the merged result.

### B. Reactive Saving (Auto-Save)
Whenever the user modifies their library (e.g., adding a manga, updating a chapter):
1.  The Zustand store updates immediately (UI is fast).
2.  A `useEffect` hook in `App.tsx` detects the change.
3.  A **3-second debounce timer** starts.
4.  If no further changes occur within 3 seconds, `saveLibraryToFirestore()` is called. 
    > [!NOTE]
    > The debounce is critical to avoid hitting Firestore rate limits during rapid progress updates (e.g., clicking "+" multiple times).

---

## 3. Conflict Resolution Logic

To prevent data loss (e.g., using the app on a phone and a tablet simultaneously), we use a **Last-Update-Wins (Field Level)** and **Combined-Sets (Array Level)** strategy.

### Library Merging (`mergeLibraryData`)
*   **Unique Items**: Works are tracked by a unique `id` (MAL/AniList ID).
*   **Array Union**: If a work exists in Cloud but not Local, it is added.
*   **Timestamp Check**: If a work exists in both, the version with the most recent `lastUpdated` timestamp is kept.
*   **Deleted Items**: Currently, we prioritize "Existence". If an item was deleted on one device but modified on another, it might reappear (this is a known trade-off for data safety).

### Gamification Merging (`mergeGamificationData`)
*   **Highest Value**: For fields like `level` or `totalXp`, we typically take the `Math.max()` of local and cloud values to ensure progress is never lost.

---

## 4. Manual Backup & Restore

Users can manually export their entire database as a JSON file via `src/utils/storageUtils.ts`.
*   **Export**: Combines all `localStorage` keys into a single file with a timestamp.
*   **Import**: Overwrites the Zustand store and triggers a cloud sync. This is the ultimate "fix-all" for synchronization issues.

---

## 5. Future Improvements
*   **Operational Transforms**: Move to a more granular diffing system to handle concurrent edits within the same manga entry.
*   **Background Sync**: Implement Service Worker-based sync to handle updates even if the tab is closed immediately after a change.
