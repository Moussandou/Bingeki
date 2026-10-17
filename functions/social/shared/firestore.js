/**
 * shared/firestore.js — CRUD helpers for social bot collections.
 */

const admin = require('firebase-admin');
const { assertUnlocked } = require('../publishers/publicationCore');

const COLLECTIONS = {
    pending: 'social_pending_posts',
    published: 'social_published_posts',
    config: 'social_bot_config',
    configDoc: 'singleton',
    cronHealth: 'social_cron_health',
    archived: 'social_archived_posts',
    announced: 'social_announced_animes',
};

/**
 * Create a pending post ready for admin validation.
 * @param {object} post — matches the PendingPost type without `id`, `createdAt`, `status`.
 * @returns {Promise<string>} the created doc id
 */
async function createPendingPost(post) {
    const db = admin.firestore();
    const now = Date.now();
    const ref = await db.collection(COLLECTIONS.pending).add({
        ...post,
        createdAt: now,
        status: 'ready',
    });
    return ref.id;
}

/**
 * Move a pending post to the published collection after successful
 * publish on all target platforms.
 */
async function movePendingToPublished(postId, results, publishedBy, extras = {}) {
    const db = admin.firestore();
    const pendingRef = db.collection(COLLECTIONS.pending).doc(postId);
    const publishedRef = db.collection(COLLECTIONS.published).doc(postId);
    await db.runTransaction(async batch => {
        const [snap, published] = await Promise.all([batch.get(pendingRef), batch.get(publishedRef)]);
        if (published.exists) return;
        if (!snap.exists) throw new Error(`pending post ${postId} not found`);
        const data = snap.data();
        assertUnlocked(data);
        batch.set(publishedRef, {
            ...data,
            publishedAt: Date.now(),
            publishedBy,
            results,
            // When one platform succeeded but another failed, keep the
            // per-platform errors alongside the successful results so the
            // admin sees the partial state at a glance.
            ...(extras.errors ? { errors: extras.errors } : {}),
        });
        batch.delete(pendingRef);
    });
}

async function markPendingFailed(postId, errorMessage) {
    await updatePendingCaption(postId, {
        status: 'failed',
        error: errorMessage,
    });
}

async function markPendingProcessing(postId) {
    await updatePendingCaption(postId, {
        status: 'processing',
    });
}

async function deletePending(postId) {
    const db = admin.firestore();
    const ref = db.collection(COLLECTIONS.pending).doc(postId);
    await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        assertUnlocked(snap.data());
        tx.delete(ref);
    });
}

async function updatePendingCaption(postId, patch) {
    const db = admin.firestore();
    const ref = db.collection(COLLECTIONS.pending).doc(postId);
    await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error(`pending post ${postId} not found`);
        assertUnlocked(snap.data());
        tx.update(ref, patch);
    });
}

/**
 * Check if a set of anime IDs has already been posted (dedup).
 * Returns true if any recent post covers the same animes.
 */
async function isDuplicateRecentPost(type, animeIds, sinceMs = 24 * 3600_000) {
    if (!animeIds?.length) return false;
    const db = admin.firestore();
    const cutoff = Date.now() - sinceMs;
    // Check both pending and published for the same type in the window
    const [pendingSnap, publishedSnap] = await Promise.all([
        db.collection(COLLECTIONS.pending)
            .where('type', '==', type)
            .where('createdAt', '>=', cutoff)
            .get(),
        db.collection(COLLECTIONS.published)
            .where('type', '==', type)
            .where('publishedAt', '>=', cutoff)
            .get(),
    ]);
    const wanted = new Set(animeIds);
    for (const doc of [...pendingSnap.docs, ...publishedSnap.docs]) {
        const src = doc.data()?.sourceData?.animeIds ?? [];
        if (src.some((id) => wanted.has(id))) return true;
    }
    return false;
}

/**
 * Announcement dedup — mark a MAL id as already announced so the
 * announcement cron doesn't re-post it every 3 days. Called once we
 * successfully create a pending post for that anime.
 */
async function hasBeenAnnounced(malId) {
    const db = admin.firestore();
    const snap = await db.collection(COLLECTIONS.announced).doc(String(malId)).get();
    return snap.exists;
}

async function markAsAnnounced(malId, meta = {}) {
    const db = admin.firestore();
    await db.collection(COLLECTIONS.announced).doc(String(malId)).set({
        malId,
        title: meta.title || null,
        announcedAt: Date.now(),
    }, { merge: true });
}

/**
 * Move a pending post to the archived collection. Used by the cleanup
 * cron to sweep pending posts that were never validated + by admin
 * actions that need to preserve history rather than hard-delete.
 */
async function archivePending(postId, reason) {
    const db = admin.firestore();
    const pendingRef = db.collection(COLLECTIONS.pending).doc(postId);
    return db.runTransaction(async batch => {
        const snap = await batch.get(pendingRef);
        if (!snap.exists) return false;
        assertUnlocked(snap.data());
        batch.set(db.collection(COLLECTIONS.archived).doc(postId), {
            ...snap.data(),
            archivedAt: Date.now(),
            archiveReason: reason || 'unspecified',
        });
        batch.delete(pendingRef);
        return true;
    });
}

module.exports = {
    COLLECTIONS,
    createPendingPost,
    movePendingToPublished,
    markPendingFailed,
    markPendingProcessing,
    deletePending,
    updatePendingCaption,
    isDuplicateRecentPost,
    archivePending,
    hasBeenAnnounced,
    markAsAnnounced,
};
