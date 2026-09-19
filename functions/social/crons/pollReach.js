/**
 * cron pollReach — poll Buffer post metrics at j+1 / j+7 / j+30 after publish.
 *
 * Buffer's Publish API exposes per-post metrics through a single GraphQL
 * `post` query — same endpoint for Instagram and TikTok. Result payload:
 *
 *   { id, channelId, metrics: [{type, name, value, unit}], metricsUpdatedAt }
 *
 * We normalize `metrics[]` to a flat `{ [name]: value }` map per platform,
 * and stamp `${platform}_${milestone}` booleans so a post is polled at
 * most once per milestone.
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { COLLECTIONS } = require('../shared/firestore');
const { graphql } = require('../publishers/buffer');
const { withCronHealth } = require('../shared/cronHealth');

const BUFFER_API_KEY = defineSecret('BUFFER_API_KEY');
const ONE_DAY = 24 * 3600_000;

const POST_METRICS_QUERY = /* GraphQL */ `
    query GetPostMetrics($input: PostIdInput!) {
        post(input: $input) {
            id
            channelId
            metrics { type name value unit }
            metricsUpdatedAt
        }
    }
`;

const MILESTONES = [
    { key: 'j1', delayMs: ONE_DAY },
    { key: 'j7', delayMs: 7 * ONE_DAY },
    { key: 'j30', delayMs: 30 * ONE_DAY },
];

const PLATFORMS = ['insta', 'tiktok'];

function flattenMetrics(metricsArray) {
    if (!Array.isArray(metricsArray)) return {};
    const out = {};
    for (const m of metricsArray) {
        if (!m?.name) continue;
        const value = typeof m.value === 'number' ? m.value : Number(m.value) || 0;
        out[m.name] = value;
    }
    return out;
}

async function fetchMetrics(postId, apiKey) {
    const data = await graphql(POST_METRICS_QUERY, { input: { id: postId } }, apiKey);
    const post = data?.post;
    if (!post) throw new Error(`Buffer returned no post for id=${postId}`);
    return {
        raw: post.metrics || [],
        flat: flattenMetrics(post.metrics),
        updatedAt: post.metricsUpdatedAt || null,
    };
}

async function pollPlatformMilestone(platform, milestone, apiKey) {
    const db = admin.firestore();
    const now = Date.now();
    const cutoffMs = milestone.delayMs;

    // Grab posts that hit this milestone in the last 24h and haven't been polled yet.
    const snap = await db.collection(COLLECTIONS.published)
        .where('publishedAt', '<=', now - cutoffMs)
        .where('publishedAt', '>', now - cutoffMs - ONE_DAY)
        .get();

    let updated = 0;
    let skipped = 0;
    for (const doc of snap.docs) {
        const post = doc.data();
        const bufferPostId = post?.results?.[platform]?.id;
        if (!bufferPostId) { skipped += 1; continue; }
        if (post?.reach?.[`${platform}_${milestone.key}`]) { skipped += 1; continue; }

        try {
            const { raw, flat, updatedAt } = await fetchMetrics(bufferPostId, apiKey);
            const reachPatch = {
                ...(post.reach || {}),
                [platform]: {
                    ...(post.reach?.[platform] || {}),
                    ...flat,
                    raw,
                    metricsUpdatedAt: updatedAt,
                    capturedAt: now,
                },
                [`${platform}_${milestone.key}`]: true,
            };
            await doc.ref.update({ reach: reachPatch });
            updated += 1;
        } catch (err) {
            console.error(`[social/pollReach] ${platform}/${milestone.key} failed for ${doc.id}:`, err.message || err);
        }
    }
    console.log(`[social/pollReach] ${platform}/${milestone.key}: updated ${updated}, skipped ${skipped} of ${snap.size}`);
}

async function runPollReach() {
    return withCronHealth('pollReach', async () => {
        const apiKey = process.env.BUFFER_API_KEY;
        if (!apiKey) {
            console.error('[social/pollReach] BUFFER_API_KEY not configured, aborting');
            return { note: 'BUFFER_API_KEY missing' };
        }
        for (const platform of PLATFORMS) {
            for (const milestone of MILESTONES) {
                await pollPlatformMilestone(platform, milestone, apiKey);
            }
        }
        return { note: 'polled all platforms x milestones' };
    });
}

exports.runPollReach = runPollReach;
exports.pollReach = onSchedule(
    {
        schedule: 'every 6 hours',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [BUFFER_API_KEY],
    },
    runPollReach,
);
