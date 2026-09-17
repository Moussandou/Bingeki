/**
 * cron communityFavorite — coup(s) de cœur communauté. Mercredi 12h.
 * Support 1 à N animes en cas d'égalité.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { computeCommunityFavorites } = require('../generators/stats');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

exports.communityFavorite = onSchedule(
    {
        // Sunday 21h Europe/Paris — 2h after the weekly recap, so the
        // TOP 3 and the community favorite feel like a coordinated
        // Sunday evening drop rather than two disconnected slots.
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

        const favorites = await computeCommunityFavorites();
        if (favorites.length === 0) {
            console.log('[social/communityFavorite] no qualified entries this week');
            return;
        }

        const { caption, hashtags } = await generateCaption('favorite', favorites, config);
        const slides = await renderSlides('favorite', favorites, ['feed', 'story']);

        const title = favorites.length > 1
            ? `${favorites.length} coups de cœur ex æquo`
            : `Coup de cœur · ${favorites[0].title}`;

        const animes = favorites.map((a) => ({
            mal_id: a.mal_id,
            title: a.title,
            cover: a.cover,
            avg: a.avg,
            count: a.count,
        }));
        const id = await createPendingPost({
            type: 'favorite',
            scheduledAt: Date.now() + 3600_000,
            title,
            caption,
            hashtags,
            slides,
            sourceData: { animeIds: favorites.map((a) => a.mal_id), animes },
            platforms: { insta: true, tiktok: true, x: false },
        });
        console.log(`[social/communityFavorite] created pending ${id} — ${favorites.length} winners`);
        await notifyPendingPost(config, { type: 'favorite', title, postId: id, slidesCount: slides.length });
    },
);
