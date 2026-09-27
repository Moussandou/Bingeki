/**
 * cron dailyReleases — 1 post carousel avec les épisodes sortis
 * dans la journée. Trigger: 10h Europe/Paris.
 *
 * Cap: top 8 par note MAL (les mieux notés d'abord, puis les
 * anime sans score en remplissage). Un seul post par jour, jamais
 * splitté — Buffer plafonne les carousels à 10 assets (intro + 8
 * animes + outro = 10), ce qui colle pile avec la limite.
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

// Buffer plafonne les carousels à 10 assets (intro + 8 animes + outro).
const MAX_ANIMES_PER_DAY = 8;

function normaliseAnime(a) {
    return {
        mal_id: a.mal_id,
        title: a.title,
        cover: a.cover,
        currentEpisode: a.currentEpisode ?? null,
    };
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
        // anime sans score en remplissage (nouveaux, niches). Top 8.
        const scored = releases
            .filter((r) => r.score && r.score > 0)
            .sort((a, b) => (b.score || 0) - (a.score || 0));
        const unscored = releases.filter((r) => !r.score || r.score <= 0);
        const list = [...scored, ...unscored].slice(0, MAX_ANIMES_PER_DAY);

        // Dedup : si on a déjà couvert n'importe lequel de ces MAL ids
        // dans les 12 dernières heures, on saute le run.
        const animeIds = list.map((a) => a.mal_id);
        if (await isDuplicateRecentPost('daily', animeIds, 12 * 3600_000)) {
            console.log('[social/dailyReleases] duplicate skipped');
            return { note: 'duplicate skipped' };
        }

        const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const nextEvening = new Date();
        nextEvening.setHours(20, 0, 0, 0);
        if (nextEvening.getTime() < Date.now()) nextEvening.setDate(nextEvening.getDate() + 1);
        const scheduledAt = nextEvening.getTime();

        const { caption, hashtags } = await generateCaption('daily', list, config);
        const slides = await renderSlides('daily', list, ['feed', 'story']);
        const title = `Sorties du jour · ${dateStr}`;
        const animes = list.map(normaliseAnime);

        const id = await createPendingPost({
            type: 'daily',
            scheduledAt,
            title,
            caption,
            hashtags,
            slides,
            sourceData: { animeIds, animes },
            platforms: { insta: true, tiktok: true, x: false },
        });

        console.log(`[social/dailyReleases] created pending ${id} (${list.length}/${releases.length} anime, top-scored)`);
        await notifyPendingPost(config, { type: 'daily', title, postId: id, slidesCount: slides.length });
        return {
            postId: id,
            note: `${list.length}/${releases.length} anime(s), 1 post`,
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
        timeoutSeconds: 300,
    },
    runDailyReleases,
);
