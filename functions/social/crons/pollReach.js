/**
 * cron pollReach — refresh Buffer post metrics on every published post.
 *
 * Buffer's Publish API exposes per-post metrics through a single GraphQL
 * `post(input: {id})` query. The metrics are cumulative and Buffer keeps
 * them updated on their side, so we just re-fetch on every tick — no need
 * for milestone windows. Once a day we walk the posts of the last 7 days
 * and overwrite `reach.<platform>` with the latest snapshot.
 *
 * Buffer rate-limits the API key as a whole: this cron shares its quota
 * with publishing. It used to walk 30 days every 6h (~70 calls a run),
 * which kept the key throttled and made "Publier" fail. So it now stays
 * small, spaces its calls and stops at the first rate-limit error.
 *
 * Buffer returns `metrics[]` as generic `{type, name, value, unit}`. We
 * keep the raw list and flatten by name for cheap admin lookups.
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { COLLECTIONS } = require('../shared/firestore');
const { graphql } = require('../publishers/buffer');
const { withCronHealth } = require('../shared/cronHealth');
const { shouldPauseStats, pruneBufferUsage } = require('../shared/bufferUsage');

const BUFFER_API_KEY = defineSecret('BUFFER_API_KEY');
const ONE_DAY = 24 * 3600_000;
const LOOKBACK_MS = 7 * ONE_DAY;
const CALL_SPACING_MS = 1500;

const isRateLimited = (err) => /too many requests|rate limit/i.test(err?.message || '');

const POST_METRICS_QUERY = /* GraphQL */ `
    query GetPostMetrics($input: PostInput!) {
        post(input: $input) {
            id
            channelId
            metrics { type name value unit }
            metricsUpdatedAt
        }
    }
`;

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

async function refreshAll(apiKey) {
    const db = admin.firestore();
    const now = Date.now();

    const snap = await db.collection(COLLECTIONS.published)
        .where('publishedAt', '>=', now - LOOKBACK_MS)
        .get();

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let rateLimited = false;
    for (const doc of snap.docs) {
        if (rateLimited) break;
        const post = doc.data();
        const reachPatch = { ...(post.reach || {}) };
        let touchedAnyPlatform = false;

        for (const platform of PLATFORMS) {
            const bufferPostId = post?.results?.[platform]?.id;
            // Publié à la main depuis le tel : pas de post Buffer à interroger.
            if (!bufferPostId || post.results[platform].provider === 'manual') continue;
            await new Promise((r) => setTimeout(r, CALL_SPACING_MS));
            try {
                const { raw, flat, updatedAt } = await fetchMetrics(bufferPostId, apiKey);
                reachPatch[platform] = {
                    ...(reachPatch[platform] || {}),
                    ...flat,
                    raw,
                    metricsUpdatedAt: updatedAt,
                    capturedAt: now,
                };
                touchedAnyPlatform = true;
            } catch (err) {
                console.error(`[social/pollReach] ${platform} failed for ${doc.id}:`, err.message || err);
                failed += 1;
                // Leave the remaining quota to publishing; retry tomorrow.
                if (isRateLimited(err)) { rateLimited = true; break; }
            }
        }

        if (touchedAnyPlatform) {
            await doc.ref.update({ reach: reachPatch });
            updated += 1;
        } else {
            skipped += 1;
        }
    }
    console.log(`[social/pollReach] refreshed ${updated}, skipped ${skipped} (no buffer id), failed ${failed} of ${snap.size} posts in the last 7 days${rateLimited ? ' (stopped: Buffer rate limit)' : ''}`);
    return { updated, skipped, failed, total: snap.size, rateLimited };
}

async function runPollReach() {
    return withCronHealth('pollReach', async () => {
        const apiKey = process.env.BUFFER_API_KEY;
        if (!apiKey) {
            console.error('[social/pollReach] BUFFER_API_KEY not configured, aborting');
            return { note: 'BUFFER_API_KEY missing' };
        }
        await pruneBufferUsage();
        const pause = await shouldPauseStats();
        if (pause) {
            // Une requête minimale suffit à rafraîchir les vrais compteurs
            // renvoyés par Buffer dans ses en-têtes (même si elle est refusée).
            await graphql('query { __typename }', {}, apiKey).catch(() => {});
            console.log(`[social/pollReach] paused to keep Buffer quota for publishing: ${pause}`);
            return { note: `en pause (quota Buffer) · ${pause}` };
        }
        const { updated, skipped, failed, total, rateLimited } = await refreshAll(apiKey);
        return { note: `${updated}/${total} refreshed · ${skipped} skipped · ${failed} failed${rateLimited ? ' · rate-limited, stopped' : ''}` };
    });
}

exports.runPollReach = runPollReach;
exports.pollReach = onSchedule(
    {
        // 05:00, well away from the 21h–22h publishing slots.
        schedule: '0 5 * * *',
        timeZone: 'Europe/Paris',
        retryCount: 0,
        timeoutSeconds: 540,
        secrets: [BUFFER_API_KEY],
    },
    runPollReach,
);
