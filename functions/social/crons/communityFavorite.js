/**
 * cron communityFavorite — TOP 3 des épisodes les mieux notés sur MAL
 * cette semaine (ou dans les ~21 derniers jours en fallback quand MAL
 * n'a pas encore de scores pour la semaine en cours). Sunday 21h.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchWeeklyTopEpisodes } = require('../generators/jikan');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost, isDuplicateRecentPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

async function runCommunityFavorite() {
    return withCronHealth('communityFavorite', async () => {
        const config = await loadBotConfig();
        if (isKilled(config) || !config.schedules?.favorite?.enabled) {
            console.log('[social/communityFavorite] skipped — kill-switch or schedule disabled');
            return { note: 'skipped: kill-switch or schedule disabled' };
        }

        const episodes = await fetchWeeklyTopEpisodes(3);
        if (episodes.length === 0) {
            console.log('[social/communityFavorite] no scored episodes in the last 21 days');
            return { note: 'no scored episodes' };
        }

        // Data shape reused by generator/templates: each entry has
        // title + cover + a `count`-like scalar for the metrics chip.
        const items = episodes.map((ep) => ({
            mal_id: ep.mal_id,
            title: ep.title,
            cover: ep.cover,
            avg: ep.scoreOn10,
            count: ep.episodeNumber,
            episodeNumber: ep.episodeNumber,
            episodeTitle: ep.episodeTitle,
            season: ep.season, // number | null — inferred from the MAL title
        }));

        // Dedup: avoid double post on Cloud Functions retry.
        const animeIds = items.map((a) => a.mal_id);
        if (await isDuplicateRecentPost('favorite', animeIds, 3 * 24 * 3600_000)) {
            console.log('[social/communityFavorite] duplicate skipped');
            return { note: 'duplicate skipped' };
        }

        const { caption, hashtags } = await generateCaption('favorite', items, config);
        const slides = await renderSlides('favorite', items, ['feed', 'story']);

        const title = `TOP 3 épisodes · Semaine`;

        const id = await createPendingPost({
            type: 'favorite',
            scheduledAt: Date.now() + 3600_000,
            title,
            caption,
            hashtags,
            slides,
            sourceData: {
                animeIds,
                animes: items,
            },
            platforms: { insta: true, tiktok: true, x: false },
        });
        console.log(`[social/communityFavorite] created pending ${id} — ${items.length} episodes`);
        await notifyPendingPost(config, { type: 'favorite', title, postId: id, slidesCount: slides.length });
        return { postId: id, note: `top ${items.length} episodes` };
    });
}

exports.runCommunityFavorite = runCommunityFavorite;
exports.communityFavorite = onSchedule(
    {
        schedule: '0 21 * * 0',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    runCommunityFavorite,
);
