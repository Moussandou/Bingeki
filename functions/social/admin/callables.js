/**
 * admin/callables.js — HTTPS callables triggered from /admin/social.
 *
 * Auth: check both custom claims and Firestore isAdmin as a belt-and-
 * suspenders. Callables are called with the current user's ID token,
 * and the client-side RequireAdmin is NOT enough — always re-check.
 */

const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const {
    COLLECTIONS,
    deletePending,
    updatePendingCaption,
    markPendingFailed,
    markPendingProcessing,
} = require('../shared/firestore');
const { generateCaption } = require('../generators/gemini');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

async function assertAdminOrThrow(request) {
    const uid = request?.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required');

    // Prefer custom claim (fast path)
    if (request.auth.token?.admin === true || request.auth.token?.isAdmin === true) return;

    // Fallback: check Firestore isAdmin flag
    const db = admin.firestore();
    const snap = await db.doc(`users/${uid}`).get();
    if (!snap.exists || snap.data()?.isAdmin !== true) {
        throw new HttpsError('permission-denied', 'Admin only');
    }
}

/* ==========================================================================
   REJECT — delete pending post
   ========================================================================== */

exports.socialRejectPost = onCall(async (request) => {
    await assertAdminOrThrow(request);
    const { postId, reason } = request.data || {};
    if (!postId || typeof postId !== 'string') {
        throw new HttpsError('invalid-argument', 'postId is required');
    }
    console.log(`[social/reject] uid=${request.auth.uid} postId=${postId} reason=${reason || '-'}`);
    await deletePending(postId);
    return { ok: true };
});

/* ==========================================================================
   REGENERATE — re-run Gemini for the caption (keep slides)
   ========================================================================== */

exports.socialRegeneratePost = onCall(
    { secrets: [GEMINI_API_KEY] },
    async (request) => {
        await assertAdminOrThrow(request);
        const { postId } = request.data || {};
        if (!postId || typeof postId !== 'string') {
            throw new HttpsError('invalid-argument', 'postId is required');
        }

        const db = admin.firestore();
        const ref = db.collection(COLLECTIONS.pending).doc(postId);
        const snap = await ref.get();
        if (!snap.exists) throw new HttpsError('not-found', `pending post ${postId} not found`);
        const post = snap.data();

        await markPendingProcessing(postId);
        try {
            const config = await loadBotConfig();
            // Re-derive data payload from the post's sourceData if available;
            // for simplicity we use the existing slides' titles as fallback.
            const payload = post.sourceData?.animeIds?.length
                ? post.sourceData
                : post.slides.map((s) => ({ title: s.title || 'anime', cover: s.url }));

            const { caption, hashtags } = await generateCaption(post.type, payload, config);
            await updatePendingCaption(postId, { caption, hashtags, status: 'ready' });
            return { ok: true };
        } catch (err) {
            await markPendingFailed(postId, err.message || String(err));
            throw new HttpsError('internal', `regenerate failed: ${err.message || err}`);
        }
    },
);

/* ==========================================================================
   PUBLISH NOW — Phase 4 (needs Meta + TikTok tokens in Secret Manager)
   ========================================================================== */

exports.socialPublishNow = onCall(async (request) => {
    await assertAdminOrThrow(request);
    throw new HttpsError('unimplemented', 'Publish will land in phase 4 with Meta/TikTok integrations');
});
