/**
 * cron pollReach — refresh Buffer post metrics on every published post.
 *
 * Buffer's Publish API exposes per-post metrics through a single GraphQL
 * `post(input: {id})` query. The metrics are cumulative, so reading a
 * post twice is enough: each post is read at J+1 and J+7
 * (`reachMilestones` keeps the ones already done). A daily walk of every
 * post of the week cost ~780 calls a month out of Buffer's 3000.
 *
 * Instagram only: TikTok figures come from the connected TikTok account
 * (cron tiktokStats), which costs no Buffer quota.
 *
 * Buffer rate-limits the API key as a whole: this cron shares its quota
 * with publishing. It spaces its calls, stops at the first rate-limit
 * error and pauses entirely when the quota gets used (shouldPauseStats).
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
// Paliers de relecture (jours après publication).
const MILESTONES = [1, 7];
// Un peu plus que le dernier palier : un relevé raté se rattrape le lendemain.
const LOOKBACK_MS = 9 * ONE_DAY;
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

// TikTok est lu par tiktokStats via le compte connecté.
const PLATFORMS = ['insta'];

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

const bufferPlatforms = (post) => PLATFORMS.filter((p) =>
    post?.results?.[p]?.id && post.results[p].provider !== 'manual');

/** Paliers atteints mais pas encore relevés (vide si rien à lire). */
function pendingMilestones(post, now = Date.now()) {
    if (bufferPlatforms(post).length === 0) return [];
    const age = (now - post.publishedAt) / ONE_DAY;
    const done = post.reachMilestones || [];
    return MILESTONES.filter((m) => age >= m && !done.includes(m));
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
        const due = pendingMilestones(post, now);
        if (due.length === 0) { skipped += 1; continue; }
        const reachPatch = { ...(post.reach || {}) };
        const platforms = bufferPlatforms(post);
        let ok = 0;

        for (const platform of platforms) {
            await new Promise((r) => setTimeout(r, CALL_SPACING_MS));
            try {
                const { raw, flat, updatedAt } = await fetchMetrics(post.results[platform].id, apiKey);
                reachPatch[platform] = {
                    ...(reachPatch[platform] || {}),
                    ...flat,
                    raw,
                    metricsUpdatedAt: updatedAt,
                    capturedAt: now,
                };
                ok += 1;
            } catch (err) {
                console.error(`[social/pollReach] ${platform} failed for ${doc.id}:`, err.message || err);
                failed += 1;
                // Leave the remaining quota to publishing; retry tomorrow.
                if (isRateLimited(err)) { rateLimited = true; break; }
            }
        }

        if (ok > 0) {
            const update = { reach: reachPatch };
            // Palier validé seulement si toutes les plateformes ont répondu.
            if (ok === platforms.length) {
                update.reachMilestones = [...new Set([...(post.reachMilestones || []), ...due])].sort((a, b) => a - b);
            }
            await doc.ref.update(update);
            updated += 1;
        }
    }
    console.log(`[social/pollReach] refreshed ${updated}, skipped ${skipped} (nothing due), failed ${failed} of ${snap.size} posts${rateLimited ? ' (stopped: Buffer rate limit)' : ''}`);
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
        return { note: `${updated}/${total} refreshed · ${skipped} sans palier · ${failed} failed${rateLimited ? ' · rate-limited, stopped' : ''}` };
    });
}

exports.runPollReach = runPollReach;
exports.pendingMilestones = pendingMilestones;
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
