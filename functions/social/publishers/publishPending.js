/**
 * publishers/publishPending.js — publie un post en attente sur Buffer.
 *
 * Partagé entre le callable socialPublishNow (bouton admin) et le cron
 * autoPublish (mode Auto). Politique de succès partiel : si au moins une
 * plateforme passe, le post part dans `published` avec les erreurs des
 * autres. Si rien ne passe, le post reste en attente et l'appelant décide
 * quoi en faire (échec ou bascule en Manuel).
 */

const admin = require('firebase-admin');
const {
    COLLECTIONS,
    markPendingProcessing,
    movePendingToPublished,
} = require('../shared/firestore');
const {
    publishToInstagram: bufferPublishInstagram,
    publishToTikTok: bufferPublishTikTok,
} = require('./buffer');

const PUBLISHERS = { insta: bufferPublishInstagram, tiktok: bufferPublishTikTok };

/**
 * @returns {Promise<{ ok: boolean, results: object, errors: object, post: object }>}
 *   ok = au moins une plateforme publiée (le post est alors dans `published`).
 */
async function publishPendingPost(postId, { config, apiKey, publishedBy }) {
    const db = admin.firestore();
    const snap = await db.collection(COLLECTIONS.pending).doc(postId).get();
    if (!snap.exists) throw new Error(`pending post ${postId} not found`);
    const post = snap.data();

    await markPendingProcessing(postId);

    const combinedCaption = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
    const results = { insta: null, tiktok: null };
    const errors = {};

    for (const platform of ['insta', 'tiktok']) {
        if (!post.platforms?.[platform]) continue;
        const channelId = config.platforms?.[platform]?.bufferChannelId;
        if (!channelId) {
            errors[platform] = 'missing bufferChannelId in config';
            continue;
        }
        try {
            results[platform] = await PUBLISHERS[platform](post.slides, combinedCaption, {
                apiKey,
                channelId,
                mode: config.platforms?.[platform]?.mode || 'photo',
            });
        } catch (err) {
            console.error(`[social/publishPending] Buffer→${platform} failed for ${postId}:`, err);
            errors[platform] = err.message || String(err);
        }
    }

    const anySuccess = Object.values(results).some((r) => r);
    const hasErrors = Object.keys(errors).length > 0;
    if (anySuccess) {
        await movePendingToPublished(postId, results, publishedBy, {
            errors: hasErrors ? errors : null,
        });
    }
    return { ok: anySuccess, results, errors, post };
}

module.exports = { publishPendingPost };
