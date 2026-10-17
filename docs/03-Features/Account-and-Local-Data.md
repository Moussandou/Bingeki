# Account and local data

## Self-service deletion

Settings calls `deleteOwnAccount`, never `deleteUser` directly. The callable
requires a sign-in within five minutes; an expired session prompts provider
reauthentication and then awaits the same cleanup operation without the UI's
busy-state guard blocking the retry. Email/password users can sign out and
sign back in manually when no popup provider is available.

The server first writes a permanent, server-only
`accountDeletions/{uid}` tombstone and marks an existing profile `deleting`.
Rules must deny writes for either condition, including attempts to recreate
a deleted profile. Gamification/activity transactions also read the parent
profile and skip absent/deleting users, so delayed triggers and concurrent
cleanup cannot resurrect documents.

Cleanup removes the profile and all subcollections; owned activities,
comments, tier lists, watch parties, challenges, feedback and survey responses;
mirrored friendships and notification references; likes/count references;
embedded watch-party participants and challenges mentioning the account.
It deletes user/avatar/banner storage (including the legacy banner prefix)
and owned feedback attachments before deleting Auth. The tombstone remains
without profile data. Errors propagate; incomplete cleanup is retryable and
does not report success or delete Auth early. After server confirmation the
client signs out **without** the normal library-flushing logout routine.

Profile updates send client-owned fields only, not server `lastUpdated`.
Creation/merge reads the profile inside a transaction, so concurrent Auth
registration and profile synchronization never rewrite immutable `createdAt`.
Banners upload under `users/{uid}/banners/`, not the forbidden root `banners/`.
These contracts depend on the coordinated Firebase security rules.

## Local backup restore

Export serializes only the active stores. It does not enumerate other
accounts' snapshot keys and does not export library ownership or hydration.
Restore accepts the existing version-1 export envelope, Zustand `state`
envelopes and legacy library arrays. It validates every supplied section
before modifying stores or storage. Unknown top-level state actions and
owner metadata cannot replace store methods or the active account.

The library restores works (including an empty array), folders, character
favorites, tombstones, view mode and sort order. Preferences and supplied
gamification fields are restored too. Imported works/metadata are dated as
a current edit; missing current works get typed tombstones so cloud merging
does not immediately resurrect them. Malformed JSON, invalid schema,
file-read errors and quota failures reject the import instead of returning
success. Storage is preflighted before reactive store mutation; failures
attempt rollback of both persisted and in-memory state and report any
rollback errors. This is not a cross-device/server transaction.

## Shared dialogs

`Modal` provides a named `role=dialog`, `aria-modal`, initial focus, a Tab /
Shift-Tab trap, Escape dismissal and focus restoration on close. Nested
dialogs keep the top dialog active and restore scroll locking correctly.
Mandatory username onboarding intentionally disables Escape/backdrop
dismissal until a valid profile update succeeds.

## Safe regression commands

```sh
npm run test:run -- src/firebase src/pages/Settings.test.tsx \
  src/components/ui/Modal.test.tsx src/hooks/usePushNotifications.test.ts \
  src/components/admin/PublishedPostModal.test.tsx src/utils/__tests__/storageUtils.test.ts
```

Run `functions/__tests__/functionalFlows.test.mjs` inside
`firebase emulators:exec --project demo-bingeki-flows --only firestore,storage`
using separate localhost ports from concurrent sessions. Both
`FIRESTORE_EMULATOR_HOST` and `FIREBASE_STORAGE_EMULATOR_HOST` are required;
otherwise these integration cases are skipped. They reject non-local hosts,
use synthetic documents and mock every publishing transport and Auth deletion.
No Functions emulator is started (so schedules cannot run), and no production
Firebase or social-network calls are made.
The integration tests invoke callable/trigger handlers locally and therefore
also require the dependencies from `functions/package.json` to be installed.
