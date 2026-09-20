/**
 * cron communityFavorite — TOP 3 des épisodes les mieux notés cette
 * semaine. Sunday 21h Europe/Paris (2h après le récap hebdo).
 *
 * Sources: Trakt.tv (primary — scores landent en quelques heures) puis
 * fallback Jikan/MAL (secondary — utilisé si Trakt n'a rien).
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchWeeklyTopEpisodes, fetchAiringAnime } = require('../generators/jikan');
const { fetchWeeklyTopEpisodesFromTrakt, TRAKT_CLIENT_ID } = require('../generators/trakt');
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

        // Try Trakt first (fresh scores), fall back to MAL.
        let episodes = [];
        let source = 'trakt';
        if (process.env.TRAKT_CLIENT_ID) {
            try {
                const airing = await fetchAiringAnime();
                episodes = await fetchWeeklyTopEpisodesFromTrakt(airing, { limit: 3, days: 7, minVotes: 2 });
                console.log(`[social/communityFavorite] Trakt returned ${episodes.length} episodes`);
            } catch (err) {
                console.warn('[social/communityFavorite] Trakt failed, falling back to MAL:', err.message || err);
            }
        } else {
            console.log('[social/communityFavorite] TRAKT_CLIENT_ID not set, skipping Trakt');
        }

        if (episodes.length === 0) {
            episodes = await fetchWeeklyTopEpisodes(3);
            source = 'mal';
            console.log(`[social/communityFavorite] MAL fallback returned ${episodes.length} episodes`);
        }

        if (episodes.length === 0) {
            console.log('[social/communityFavorite] no scored episodes anywhere');
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
            season: ep.season, // number | null — inferred from the title
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
                source,
            },
            platforms: { insta: true, tiktok: true, x: false },
        });
        console.log(`[social/communityFavorite] created pending ${id} — ${items.length} episodes (source=${source})`);
        await notifyPendingPost(config, { type: 'favorite', title, postId: id, slidesCount: slides.length });
        return { postId: id, note: `top ${items.length} episodes (${source})` };
    });
}

exports.runCommunityFavorite = runCommunityFavorite;
exports.communityFavorite = onSchedule(
    {
        schedule: '0 21 * * 0',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY, TRAKT_CLIENT_ID],
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    runCommunityFavorite,
);
