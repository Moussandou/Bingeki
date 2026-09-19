/**
 * cron communityFavorite — TOP 3 des épisodes de la semaine les mieux
 * notés sur MAL. Sunday 21h Europe/Paris (2h après le récap hebdo).
 *
 * Data source : Jikan /anime/{id}/episodes → note MAL individuelle par
 * épisode (échelle 0-5, on multiplie par 2 pour afficher /10 en cohérence
 * avec les autres posts Bingeki).
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchWeeklyTopEpisodes } = require('../generators/jikan');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

exports.communityFavorite = onSchedule(
    {
        schedule: '0 21 * * 0',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    async () => {
        const config = await loadBotConfig();
        if (isKilled(config) || !config.schedules?.favorite?.enabled) {
            console.log('[social/communityFavorite] skipped — kill-switch or schedule disabled');
            return;
        }

        const episodes = await fetchWeeklyTopEpisodes(3);
        if (episodes.length === 0) {
            console.log('[social/communityFavorite] no scored episodes found in the last 7 days');
            return;
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
                animeIds: items.map((a) => a.mal_id),
                animes: items,
            },
            platforms: { insta: true, tiktok: true, x: false },
        });
        console.log(`[social/communityFavorite] created pending ${id} — ${items.length} episodes`);
        await notifyPendingPost(config, { type: 'favorite', title, postId: id, slidesCount: slides.length });
    },
);
