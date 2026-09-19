/**
 * cron cleanupPending — sweep pending posts left un-validated for too long.
 *
 * Runs daily at 4h Europe/Paris. Any post in `social_pending_posts` older
 * than `PENDING_MAX_AGE_DAYS` is moved to `social_archived_posts` with
 * `archiveReason: 'expired'`, so the admin queue never grows stale
 * carousels from a week ago.
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { COLLECTIONS, archivePending } = require('../shared/firestore');
const { withCronHealth } = require('../shared/cronHealth');

const PENDING_MAX_AGE_DAYS = 3;
const ONE_DAY = 24 * 3600_000;

async function runCleanupPending() {
    return withCronHealth('cleanupPending', async () => {
        const db = admin.firestore();
        const cutoff = Date.now() - PENDING_MAX_AGE_DAYS * ONE_DAY;

        const snap = await db.collection(COLLECTIONS.pending)
            .where('createdAt', '<=', cutoff)
            .get();

        let archived = 0;
        for (const doc of snap.docs) {
            try {
                const ok = await archivePending(doc.id, 'expired');
                if (ok) archived += 1;
            } catch (err) {
                console.error(`[social/cleanupPending] failed to archive ${doc.id}:`, err.message || err);
            }
        }
        console.log(`[social/cleanupPending] archived ${archived}/${snap.size} expired pending posts (>${PENDING_MAX_AGE_DAYS}d)`);
        return { note: `archived ${archived}/${snap.size} (>${PENDING_MAX_AGE_DAYS}d)` };
    });
}

exports.runCleanupPending = runCleanupPending;
exports.cleanupPending = onSchedule(
    {
        schedule: '0 4 * * *',
        timeZone: 'Europe/Paris',
        retryCount: 1,
    },
    runCleanupPending,
);
