/**
 * cron dailyReleases — 1 post carousel avec les épisodes sortis
 * dans la journée. Trigger: 10h Europe/Paris.
 *
 * Split logic when the day is busy (>18 releases):
 * - TikTok photo carousels support up to 35 assets → 1 post with the
 *   whole list, no split.
 * - Instagram carousels support up to 20 slides since 2024 (intro +
 *   18 animes + outro) → we split into "Partie 1/N", "Partie 2/N", …
 *   each with up to 18 animes, Instagram only.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchTodaysReleases } = require('../generators/jikan');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost, isDuplicateRecentPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const INSTA_CHUNK = 18; // Instagram carousel = 20 slides max (2024+)
const TIKTOK_MAX = 35;  // Buffer photo carousel limit on TikTok

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function normaliseAnime(a) {
    return {
        mal_id: a.mal_id,
        title: a.title,
        cover: a.cover,
        currentEpisode: a.currentEpisode ?? null,
    };
}

async function buildAndCreatePost({
    type = 'daily',
    title,
    list,
    scheduledAt,
    platforms,
    config,
}) {
    const { caption, hashtags } = await generateCaption('daily', list, config);
    const slides = await renderSlides('daily', list, ['feed', 'story']);
    const animeIds = list.map((a) => a.mal_id);
    const animes = list.map(normaliseAnime);
    const id = await createPendingPost({
        type,
        scheduledAt,
        title,
        caption,
        hashtags,
        slides,
        sourceData: { animeIds, animes },
        platforms,
    });
    return { id, slidesCount: slides.length };
}

async function runDailyReleases() {
    return withCronHealth('dailyReleases', async () => {
        const config = await loadBotConfig();
        if (isKilled(config) || !config.schedules?.daily?.enabled) {
            console.log('[social/dailyReleases] skipped — kill-switch or schedule disabled');
            return { note: 'skipped: kill-switch or schedule disabled' };
        }

        const releases = await fetchTodaysReleases();
        if (releases.length === 0) {
            console.log('[social/dailyReleases] no releases today');
            return { note: 'no releases today' };
        }

        // Ordre : les mieux notés MAL d'abord (triés desc), puis les
        // anime sans score encore (nouveaux, niches). On ne drop personne
        // — un anime sans score peut être une pépite qui n'a juste pas
        // encore reçu assez de votes.
        const scored = releases
            .filter((r) => r.score && r.score > 0)
            .sort((a, b) => (b.score || 0) - (a.score || 0));
        const unscored = releases.filter((r) => !r.score || r.score <= 0);
        const fullList = [...scored, ...unscored].slice(0, TIKTOK_MAX);

        // Dedup on the whole set — if we already covered any of these
        // MAL ids in the last 12h, skip the whole run.
        const allAnimeIds = fullList.map((a) => a.mal_id);
        if (await isDuplicateRecentPost('daily', allAnimeIds, 12 * 3600_000)) {
            console.log('[social/dailyReleases] duplicate skipped');
            return { note: 'duplicate skipped' };
        }

        const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const nextEvening = new Date();
        nextEvening.setHours(20, 0, 0, 0);
        if (nextEvening.getTime() < Date.now()) nextEvening.setDate(nextEvening.getDate() + 1);
        const scheduledAt = nextEvening.getTime();

        // ── Simple case: everything fits in one Insta carousel ────────
        if (fullList.length <= INSTA_CHUNK) {
            const title = `Sorties du jour · ${dateStr}`;
            const { id, slidesCount } = await buildAndCreatePost({
                title,
                list: fullList,
                scheduledAt,
                platforms: { insta: true, tiktok: true, x: false },
                config,
            });
            console.log(`[social/dailyReleases] created pending ${id} (${fullList.length} anime, single post)`);
            await notifyPendingPost(config, { type: 'daily', title, postId: id, slidesCount });
            return { postId: id, note: `${fullList.length} anime(s), 1 post` };
        }

        // ── Busy day: TikTok all-in-one + Instagram parties 1..N ──────
        const chunks = chunk(fullList, INSTA_CHUNK);
        const totalParts = chunks.length;
        const created = [];

        // 1) TikTok-only post with the full list
        {
            const title = `Sorties du jour · ${dateStr}`;
            const { id, slidesCount } = await buildAndCreatePost({
                title,
                list: fullList,
                scheduledAt,
                platforms: { insta: false, tiktok: true, x: false },
                config,
            });
            console.log(`[social/dailyReleases] created TikTok-only pending ${id} (${fullList.length} anime)`);
            await notifyPendingPost(config, { type: 'daily', title: `${title} · TikTok`, postId: id, slidesCount });
            created.push(id);
        }

        // 2) Instagram-only posts, one per chunk
        for (let i = 0; i < chunks.length; i += 1) {
            const partLabel = `Partie ${i + 1}/${totalParts}`;
            const title = `Sorties du jour · ${dateStr} · ${partLabel}`;
            const { id, slidesCount } = await buildAndCreatePost({
                title,
                list: chunks[i],
                scheduledAt,
                platforms: { insta: true, tiktok: false, x: false },
                config,
            });
            console.log(`[social/dailyReleases] created Insta pending ${id} (${partLabel}, ${chunks[i].length} anime)`);
            await notifyPendingPost(config, { type: 'daily', title, postId: id, slidesCount });
            created.push(id);
        }

        return {
            postId: created[0],
            note: `${fullList.length} anime(s), 1 TikTok + ${totalParts} Insta`,
        };
    });
}

exports.runDailyReleases = runDailyReleases;
exports.dailyReleases = onSchedule(
    {
        schedule: '0 10 * * *',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
        memory: '1GiB',
        // Bump timeout because a busy day may render 3-4 posts (each
        // ~30-60s of Puppeteer + Firebase Storage upload).
        timeoutSeconds: 540,
    },
    runDailyReleases,
);
