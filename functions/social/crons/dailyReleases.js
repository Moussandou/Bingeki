/**
 * cron dailyReleases — 1 post carousel avec les épisodes sortis
 * dans la journée. Trigger: 19h Europe/Paris.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchTodaysReleases } = require('../generators/jikan');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost, isDuplicateRecentPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

exports.dailyReleases = onSchedule(
    {
        schedule: '0 19 * * *',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
    },
    async () => {
        const config = await loadBotConfig();
        if (isKilled(config) || !config.schedules?.daily?.enabled) {
            console.log('[social/dailyReleases] skipped — kill-switch or schedule disabled');
            return;
        }

        const releases = await fetchTodaysReleases();
        if (releases.length === 0) {
            console.log('[social/dailyReleases] no releases today');
            return;
        }

        // Cap to the 5 highest-scoring for the post
        const top = releases
            .filter((r) => r.score && r.score > 0)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 5);
        const finalList = top.length > 0 ? top : releases.slice(0, 5);

        const animeIds = finalList.map((a) => a.mal_id);
        if (await isDuplicateRecentPost('daily', animeIds, 12 * 3600_000)) {
            console.log('[social/dailyReleases] duplicate skipped');
            return;
        }

        const { caption, hashtags } = await generateCaption('daily', finalList, config);
        const slides = await renderSlides('daily', finalList, ['feed', 'story']);

        const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const nextEvening = new Date();
        nextEvening.setHours(20, 0, 0, 0);
        if (nextEvening.getTime() < Date.now()) nextEvening.setDate(nextEvening.getDate() + 1);

        const title = `Sorties du jour · ${dateStr}`;
        const id = await createPendingPost({
            type: 'daily',
            scheduledAt: nextEvening.getTime(),
            title,
            caption,
            hashtags,
            slides,
            sourceData: { animeIds },
            platforms: { insta: true, tiktok: true, x: false },
        });
        console.log(`[social/dailyReleases] created pending ${id}`);
        await notifyPendingPost(config, { type: 'daily', title, postId: id, slidesCount: slides.length });
    },
);
