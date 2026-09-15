/**
 * shared/firestore.js — CRUD helpers for social bot collections
 *
 * Phase 1 stub. Real impl in Phase 2/3 will use admin SDK.
 */

const COLLECTIONS = {
    pending: 'social_pending_posts',
    published: 'social_published_posts',
    config: 'social_bot_config',
    configDoc: 'singleton',
};

async function createPendingPost(_db, _post) {
    // TODO: db.collection(COLLECTIONS.pending).add({...post, createdAt: Timestamp.now()})
    throw new Error('Not implemented — Phase 2');
}

async function movePendingToPublished(_db, _postId, _results, _publishedBy) {
    // TODO: batch write — delete pending, add published, preserve slides refs.
    throw new Error('Not implemented — Phase 4');
}

async function markPendingFailed(_db, _postId, _error) {
    // TODO: status='failed', error string, keep for admin retry.
    throw new Error('Not implemented — Phase 2');
}

module.exports = { COLLECTIONS, createPendingPost, movePendingToPublished, markPendingFailed };
