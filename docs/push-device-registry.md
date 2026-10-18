# Private iOS push device registry

Backend contract for #149. This prepares registration only: no deployment,
APNs activation, UI, FCM transport, delivery proof, outbox, or notification trigger.
In particular, client-writable `users/{uid}/notifications` is not a trusted
source for a future sender.

## Callables

`registerPushDevice` and `revokePushDevice` use the existing Firebase callable
authentication and `CALLABLE_REGIONS` (`europe-west9`, migration alias
`us-central1`). Prefer `europe-west9`. The UID comes only from `request.auth.uid`.
Unauthenticated and anonymous sessions are rejected. An existing profile without
`isBanned`/`deleting` and no `accountDeletions/{uid}` tombstone is required in
the same transaction as every mutation (including retries).

Registration accepts **exactly** these fields, no recipient UID or timestamps:

```json
{
  "installationId": "11111111-1111-4111-8111-111111111111",
  "expectedGeneration": null,
  "tokenFCM": "<Firebase Messaging registration token, never an APNs token>",
  "platform": "ios",
  "bundleId": "com.bingeki.ios",
  "permission": "authorized",
  "enabled": true
}
```

`installationId` is a persisted installation UUID in lowercase canonical
8-4-4-4-12 hexadecimal form. `expectedGeneration` is `null` only when its device
document does not exist; otherwise send that document's opaque server generation
UUID. Do not synthesize, increment, or reuse another account's generation.
`tokenFCM` is an opaque 20..4096-character ASCII string using letters, digits,
`_`, `-`, `:`; a 64-character hexadecimal APNs token is explicitly rejected.
Syntax validation does **not** verify token ownership, app attestation, or delivery.
Only supply the token returned by the Firebase Messaging SDK. No device quota or
new authentication system is introduced.

`permission` is one of `notDetermined`, `denied`, `authorized`, `provisional`,
`ephemeral`. `enabled` is a boolean and can be true only for the last three
permissions; it is registration eligibility, not evidence of delivered messages.
Disabled registrations can retain a private token/binding; explicit revocation
removes them. Permission is client-reported, not an OS attestation.

Success: `{ "ok": true, "generation": "<server UUID>", "enabled": true }`.
An exact registration retry returns the same generation, even if the original
response was lost. A changed registration uses compare-and-set against
`expectedGeneration`, rotates the server generation, and atomically removes its
previous token binding.

Revocation accepts exactly:

```json
{
  "installationId": "11111111-1111-4111-8111-111111111111",
  "expectedGeneration": "<generation returned by registration>"
}
```

Success is `{ "ok": true, "revoked": true }` if that lease was revoked,
otherwise `{ "ok": true, "revoked": false }` for an absent, already-revoked or
newer-generation device. A late revoke is deliberately a no-op, not a deletion of
the current lease. Revocation retains a token-free device tombstone with a new
generation. To re-enable that installation, read its current document and register
with that generation. Capture the old account's generation **before** sign-out;
an authenticated revoke must happen before losing its Firebase session.

Concurrent writes to one installation must be serialized by the client. On
`aborted`, refresh its owner-readable document and reconcile current user intent;
never blindly replay an old user's registration after an account switch.

## Storage and ownership

`users/{uid}/pushDevices/{installationId}` is readable/listable only by its active,
non-anonymous owner, never friends, other accounts, guest sessions or client admins.
All client writes, including owner/admin creates, updates and deletes, are denied.
Active registration documents contain exactly:

- `tokenFCM`, `tokenHash` (SHA-256 hex), `platform`, `bundleId`, `permission`,
  `enabled`, opaque server `generation`, server `createdAt` and `updatedAt`.

Revoked/transferred device documents contain `platform`, `bundleId`, `permission`,
`enabled: false`, a fresh `generation`, preserved `createdAt`, server `updatedAt`
and `revokedAt`. They contain neither the token nor its hash.

`pushTokenBindings/{sha256(tokenFCM)}` is server-only, including for admins.
It contains `uid`, `installationId`, `generation`, server `updatedAt` and no raw
token. Exactly one account/installation can hold a token. Transfer A to B removes
the token from A's device and invalidates A's generation in the same transaction
that creates B's device/binding. A's delayed revoke or rotation cannot release B.
Hashing is an internal index, not encryption or a client-readable identifier.

`pushDeviceState/{uid}` is server-only technical throttling state. Like existing
community mutation throttles, it uses transactional server-clock milliseconds:
`lastRegisteredAt`, `lastRevokedAt`. Effective registrations and effective
revocations each have a separate 10-second per-account cooldown, reusing the
community reply interval as an anti-abuse guard rather than a product quota.
The first revoke immediately after registration is therefore permitted. Exact
registration retries and stale/repeated revocations do not consume this cooldown.
For multiple installations, space effective mutations of the same kind accordingly.

No registry token is written to a public user profile, `private/*`, notifications,
responses, logs, URLs or analytics. Unexpected SDK failures are logged only as a
static event and returned as a generic error, without their payload/document path.

## Errors

| Callable code (Firebase SDK adds `functions/`) | Meaning / handling |
|---|---|
| `unauthenticated` | Firebase sign-in required. |
| `permission-denied` | Anonymous account is not eligible. |
| `invalid-argument` | Missing/extra fields, invalid UUID/token/platform/bundle/permission/boolean, or null revoke generation. No input values are echoed. |
| `failed-precondition` | Missing, banned, deleting or tombstoned account; never retry by recreating a profile. |
| `aborted` | Registration generation changed or a simultaneous first-time claim won; refresh device state and reconcile intent. |
| `resource-exhausted` | Effective mutation cooldown; `details.retryAfterMs` is the remaining delay. |
| `internal` | Unexpected storage/SDK failure, generic payload; retry safely without logging tokens. |

`deleteOwnAccount` remains unchanged externally: recent-auth precondition, existing
`requires-recent-login` detail, and `{ok:true}` only after cleanup. After writing
its permanent tombstone, cleanup pages globally through `pushTokenBindings` by
UID (including bindings whose device is missing), conditionally deletes only
bindings still owned by that UID, and removes its throttle state. Existing recursive
user deletion removes all device documents. Durable cleanup cursors and the
tombstone make interrupted retries idempotent; transfers to B survive A's cleanup.

## Future sender requirements

This PR does not implement a sender. A future trusted server event source must
recheck active account/tombstone, device enabled/permission, bundle/platform and
matching binding UID/installation/generation before sending. Never trust client
notification writes or treat registry entries as proof of deliverability.
