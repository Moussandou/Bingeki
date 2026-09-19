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
const {
    publishToInstagram: bufferPublishInstagram,
    publishToTikTok: bufferPublishTikTok,
} = require('../publishers/buffer');
const { notifyPublishError } = require('../shared/discord');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const BUFFER_API_KEY = defineSecret('BUFFER_API_KEY');

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
        secrets: [BUFFER_API_KEY],
        // Video slideshow via ffmpeg still runs locally before we hand the
        // MP4 URL to Buffer, so keep the same headroom as the direct path.
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
        const errors = {};
        const apiKey = process.env.BUFFER_API_KEY;

        // Instagram (via Buffer)
        if (post.platforms?.insta) {
            const channelId = config.platforms?.insta?.bufferChannelId;
            if (!channelId) {
                errors.insta = 'missing bufferChannelId in config';
            } else {
                try {
                    results.insta = await bufferPublishInstagram(
                        post.slides,
                        combinedCaption,
                        {
                            apiKey,
                            channelId,
                            mode: config.platforms?.insta?.mode || 'photo',
                        },
                    );
                } catch (err) {
                    console.error(`[social/publishNow] Buffer→Instagram failed for ${postId}:`, err);
                    errors.insta = err.message || String(err);
                }
            }
        }

        // TikTok (via Buffer)
        if (post.platforms?.tiktok) {
            const channelId = config.platforms?.tiktok?.bufferChannelId;
            if (!channelId) {
                errors.tiktok = 'missing bufferChannelId in config';
            } else {
                try {
                    results.tiktok = await bufferPublishTikTok(
                        post.slides,
                        combinedCaption,
                        {
                            apiKey,
                            channelId,
                            mode: config.platforms?.tiktok?.mode || 'photo',
                        },
                    );
                } catch (err) {
                    console.error(`[social/publishNow] Buffer→TikTok failed for ${postId}:`, err);
                    errors.tiktok = err.message || String(err);
                }
            }
        }

        const anySuccess = Object.values(results).some((r) => r);
        const hasErrors = Object.keys(errors).length > 0;

        // Partial-success policy: if at least one platform published, move
        // the post to `published` with results + errors recorded, so the
        // admin sees what worked and what didn't and can retry manually.
        // If nothing succeeded, keep it in `pending` marked as failed.
        if (anySuccess) {
            await movePendingToPublished(postId, results, request.auth.uid, {
                errors: hasErrors ? errors : null,
            });
            if (hasErrors) {
                await notifyPublishError(config, {
                    title: post.title,
                    postId,
                    errors,
                    partial: true,
                    publishedBy: request.auth.uid,
                });
            }
            return { ok: true, results, errors: hasErrors ? errors : undefined };
        }

        const summary = Object.entries(errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' · ');
        await markPendingFailed(postId, summary);
        await notifyPublishError(config, {
            title: post.title,
            postId,
            errors,
            partial: false,
            publishedBy: request.auth.uid,
        });
        throw new HttpsError('internal', `Publish failed on every platform — ${summary}`);
    },
);

/* ==========================================================================
   RETRY PUBLISH — replay ONLY the failed platforms of a partially-published post
   ========================================================================== */

exports.socialRetryPublish = onCall(
    {
        secrets: [BUFFER_API_KEY],
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
        // Retry targets a post that already lives in `published` with per-platform
        // errors (partial success) — those are the only ones with something to
        // retry. A fully-failed post stays in `pending` and uses socialPublishNow.
        const publishedRef = db.collection(COLLECTIONS.published).doc(postId);
        const snap = await publishedRef.get();
        if (!snap.exists) {
            throw new HttpsError('not-found', `published post ${postId} not found — use publishNow if it's still pending`);
        }
        const post = snap.data();
        const existingErrors = post.errors || {};
        const failedPlatforms = Object.keys(existingErrors);
        if (failedPlatforms.length === 0) {
            return { ok: true, results: post.results, note: 'nothing to retry' };
        }

        const config = await loadBotConfig();
        if (isKilled(config)) {
            throw new HttpsError('failed-precondition', 'Kill-switch is active');
        }

        const apiKey = process.env.BUFFER_API_KEY;
        const combinedCaption = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
        const results = { ...(post.results || {}) };
        const remainingErrors = { ...existingErrors };

        for (const platform of failedPlatforms) {
            const channelId = config.platforms?.[platform]?.bufferChannelId;
            if (!channelId) {
                remainingErrors[platform] = 'missing bufferChannelId in config';
                continue;
            }
            const publisher = platform === 'insta'
                ? bufferPublishInstagram
                : platform === 'tiktok'
                    ? bufferPublishTikTok
                    : null;
            if (!publisher) {
                remainingErrors[platform] = `unknown platform ${platform}`;
                continue;
            }
            try {
                results[platform] = await publisher(post.slides, combinedCaption, {
                    apiKey,
                    channelId,
                    mode: config.platforms?.[platform]?.mode || 'photo',
                });
                delete remainingErrors[platform];
            } catch (err) {
                console.error(`[social/retryPublish] ${platform} still failing for ${postId}:`, err);
                remainingErrors[platform] = err.message || String(err);
            }
        }

        const stillFailing = Object.keys(remainingErrors).length > 0;
        await publishedRef.update({
            results,
            errors: stillFailing ? remainingErrors : null,
            lastRetryAt: Date.now(),
            lastRetryBy: request.auth.uid,
        });

        if (stillFailing) {
            await notifyPublishError(config, {
                title: post.title,
                postId,
                errors: remainingErrors,
                partial: Object.values(results).some((r) => r),
                publishedBy: request.auth.uid,
            });
        }

        return { ok: true, results, errors: stillFailing ? remainingErrors : undefined };
    },
);

/* ==========================================================================
   TRIGGER CRON — run a scheduled cron on demand for testing/demo
   ========================================================================== */

const { runDailyReleases } = require('../crons/dailyReleases');
const { runWeeklyRecap } = require('../crons/weeklyRecap');
const { runCommunityFavorite } = require('../crons/communityFavorite');
const { runNewSeasonDetector } = require('../crons/newSeasonDetector');
const { runPollReach } = require('../crons/pollReach');
const { runCleanupPending } = require('../crons/cleanupPending');

const CRON_RUNNERS = {
    dailyReleases: runDailyReleases,
    weeklyRecap: runWeeklyRecap,
    communityFavorite: runCommunityFavorite,
    newSeasonDetector: runNewSeasonDetector,
    pollReach: runPollReach,
    cleanupPending: runCleanupPending,
};

exports.socialTriggerCron = onCall(
    {
        secrets: [GEMINI_API_KEY, BUFFER_API_KEY],
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    async (request) => {
        await assertAdminOrThrow(request);
        const { cronId } = request.data || {};
        const runner = CRON_RUNNERS[cronId];
        if (!runner) {
            throw new HttpsError('invalid-argument', `Unknown cronId "${cronId}". Valid: ${Object.keys(CRON_RUNNERS).join(', ')}`);
        }
        console.log(`[social/triggerCron] uid=${request.auth.uid} cronId=${cronId}`);
        try {
            const result = await runner();
            return { ok: true, result: result || null };
        } catch (err) {
            console.error(`[social/triggerCron] ${cronId} failed:`, err);
            throw new HttpsError('internal', `${cronId} failed: ${err.message || err}`);
        }
    },
);
