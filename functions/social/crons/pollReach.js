/**
 * cron pollReach — poll Instagram Insights for every published post at
 * j+1 (24h after publish) and j+7 (168h after publish). Writes results
 * into `social_published_posts/{id}.reach.insta`.
 *
 * TikTok insights aren't polled here — the API is more restrictive and
 * requires per-video insights calls with specific permissions.
 *
 * Runs every 6h, only touches posts whose reach isn't populated yet
 * for the current milestone.
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { COLLECTIONS } = require('../shared/firestore');

const INSTA_PAGE_TOKEN = defineSecret('INSTA_PAGE_TOKEN');

const GRAPH = 'https://graph.facebook.com/v21.0';
const METRICS = 'impressions,reach,likes,comments,saved,shares';
const ONE_DAY = 24 * 3600_000;

async function fetchInsights(mediaId, accessToken) {
    const url = `${GRAPH}/${mediaId}/insights?metric=${METRICS}&access_token=${accessToken}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`Meta insights ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    }
    const out = {};
    for (const m of json.data || []) {
        out[m.name] = m.values?.[0]?.value ?? 0;
    }
    return out;
}

async function pollFor(cutoffMs, milestone) {
    const db = admin.firestore();
    const now = Date.now();
    const snap = await db.collection(COLLECTIONS.published)
        .where('publishedAt', '<=', now - cutoffMs)
        .where('publishedAt', '>', now - cutoffMs - ONE_DAY)
        .get();

    let updated = 0;
    for (const doc of snap.docs) {
        const post = doc.data();
        const mediaId = post?.results?.insta?.id;
        if (!mediaId) continue;
        // Skip if we already captured this milestone
        if (post?.reach?.[`insta_${milestone}`]) continue;

        try {
            const insights = await fetchInsights(mediaId, process.env.INSTA_PAGE_TOKEN);
            const reachPatch = {
                ...(post.reach || {}),
                insta: {
                    impressions: insights.impressions ?? 0,
                    reach: insights.reach ?? 0,
                    likes: insights.likes ?? 0,
                    comments: insights.comments ?? 0,
                    saved: insights.saved ?? 0,
                    shares: insights.shares ?? 0,
                    capturedAt: now,
                },
                [`insta_${milestone}`]: true,
            };
            await doc.ref.update({ reach: reachPatch });
            updated += 1;
        } catch (err) {
            console.error(`[social/pollReach] ${milestone} failed for ${doc.id}:`, err.message || err);
        }
    }
    console.log(`[social/pollReach] ${milestone}: updated ${updated}/${snap.size}`);
}

exports.pollReach = onSchedule(
    {
        schedule: 'every 6 hours',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [INSTA_PAGE_TOKEN],
    },
    async () => {
        // j+1
        await pollFor(ONE_DAY, 'j1');
        // j+7
        await pollFor(7 * ONE_DAY, 'j7');
    },
);
