/**
 * shared/cronHealth.js — track per-cron execution health in Firestore.
 *
 * Each cron wraps its body in `withCronHealth(cronId, async () => {...})`.
 * The wrapper stamps `social_cron_health/<cronId>` with:
 *   - lastRunAt       (start ts, ms)
 *   - lastRunEndAt    (finish ts, ms)
 *   - lastDurationMs
 *   - lastStatus      : 'running' | 'success' | 'error'
 *   - lastError       : string | null
 *   - lastPostId      : string | null   (id of the pending post created, when any)
 *   - successCount    : incremented on success
 *   - errorCount      : incremented on error
 *
 * Admin UI reads the collection directly to render the health panel.
 */

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS } = require('./firestore');

async function markRunning(cronId) {
    const db = admin.firestore();
    await db.collection(COLLECTIONS.cronHealth).doc(cronId).set({
        cronId,
        lastRunAt: Date.now(),
        lastStatus: 'running',
        lastError: null,
    }, { merge: true });
}

async function markSuccess(cronId, startedAt, result) {
    const db = admin.firestore();
    const endedAt = Date.now();
    await db.collection(COLLECTIONS.cronHealth).doc(cronId).set({
        cronId,
        lastRunEndAt: endedAt,
        lastDurationMs: endedAt - startedAt,
        lastStatus: 'success',
        lastError: null,
        lastPostId: result?.postId || null,
        lastNote: result?.note || null,
        successCount: FieldValue.increment(1),
    }, { merge: true });
}

async function markError(cronId, startedAt, err) {
    const db = admin.firestore();
    const endedAt = Date.now();
    const message = err?.message || String(err);
    await db.collection(COLLECTIONS.cronHealth).doc(cronId).set({
        cronId,
        lastRunEndAt: endedAt,
        lastDurationMs: endedAt - startedAt,
        lastStatus: 'error',
        lastError: message.slice(0, 500),
        errorCount: FieldValue.increment(1),
    }, { merge: true });
}

/**
 * Wrap a cron body so its execution is stamped in Firestore.
 * The body may return `{ postId, note }` on success to enrich the record.
 * Errors are re-thrown so Firebase's own retry / logging still kicks in.
 */
async function withCronHealth(cronId, body) {
    const startedAt = Date.now();
    await markRunning(cronId);
    try {
        const result = await body();
        await markSuccess(cronId, startedAt, result || {});
        return result;
    } catch (err) {
        await markError(cronId, startedAt, err);
        throw err;
    }
}

module.exports = { withCronHealth };
