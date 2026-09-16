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
    movePendingToPublished,
} = require('../shared/firestore');
const { generateCaption } = require('../generators/gemini');
const { publishToInstagram } = require('../publishers/instagram');
const { publishToTikTok } = require('../publishers/tiktok');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const INSTA_PAGE_TOKEN = defineSecret('INSTA_PAGE_TOKEN');
const TIKTOK_ACCESS_TOKEN = defineSecret('TIKTOK_ACCESS_TOKEN');

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
    const uid = request.auth.uid;
    console.log(`[social/reject] uid=${uid} postId=${postId} reason=${reason || '-'}`);

    // Snapshot the post before deleting so the audit log keeps the title.
    const db = admin.firestore();
    const snap = await db.collection(COLLECTIONS.pending).doc(postId).get();
    const post = snap.exists ? snap.data() : null;

    await deletePending(postId);

    // Audit log — non-blocking, best-effort
    try {
        await db.collection('social_admin_audit').add({
            action: 'reject',
            postId,
            postTitle: post?.title || null,
            postType: post?.type || null,
            reason: reason || null,
            uid,
            at: Date.now(),
        });
    } catch (err) {
        console.warn('[social/reject] audit write failed:', err.message || err);
    }

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

            // Keep the previous version as variantB for A/B comparison
            const variantB = {
                caption: post.caption || '',
                hashtags: post.hashtags || '',
                generatedAt: post.createdAt || Date.now(),
            };

            await updatePendingCaption(postId, { caption, hashtags, variantB, status: 'ready' });
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

exports.socialPublishNow = onCall(
    {
        secrets: [INSTA_PAGE_TOKEN, TIKTOK_ACCESS_TOKEN],
        // Video slideshow via ffmpeg needs headroom; photo mode is fine on defaults.
        memory: '2GiB',
        timeoutSeconds: 540,
    },
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

        const config = await loadBotConfig();
        if (isKilled(config)) {
            throw new HttpsError('failed-precondition', 'Kill-switch is active');
        }

        await markPendingProcessing(postId);

        const combinedCaption = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
        const results = { insta: null, tiktok: null };

        // Instagram
        if (post.platforms?.insta) {
            try {
                results.insta = await publishToInstagram(
                    post.slides,
                    combinedCaption,
                    {
                        accountId: config.platforms?.insta?.accountId,
                        accessToken: process.env.INSTA_PAGE_TOKEN,
                        mode: config.platforms?.insta?.mode || 'photo',
                    },
                );
            } catch (err) {
                console.error(`[social/publishNow] Instagram failed for ${postId}:`, err);
                await markPendingFailed(postId, `Instagram: ${err.message || err}`);
                throw new HttpsError('internal', `Instagram publish failed: ${err.message || err}`);
            }
        }

        // TikTok
        if (post.platforms?.tiktok) {
            try {
                results.tiktok = await publishToTikTok(
                    post.slides,
                    combinedCaption,
                    {
                        accessToken: process.env.TIKTOK_ACCESS_TOKEN,
                        mode: config.platforms?.tiktok?.mode || 'photo',
                    },
                );
            } catch (err) {
                console.error(`[social/publishNow] TikTok failed for ${postId}:`, err);
                // Instagram may have succeeded — don't rollback, just record the partial failure
                await markPendingFailed(postId, `TikTok: ${err.message || err}`);
                throw new HttpsError('internal', `TikTok publish failed: ${err.message || err}`);
            }
        }

        await movePendingToPublished(postId, results, request.auth.uid);
        return { ok: true, results };
    },
);
