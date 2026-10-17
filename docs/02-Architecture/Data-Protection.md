# Data Protection & Sync Strategy

See [Synchronization & Offline Design](Sync-Design.md) for the full lifecycle, account scopes, legacy compatibility and document-size policy.

## Library protection

`mergeLibraryData` compares `(type, id)` rather than MAL ID alone. Every user mutation advances the work's `lastUpdated`; newer whole-work edits win. `mergeTombstones` retains the newest deletion for each typed identity and preserves old untyped deletion records. Both sides of a merge are filtered against the combined history, including when one side is empty.

Firestore saves perform read/merge/write in one retryable transaction, preserve sharing metadata and validate the complete resulting document before writing. The application limit is 900 KiB of conservatively estimated Firestore bytes; no partial upload or silent truncation occurs. Oversize/permission/network errors leave local persistence intact and surface through `syncError` and the logger.

## Account isolation

The active library persists its owner. Guest, A and B have separate retained snapshots; initial signed-out startup preserves guests and switching users cannot carry account-owned library or gamification into another account. Legacy unowned data stays in the guest scope until the user explicitly imports it into an account. Auth generations prevent stale asynchronous reads from overwriting a newer session.

LocalStorage is not an encrypted vault. Account scoping prevents unintended app-level mixing; it does not protect against someone with browser-profile or filesystem access.

## Gamification ownership

The server owns derived XP, level, counters and canonical calculations. Client writes contain only `bonusXp`, `streak` and `lastActivityDate`. Cloud derived data takes precedence during hydration and the merged library drives optimistic local recalculation.

`validateGamificationWrite` validates finite, nonnegative client-owned values, the shared bonus cap and the existing per-save bonus jump limit (`MAX_BONUS_XP_JUMP`). An explicit zero reset is allowed. It does not freeze incorrect server-derived totals by enforcing a maximum against old derived stats. Badges merge by identity, retaining the earliest unlock; streak follows the latest activity timestamp.

## Recovery and limits

- Zustand writes local edits immediately. Unsent changes survive browser restart; lifecycle flushes reduce, but cannot eliminate, the close-before-upload window.
- `logDataBackup` stores the previously read cloud document in sessionStorage under `bingeki_backup_{type}_{userId}`. Transaction retries may refresh that diagnostic backup; it is not a durable history or an automatic restore system. Storage failures are logged.
- Export/import is an explicit user operation, not an automatic account transfer. Keep an external export before removing large images/notes or intentionally replacing library data.
- Deletion records are not expired automatically. A time-based purge can resurrect stale data from devices that were offline longer than the retention window.
