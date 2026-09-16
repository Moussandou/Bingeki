/**
 * cron weeklyRecap — TOP 3 de la semaine. Dimanche 19h.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { computeWeeklyTop } = require('../generators/stats');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

exports.weeklyRecap = onSchedule(
    {
        schedule: '0 19 * * 0',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
    },
    async () => {
        const config = await loadBotConfig();
        if (isKilled(config) || !config.schedules?.weekly?.enabled) {
            console.log('[social/weeklyRecap] skipped — kill-switch or schedule disabled');
            return;
        }

        const top3 = await computeWeeklyTop(3);
        if (top3.length === 0) {
            console.log('[social/weeklyRecap] no qualified entries this week');
            return;
        }

        const { caption, hashtags } = await generateCaption('weekly', top3, config);
        const slides = await renderSlides('weekly', top3, ['feed', 'story']);

        // ISO week number (rough)
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((now - startOfYear) / 86_400_000 + startOfYear.getDay() + 1) / 7);

        const scheduledAt = Date.now() + 3600_000; // publish 1h after generation

        const title = `Récap semaine ${weekNumber}`;
        const animes = top3.map((a) => ({
            mal_id: a.mal_id,
            title: a.title,
            cover: a.cover,
            avg: a.avg,
            count: a.count,
        }));
        const id = await createPendingPost({
            type: 'weekly',
            scheduledAt,
            title,
            caption,
            hashtags,
            slides,
            sourceData: { weekNumber, animeIds: top3.map((a) => a.mal_id), animes },
            platforms: { insta: true, tiktok: true, x: false },
        });
        console.log(`[social/weeklyRecap] created pending ${id} — ${top3.length} entries`);
        await notifyPendingPost(config, { type: 'weekly', title, postId: id, slidesCount: slides.length });
    },
);
