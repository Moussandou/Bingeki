# Feature: Social & Community 🤝

Bingeki transforms solo tracking into a social experience. This document outlines the community-driven features and their underlying data models.

## 1. Native community feed

`/social` opens the native review feed, not the all-time leaderboard. Its primary
navigation is Feed, Discussions, and Challenges & awards. Friends, the historical
activity journal, watch parties, and official Instagram news remain accessible
without competing with the main conversation.

- **Feed filters:** My readings, Friends, Following, and Discover. My readings
  matches exact `workType:workId` identities against the viewer's library.
- **Reviews:** whole work or numbered chapter/episode; optional 1–10 rating,
  plain text, explicit spoiler flag, and public/friends visibility. Review
  ratings do not update library ratings.
- **Conversation:** editable/deletable reviews, paginated replies, helpful
  reactions, reader following, bilateral community blocks, and reports.
- **Integration:** work pages show native reviews separately from external
  MyAnimeList reviews and historical comments. Profiles include a review journal.
  Forward progress through the central handler can offer a dismissible review
  invitation at most once per day per account on the current device.
- **Discovery:** active discussion links are selected from the last 60 reviews
  in the week, prioritizing the viewer's works. This is explicitly a sample,
  not a complete popularity chart or a manga release calendar.

### Read/write and privacy contract

All new community data is server-owned. `communityRead` and `communityWrite`
are authenticated callables; clients cannot read or write their Firestore
collections directly. Every read checks the author's current profile
visibility, account deletion/ban state, accepted friendship, and blocks in
both directions. Reactions and replies recheck these constraints in a
transaction. A profile becoming private takes effect on subsequent requests.

The server serializes text and rating as `null` until explicit reveal when
the review is marked as a spoiler, the viewer's progress is unknown, or the
target is beyond their progress. Replies inherit that protection. The client
also masks already-fetched content if local progress moves backwards. Review
authors can read their own content.

Reply notifications contain no review text, reply text, work title, or chapter
number. They link to a fresh, authorized thread request. Reply notifications
can be disabled. A Monday 09:00 UTC in-app rendezvous is opt-in; no new push
permission or push delivery is introduced.

`communityPosts/{id}` stores root reviews, with `replies`, `reactions` and
`reactionClaims` subcollections. `communityState/{uid}` holds private preferences,
earned distinctions and progress high-water marks. `communityWeeks/{week_uid}`
holds server-owned weekly counters. Reports are in `communityReports` and can
only be inspected/resolved through the admin callable actions. Moderators can
hide a review or reply, or dismiss a report. Deleted review text is cleared;
claims survive deletion to prevent repeated rewards. Account deletion removes
posts, replies, reactions, counters, state and cross-user relationship references.

The feed uses `(createdAt desc, document ID desc)` cursors. Pages scan at most
30 roots and may be short or empty after privacy/filter checks; a continuation
cursor remains available so the client can load more without inventing content.

---

## 2. Friendship System

Bingeki uses a "Mutual Acceptance" model for friendships.
- **Request Lifecycle**: 
    1. Pending (stored symmetrically in `/users/{uid}/friends/{friendUid}`).
    2. Accepted (the Cloud Function updates both entries).
- **Real-Time Sync**: Profile snapshots (name, avatar, level) are stored directly in the friends list to avoid expensive cross-document joins during list rendering.

---

## 3. Leaderboards & Rankings

The historical XP/chapters/streak board and its podium remain available under
Challenges & awards. New weekly boards use separate server-owned counters for
eligible reviews, shōnen chapters, manga chapters, explored works and helpful
reviews. Equal scores share a rank; current private, banned, deleting or blocked
profiles are excluded.

Weeks run from Monday 00:00 UTC to the next Monday. The board queries at most
50 candidates in the selected category before privacy filtering. Reading is
self-reported; it is not proof that a work was actually read. Existing progress
and newly imported works establish a baseline. High-water marks survive
decreases/removals and exclude replayed increments. Each update counts at most
50 manga chapters per work. Shōnen classification only uses demographic ID 27
from the server API cache; missing metadata earns no shōnen-specific points.
Reading events use their Firestore write timestamp, not their delivery/retry
time. High-water checks favor avoiding duplicate awards; out-of-order delivery
can omit older increments already absorbed by a newer snapshot.

The first eligible review for each `(author, work, unit-or-whole-work)` earns
10 XP, capped at 30/week and 50,000 lifetime community XP. Recorded progress
is required for eligibility, not for publishing an opinion. Edits, replies,
likes and reposting the same target earn no additional XP. `communityXp` is
separate from client-owned `bonusXp`; the shared client/server math includes
both, and rules prevent clients from modifying community XP.

Participation milestones unlock permanent `first_voice` and `explorer` badges.
Three eligible reviews, 20 shōnen chapters, or five eligible helpful votes
unlock temporary titles, expiring at the end of the following week. Earned
distinctions can be displayed through a server-validated `communityTitle`.
Helpful-vote distinctions count a distinct reader once per post, on current-week
reviews, only for accounts at least seven days old outside accepted friend
pairs. These safeguards reduce trivial vote trading; they are not a fraud-proof
reputation system and never influence feed ordering.

Admins can inspect the current week's bounded operational counts in community
preferences: visits, recorded active readers, eligible authors, published
reviews, reviews answered by another member, returns after seven days, empty
feed visits, and reports. Queries are capped at 1,000 documents per source
and disclose truncation. Returns are not presented as cohort retention.

---

## 4. Profile Sharing (Hunter License) 📸

Every user profile has a unique SEO-optimized URL: `bingeki.app/profile/{username}`.

- **Dynamic OG Images**: When shared on Discord or Twitter, a custom "Hunter License" card is generated on-the-fly via Cloud Functions.
- **Social publishing**: Admins manage scheduled posts, review generated slides, and configure the social bot from `/admin/social`. See [Social Bot](./Social-Bot.md).
- **Privacy Controls**: Users can set their library to `Public`, `Friends Only`, or `Private`.
- **Technical Details**: See [SEO & Social Sharing](./SEO-Social-Sharing.md) for details on dynamic OG image generation.


---

## 5. Advanced Sync Features

- **Watch Parties**: Real-time synchronized viewing sessions. State is held in `/watchparties/{partyId}` where participants subscribe for instant UI updates.
- **Friend challenges:** creation and invitations remain available from
  Challenges & awards, alongside the new weekly participation goals.

### Canonical persistence contracts

- Watch-party ownership uses `hostId`, and ending a party writes `status: ended`.
  Account deletion also removes legacy `creatorId` parties.
- Work identities retain the original numeric/string API ID and a separate
  `workType` (`anime` or `manga`). Selection, recommendations and favorites must
  distinguish both values. Existing ambiguous favorite IDs are retained but
  are not resolved to an arbitrary category.
- New comments use `workType`; typed queries do not include old untyped
  comments because the original category cannot be inferred safely.
- New tier lists start with `likes: []` and `likesCount: 0`. Likes and count
  are updated together in a Firestore transaction. Public visitors query
  only `isPublic: true`; the owner may query their private lists too.

### Historical popularity migration (operator runbook)

`scripts/repair-tierlist-counts.cjs` defaults to **read-only planning**. It
deduplicates non-empty string UIDs in `likes` (missing/null means empty) and
derives `likesCount`. It never migrates emails or profile preferences. New
documents arriving after the scan require a fresh plan. The scan is ordered by
document ID, paged at 200 and bounded at 10,000 documents by default (explicit
maximum 100,000); exceeding the bound or the 16 MiB plan limit fails without
writes. Any malformed likes array or unsupported counter object fails the
entire planning pass. Numeric/string/boolean/null, missing, NaN and infinite
counters are preserved in the backup before normalization.

First rehearse on an isolated **demo** emulator. Choose an unused local port;
these example commands use the already-started emulator at port 8184:

```sh
export GCLOUD_PROJECT=demo-bingeki-migration
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8184
# Existing private directory outside all checkouts; never commit/copy its contents to a PR.
export PLAN="$HOME/private-backups/bingeki-tierlists-2026-10-18.json"
node scripts/repair-tierlist-counts.cjs --plan="$PLAN" --max-documents=500
# Review the private plan and aggregate CLI counts before authorizing writes.
node scripts/repair-tierlist-counts.cjs --apply --plan="$PLAN"
node scripts/repair-tierlist-counts.cjs --verify --plan="$PLAN"
# If needed, before any intervening edits:
node scripts/repair-tierlist-counts.cjs --rollback --plan="$PLAN"
```

The dry-run creates a new, exclusive, fsynced **0600** plan outside the repository.
It is also the mandatory targeted pre-write backup: only document IDs,
update-time preconditions and the changed `likes`/`likesCount` fields are saved,
including absent-field markers. Likes contain user IDs: the plan is sensitive,
not anonymous, and must remain private. No titles, profile fields, emails,
tokens or arbitrary URLs are copied. Existing plan files are never overwritten;
symlinks, hard links, permissive modes and mismatching targets are rejected on
load. This local backup requires no managed Firestore export permission.

Apply validates the entire plan and current versions **before** the first
write, then rechecks the list, owner and deletion tombstone in every transaction.
Lists with unknown/missing owners, banned/deleting/deleted owners or permanent
`accountDeletions/{uid}` tombstones are excluded and counted, not silently fixed.
An unrelated edit also invalidates the update-time precondition. No document
is recreated. A conflict arriving after preflight may leave an explicitly
partial run; keep the plan, investigate privately and resume the same command.
Do not blindly replace the plan to bypass conflicts.

Each commit atomically writes a minimal `{state: applied}` receipt at
`migrationReceipts/{planSha256}/entries/{index}`. Existing deny-by-default rules
make these server-only. The operator needs read/create/update access there as
well as read/update on the affected lists and read on owners/tombstones.
Receipts have the same commit timestamp as their list, so a lost response is
safe to resume without a second repair. They contain no backup values and
should be retained with the private plan for recovery.

Verification checks every planned output and receipt timestamp. It is scoped
to that plan, not a fresh collection-wide audit; run a new dry-run to check for
new legacy documents. Rollback restores only the two backed-up fields, including
deleting originally absent fields, and writes `{state: restored}` atomically.
It refuses **any** document changed since apply, even an unrelated edit with the
same counter values, and never recreates a deleted list or bypasses inactive
owner checks. Rollback is repeatable; applying an already rolled-back plan is
refused. Concurrent conflicts require manual review rather than forced restore.

Without an emulator the CLI refuses **reads and writes** unless the operator
supplies `--approve-production=<GCLOUD_PROJECT>` on each command. This is an
access acknowledgment, not authorization to apply: explicitly review/approve
the plan separately. Use the intended database/project with least-privilege
credentials; no credential files or tokens belong in the plan or logs. The
exported API accepts an already-authenticated Firestore instance (including
an in-memory `authClient`); it does not initialize auth or enforce the CLI's
production acknowledgment:

```js
const {
  planTierListCounts, savePlan, applyTierListCounts, verifyTierListCounts,
} = require('./scripts/repair-tierlist-counts.cjs');
const plan = await planTierListCounts(db, { maxDocuments: 500 });
savePlan(privatePlanPath, plan);
// Only after independent approval:
await applyTierListCounts(db, { planFile: privatePlanPath });
await verifyTierListCounts(db, { planFile: privatePlanPath });
// Conditional restore:
await applyTierListCounts(db, { planFile: privatePlanPath, rollback: true });
```

`repairTierListCounts(db, {planFile})` is the read-only compatibility entry point;
explicit `{apply: true, planFile}` delegates to apply. Omitting `planFile` from
read-only API planning returns a plan in memory; apply always reloads a private
backup from disk. CLI output contains aggregate counts and the plan hash only;
SDK diagnostics must be inspected privately through the API. No production
migration is run by tests.

Run the regression suite with the installed Firestore emulator jar. It chooses
a free local port, waits for readiness and stops its own emulator on completion:

```sh
RUN_MIGRATION_EMULATOR_TESTS=1 \
FIRESTORE_EMULATOR_JAR="$HOME/.cache/firebase/emulators/cloud-firestore-emulator-v1.20.4.jar" \
  npm exec -- vitest run functions/__tests__/tierListMigration.test.mjs
```

When `FIRESTORE_EMULATOR_HOST` already points to a local emulator (including the
existing CI browser job), the suite runs automatically without a jar or opt-in
flag and leaves that emulator running. It uses the separate
`demo-bingeki-migration` project and cleans only its four fixture collections:
`users`, `tierLists`, `accountDeletions` and `migrationReceipts`.

Deploy the matching composite indexes and security rules before rollout.

### Legacy profile visibility: no automatic public backfill

Legacy profiles without `profileVisibility` remain excluded from indexed public
discovery. `src/firebase/users.ts` initializes **new** profiles to `public`;
`firestore.rules`, `functions/sharedLibraryCore.js` and `functions/seo.js`
historically interpret a missing value as public for targeted reads. Neither
contract proves a legacy user's intended privacy. `src/store/settingsStore.ts`
also retains local `bingeki-settings` preferences when the cloud field is
absent; those device-local values cannot be inferred by an Admin scan.
Missing, null or unrecognized visibility is therefore never converted to public
by this migration. Existing private/friends/public values and activity preferences
remain untouched. Restoring discovery for an unknown legacy profile requires
the user's explicit setting or independently established consent, not a default
inferred from older read behavior.

`scripts/migrate-email-to-private.ts` is a **separate**, pre-existing tool that
moves a root profile email to `users/{uid}/private/contact` and deletes the root
field. It is not needed for popularity counters and was not run or modified
here. Unlike this counter migration it writes by default, logs personal data
in dry-run, scans all users and lacks an atomic compare-and-restore workflow;
do not reuse it as this runbook's backup/migration mechanism.

Account deletion, local backups and keyboard-dialog behavior are documented
in [Account and local data](./Account-and-Local-Data.md).

## Rollout and validation

Deploy the new Firestore indexes and rules, then `communityRead`,
`communityWrite`, `onCommunityLibraryUpdate`, `communityWeeklyDigest`, and
the updated gamification triggers **before** deploying the frontend. Wait
for indexes to finish building. Existing comments and external reviews are
not migrated into chapter reviews; their missing context must not be inferred.
No historical activity backfill or production data migration is required.

Firebase requires explicit confirmation when enabling the reading trigger's
failure/retry policy. The deployment workflow confirms only
`functions:onCommunityLibraryUpdate` with `--force`, then runs the full
deployment without `--force`. Do not force the full deployment: it would also
approve unrelated function/index deletions.

Useful local checks:

```sh
npm run lint
npm run validate:i18n
npm run build:isolated
npm run test:run -- functions/__tests__/community.test.mjs src/components/social/Community.test.tsx src/utils/__tests__/community.test.ts
bash scripts/start-emulators.sh 'npm run test:run -- functions/__tests__/community.test.mjs functions/__tests__/functionalFlows.test.mjs && npm run test:rules && npm run test:e2e -- tests/e2e/community.spec.ts'
```

On macOS, if a long checkout path exceeds the Unix socket path limit used by
`tsx`, prefix the command inside `emulators:exec` with `TMPDIR=/tmp`.
The browser community test uses real demo Auth/Firestore and invokes the
actual callable handlers through a local intercepted HTTP transport, without
starting unrelated production functions or contacting external services.
