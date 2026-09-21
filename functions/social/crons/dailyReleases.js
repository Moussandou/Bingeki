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
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

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

        // Cap at 8 animes — Instagram carousel accepte 10 slides max
        // (intro + 8 animes + outro). On garde les mieux notés en tête,
        // et on tombe sur le simple top-N par ordre reçu quand aucun
        // score MAL n'est encore disponible.
        const MAX_ANIMES = 8;
        const top = releases
            .filter((r) => r.score && r.score > 0)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, MAX_ANIMES);
        const finalList = top.length > 0 ? top : releases.slice(0, MAX_ANIMES);

        const animeIds = finalList.map((a) => a.mal_id);
        if (await isDuplicateRecentPost('daily', animeIds, 12 * 3600_000)) {
            console.log('[social/dailyReleases] duplicate skipped');
            return { note: 'duplicate skipped' };
        }

        const { caption, hashtags } = await generateCaption('daily', finalList, config);
        const slides = await renderSlides('daily', finalList, ['feed', 'story']);

        const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const nextEvening = new Date();
        nextEvening.setHours(20, 0, 0, 0);
        if (nextEvening.getTime() < Date.now()) nextEvening.setDate(nextEvening.getDate() + 1);

        const title = `Sorties du jour · ${dateStr}`;
        const animes = finalList.map((a) => ({
            mal_id: a.mal_id,
            title: a.title,
            cover: a.cover,
            currentEpisode: a.currentEpisode ?? null,
        }));
        const id = await createPendingPost({
            type: 'daily',
            scheduledAt: nextEvening.getTime(),
            title,
            caption,
            hashtags,
            slides,
            sourceData: { animeIds, animes },
            platforms: { insta: true, tiktok: true, x: false },
        });
        console.log(`[social/dailyReleases] created pending ${id}`);
        await notifyPendingPost(config, { type: 'daily', title, postId: id, slidesCount: slides.length });
        return { postId: id, note: `${finalList.length} anime(s)` };
    });
}

exports.runDailyReleases = runDailyReleases;
exports.dailyReleases = onSchedule(
    {
        // 10h Europe/Paris — post publié en matinée pour que la commu
        // sache dès son café ce qui sort dans la journée + à quelle heure.
        schedule: '0 10 * * *',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
        // Puppeteer + @sparticuz/chromium routinely need >256 MiB just
        // to boot the headless browser. Give the render enough headroom.
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    runDailyReleases,
);
