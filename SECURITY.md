# Security Policy

## Supported Versions

The following versions of Bingeki are currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 3.7.x   | :white_check_mark: |
| 3.6.x   | :white_check_mark: |
| < 3.6   | :x:                |

## Reporting a Vulnerability

We take the security of Bingeki seriously. If you believe you have found a security vulnerability, please report it to us by following these steps:

1. **Email us**: Send a detailed report to **bingeki.official@gmail.com**.
2. **Details**: Include a description of the vulnerability, the steps to reproduce it, and any potential impact.
3. **Response**: We will acknowledge your report within 48 hours and provide a timeline for a fix if the vulnerability is confirmed.

Please do not disclose the vulnerability publicly until we have had a chance to address it.

## Firebase authorization contracts

Profile discovery queries must constrain `profileVisibility` to `public`. Targeted
profile reads also permit the owner, administrators and **accepted** friends of a
friends-only profile. Pending invitations never grant access. Activities check the
current profile visibility and activity-sharing setting, not just the historical
visibility copied onto an event. Clients must not request a mixed activity batch
containing profiles they cannot read.

`users/{uid}/data/library` remains a single owner/admin-only document. Visitors
must call `getSharedLibraryFn({ userId, folderId? })`; direct SDK reads are denied
even for public shares. The callable checks current profile visibility, accepted
friendship, deletion tombstones and the requested sharing settings. It returns
only an allowlisted projection: private notes, deletion history, update metadata
and private folder memberships/names are never returned. A global share exposes
unfiled works and works in an explicitly accessible shared folder. A folder link
exposes only that folder's works, and can be shared independently of the global
library. Friendship alone does not enable a disabled share.

Client writes cannot grant super-admin privileges, change another participant's
identity/progress, forge likes, or write derived gamification statistics.
Administrators retain bounded bonus-XP adjustments, not direct derived-stat writes.
Tier-list like updates must atomically write `likes` and `likesCount` equal to
the new array length, changing only the caller's membership. Watch parties use
`hostId` and the terminal status `ended`. Banned/deleting accounts and UIDs with
a permanent `accountDeletions/{uid}` tombstone cannot write using an old token.
Challenge creation uses `createChallengeFn` to validate every invitation in
multi-friend challenges; direct SDK creation is denied. The creator starts
accepted with zero progress, all invitees start pending with zero progress,
and `workType` can disambiguate anime/manga identifiers.
Watch-party creation likewise uses `createWatchPartyFn`, preserving multi-friend
invitations while validating host identity and initial invitee readiness/progress.
Both creation callables read every participant's live profile and deletion
tombstone in the write transaction, rejecting missing, banned or deleting accounts.
Names, photos and the host name are derived from those profiles, never trusted
from invitation payloads.

Storage permits guest feedback attachments on **new paths only**; replacement is
denied even for authenticated uploaders. Direct reads/deletes remain admin-only.
User images require ownership. All image uploads require a nonempty file smaller
than 10 MiB and a JPEG, PNG, WebP, GIF or AVIF MIME type; SVG/HTML are not accepted.
MIME metadata is an access constraint, not a content scanner.

Dynamic SVG responses validate HTTPS URLs, allowlisted hex colors and numeric
statistics, escape text/attributes and send an independent sandboxed, script-free
CSP. Private/friends-only profiles are never rendered by the unauthenticated SEO
routes. Profile HTML/SVG responses are not cached.

### Local regression checks

Use synthetic data and a `demo-` project only; never point rules tests at a real
Firebase project:

```sh
firebase emulators:exec --project demo-bingeki-security --only firestore,storage 'npm run test:rules'
npm run test:run -- functions/__tests__ src/shared/__tests__
```

Deploy the callables and their visitor-loader/invitation integration together with the rules.
The source library schema is unchanged; no production-data migration is required.
