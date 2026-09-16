/**
 * shared/firestore.js — CRUD helpers for social bot collections.
 */

const admin = require('firebase-admin');

const COLLECTIONS = {
    pending: 'social_pending_posts',
    published: 'social_published_posts',
    config: 'social_bot_config',
    configDoc: 'singleton',
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
async function movePendingToPublished(postId, results, publishedBy) {
    const db = admin.firestore();
    const pendingRef = db.collection(COLLECTIONS.pending).doc(postId);
    const snap = await pendingRef.get();
    if (!snap.exists) throw new Error(`pending post ${postId} not found`);
    const data = snap.data();

    const batch = db.batch();
    batch.set(db.collection(COLLECTIONS.published).doc(postId), {
        ...data,
        publishedAt: Date.now(),
        publishedBy,
        results,
    });
    batch.delete(pendingRef);
    await batch.commit();
}

async function markPendingFailed(postId, errorMessage) {
    const db = admin.firestore();
    await db.collection(COLLECTIONS.pending).doc(postId).update({
        status: 'failed',
        error: errorMessage,
    });
}

async function markPendingProcessing(postId) {
    const db = admin.firestore();
    await db.collection(COLLECTIONS.pending).doc(postId).update({
        status: 'processing',
    });
}

async function deletePending(postId) {
    const db = admin.firestore();
    await db.collection(COLLECTIONS.pending).doc(postId).delete();
}

async function updatePendingCaption(postId, patch) {
    const db = admin.firestore();
    await db.collection(COLLECTIONS.pending).doc(postId).update(patch);
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

module.exports = {
    COLLECTIONS,
    createPendingPost,
    movePendingToPublished,
    markPendingFailed,
    markPendingProcessing,
    deletePending,
    updatePendingCaption,
    isDuplicateRecentPost,
};
