# Synchronization & Offline Design

The UI writes to Zustand, which persists immediately to localStorage. Signed-in libraries synchronize to the existing `users/{uid}/data/library` document. No subcollection migration or production data rewrite is required.

## Local scopes and authentication

- `bingeki-library-storage` holds the active library and its `ownerId` (`null` for guest). The gamification store belongs to the same active scope.
- On an actual scope change, `libraryAccountScope.ts` retains the outgoing library, folders, favorites, tombstones and gamification in `bingeki-account-snapshot:guest` or `bingeki-account-snapshot:user:{uid}`, then restores the incoming scope. A first null auth notification does not clear guest data.
- Legacy data without an owner is retained as guest. It is **not automatically uploaded to a newly signed-in account**: the old format cannot prove which account originally owned it. Export while in guest mode and explicitly import into the desired account to transfer it. Logging out restores the guest library.
- Account A never seeds account B. Timers require the current UID, matching library owner and successful cloud hydration. Auth callbacks use a generation guard after each asynchronous step and before installing listeners. Subscriptions are detached on account changes and unmount.
- The app does not render a library whose owner differs from the current auth UID, even after its loading timeout. If retaining an outgoing scope fails (for example, localStorage quota), the switch is blocked and the error is shown instead of exposing the previous account.
- Initial read errors are not interpreted as empty cloud data. Writes stay paused and `syncError` reports the failure; the local library remains available. Refresh after correcting connectivity or permissions to restart hydration.

Local account snapshots are persistence, not encryption. Signing out isolates app state but does not erase private data from browser storage. Use a trusted browser profile; clear site data when relinquishing the device.

## Identity and backwards compatibility

`Work.id` remains the original MAL number (or existing manual ID); `Work.type` remains `anime` or `manga`. `workKey(work)` produces `anime:123` / `manga:123` for comparisons, selections, drag-and-drop and store operations. No ID rewrite is performed, so existing export and API formats remain compatible.

Raw numeric/string IDs still work with store actions when exactly one work matches. Ambiguous raw IDs throw an explicit error rather than modifying both media types. New callers must pass the composed key. Details URLs retain `/work/{id}?type={type}` and API requests retain raw MAL IDs. Import deduplication also checks type.

New comments carry `workId` plus `workType`; typed queries require the corresponding composite index in `firestore.indexes.json`. Old comments without a type remain stored and available through the legacy untyped API, but are not guessed into an anime or manga discussion. There is no lossless automatic attribution for those records. Server activity generation similarly compares type plus ID while retaining its existing `workId` / `workType` event format.

## Cloud lifecycle

1. On login, load only the active account's local state and cloud document. Merge against the **current** local state when the read completes, so edits made during loading are included.
2. Merge works and deletion history; select folders/order/preferences using `metadataUpdatedAt`. Legacy documents with no metadata timestamp retain their cloud metadata on initial load. The newest folder-sharing timestamp is retained separately.
3. Mark hydration complete and schedule one save of the merged state. Subscribe to the library document with `onSnapshot` for other-device updates. Remote hydration does not echo-write itself.
4. Local mutations debounce for three seconds. Writes read and merge **inside a Firestore transaction**, which retries against concurrent updates. Ordinary saves preserve library sharing and other existing document metadata. Sharing changes are independent from work edits.
5. `pagehide`, `visibilitychange`, `online` and hook cleanup flush pending work. In-flight changes schedule a subsequent save. Failures retain pending local data and report the exact error; an online/visibility event or a further edit retries.

Closing a tab cannot guarantee completion of a network transaction. Immediate local persistence is the durable fallback; the next login merges unsent edits. There is no claim of a service-worker or unload-time delivery guarantee.

## Conflict semantics

- Works are keyed by type plus ID, with last-update-wins for the **whole work**, not each field. Status, progress, ratings, notes and folder membership all advance `lastUpdated`, monotonically even within one clock tick.
- Independent works from concurrent devices are retained. For simultaneous edits of different fields in the same work, the newer whole-work version wins. Clocks must be reasonably accurate; this is not a CRDT or server-clock ordering protocol.
- Folder lists, manual order and preferences are a timestamped metadata snapshot, not a per-folder CRDT. Concurrent metadata edits resolve by the newest snapshot.
- `deletedWorks` is synchronized in the same transaction. New tombstones contain `{ id, type, deletedAt }`; old untyped tombstones remain compatible and suppress both matching namespaces up to their timestamp.
- Both local and cloud works are filtered by the combined deletion history. Deletions win over older/equal work versions; an explicit re-add receives a timestamp newer than its tombstone.
- Tombstones have **no automatic TTL**: a device can return after months offline. Explicit replacement/wipe writes tombstones for omitted cloud works, rather than allowing an older device to resurrect them.

## Bounded document strategy

Keep the monolithic document for compatibility, with a conservative **900 KiB (921,600 byte)** application limit, below Firestore's 1 MiB document hard limit. `estimateLibraryBytes` counts UTF-8 strings, numeric fields, field names and conservative container overhead, including tombstones and existing sharing metadata. `assertLibrarySize` accepts exactly 921,600 estimated bytes and rejects the next byte **before** scheduling a transaction write.

Oversized libraries are not truncated, split, or partially uploaded. Local data stays intact, errors are logged and displayed on the Library page. Export a backup, reduce inline images or unusually large notes, then retry. Very large libraries or deletion histories need a separately coordinated archival/subcollection design; silently dropping tombstones is not safe.

Non-owner reads use the server `getSharedLibraryFn` projection, never the owner's full document. Folder links pass `folderId`; server authorization and field projection control which works and folders are returned. Deploy the companion security/projection changes before relying on shared reads.

The friends activity feed preflights profiles individually, excludes private/opted-out authors before querying, and batches at most three visible authors per query to stay within the rules' document-read budget. An inaccessible friend's shared library is omitted without dropping other accessible friends.

## Regression coverage

Network-free Vitest tests cover guest refresh, A/B/logout isolation, stale auth completions, listener cleanup, hydration failures, debounce/lifecycle flushing, edits during an in-flight save, namespace collisions, import deduplication, timestamped mutations, multi-device deletions/re-adds, transaction retry merges, sharing preservation, and exact ASCII/UTF-8 size boundaries. No production account or data is used.
