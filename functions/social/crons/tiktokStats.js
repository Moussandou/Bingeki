/**
 * cron tiktokStats — chiffres TikTok de tous les posts publiés.
 *
 * On lit directement le compte TikTok Bingeki (scope video.list), ce qui
 * ne coûte rien sur le quota Buffer, et on rattache chaque vidéo à son
 * post : pour un post publié à la main, l'heure « J'ai publié » (la vidéo
 * est mise en ligne juste avant) ; pour un post Buffer, l'heure prévue
 * (dueAt), la vidéo apparaissant juste après.
 *
 * Écrit reach.tiktok au même format que pollReach (raw[] avec un type
 * stable + clés à plat) pour que l'admin lise tout pareil, et met à jour
 * social_bot_config/tiktok (abonnés, dernière synchro).
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { COLLECTIONS } = require('../shared/firestore');
const { withCronHealth } = require('../shared/cronHealth');
const { fetchUserInfo, fetchRecentVideos, secretRef, statusRef } = require('../publishers/tiktokApi');

const TIKTOK_CLIENT_KEY = defineSecret('TIKTOK_CLIENT_KEY');
const TIKTOK_CLIENT_SECRET = defineSecret('TIKTOK_CLIENT_SECRET');

const ONE_DAY = 86_400_000;
const LOOKBACK_MS = 30 * ONE_DAY;
// La vidéo est postée avant le clic « J'ai publié » : on accepte une
// vidéo créée jusqu'à 6 h avant et 30 min après.
const MATCH_BEFORE_MS = 6 * 3600_000;
const MATCH_AFTER_MS = 30 * 60_000;
// Repli quand « J'ai publié » a été cliqué bien après (ou daté à la main) :
// toute vidéo créée entre la génération du post et 12 h après le clic.
const FALLBACK_AFTER_MS = 12 * 3600_000;
// Post Buffer : TikTok le met en ligne à l'heure prévue, avec un peu de retard.
const BUFFER_BEFORE_MS = 30 * 60_000;
const BUFFER_AFTER_MS = 6 * 3600_000;

function reachFromVideo(video, now) {
    const metrics = [
        { type: 'views', name: 'Video Views', value: Number(video.view_count) || 0, unit: 'count' },
        { type: 'reactions', name: 'Likes', value: Number(video.like_count) || 0, unit: 'count' },
        { type: 'comments', name: 'Comments', value: Number(video.comment_count) || 0, unit: 'count' },
        { type: 'shares', name: 'Shares', value: Number(video.share_count) || 0, unit: 'count' },
    ];
    const flat = Object.fromEntries(metrics.map((m) => [m.name, m.value]));
    return { ...flat, raw: metrics, source: 'tiktok', videoId: video.id, capturedAt: now };
}

async function runTiktokStats() {
    return withCronHealth('tiktokStats', async () => {
        if (!(await secretRef().get()).exists) return { note: 'compte TikTok non connecté' };

        const now = Date.now();
        try {
            const [user, videos] = await Promise.all([fetchUserInfo(), fetchRecentVideos(40)]);

            const db = admin.firestore();
            const snap = await db.collection(COLLECTIONS.published)
                .where('publishedAt', '>=', now - LOOKBACK_MS)
                .get();

            const used = new Set();
            let matched = 0;
            const posts = snap.docs
                .filter((d) => d.data().results?.tiktok)
                .sort((a, b) => b.data().publishedAt - a.data().publishedAt);

            // Les vidéos déjà rattachées ne peuvent pas être reprises par un autre post.
            for (const doc of posts) {
                const known = doc.data().reach?.tiktok?.videoId;
                if (known) used.add(known);
            }

            const closest = (at, from, to) => {
                let pick = null;
                let bestGap = Infinity;
                for (const v of videos) {
                    if (used.has(v.id)) continue;
                    const created = Number(v.create_time) * 1000;
                    if (created < from || created > to) continue;
                    const gap = Math.abs(at - created);
                    if (gap < bestGap) { pick = v; bestGap = gap; }
                }
                return pick;
            };

            for (const doc of posts) {
                const post = doc.data();
                const tk = post.results.tiktok;
                const known = post.reach?.tiktok?.source === 'tiktok' ? post.reach.tiktok.videoId : null;
                let best = known ? videos.find((v) => v.id === known) : null;
                if (!best && tk.provider === 'manual') {
                    const at = tk.publishedAt || post.publishedAt;
                    best = closest(at, at - MATCH_BEFORE_MS, at + MATCH_AFTER_MS)
                        || closest(at, Math.min(post.createdAt || at, at - MATCH_BEFORE_MS), at + FALLBACK_AFTER_MS);
                } else if (!best) {
                    const at = Date.parse(tk.dueAt) || tk.publishedAt || post.publishedAt;
                    best = closest(at, at - BUFFER_BEFORE_MS, at + BUFFER_AFTER_MS);
                }
                if (!best) continue;
                used.add(best.id);
                const update = { 'reach.tiktok': reachFromVideo(best, now) };
                if (best.share_url) update['results.tiktok.permalink'] = best.share_url.split('?')[0];
                await doc.ref.update(update);
                matched += 1;
            }

            await statusRef().set({
                connected: true,
                displayName: user.display_name || null,
                avatarUrl: user.avatar_url || null,
                followerCount: Number(user.follower_count) || 0,
                likesCount: Number(user.likes_count) || 0,
                videoCount: Number(user.video_count) || 0,
                lastSyncAt: now,
                lastError: null,
            }, { merge: true });

            return { note: `${matched}/${posts.length} post(s) rattachés · ${videos.length} vidéos lues` };
        } catch (err) {
            await statusRef().set({ lastError: (err.message || String(err)).slice(0, 300), lastErrorAt: now }, { merge: true });
            throw err;
        }
    });
}

exports.runTiktokStats = runTiktokStats;
exports.tiktokStats = onSchedule(
    {
        schedule: '30 6,18 * * *',
        timeZone: 'Europe/Paris',
        retryCount: 0,
        secrets: [TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET],
    },
    runTiktokStats,
);
