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
const { fetchTodaysReleases, fetchLatestEpisodeNumber } = require('../generators/jikan');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost, isDuplicateRecentPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Buffer plafonne les carousels à 10 assets. On a 2 modes selon le
// volume :
//   - ≤ 8 animes : 1 par slide (format premium plein écran)
//     → intro + 8 + outro = 10 max
//   - 9-16 animes : 2 par slide (mode duo)
//     → intro + 8 slides duo + outro = 10 max, 16 animes visibles
// Au-delà de 16 on tronque : très rare (Saturday cap déjà autour de 15-20).
const MAX_ANIMES_PER_DAY = 16;

function normaliseAnime(a) {
    return {
        mal_id: a.mal_id,
        title: a.title,
        cover: a.cover,
        currentEpisode: a.currentEpisode ?? null,
        // Score gardé pour l'affichage duo (chip note à côté du titre).
        score: a.score ?? null,
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

        // Enrichit chaque anime avec son dernier numéro d'épisode diffusé
        // pour afficher "ÉPISODE 12" sur les slides. Sérialisé avec un
        // petit délai pour ne pas déclencher le rate-limit Tenrai (429
        // systématique quand on lance 16 requêtes en parallèle).
        for (const a of list) {
            a.currentEpisode = await fetchLatestEpisodeNumber(a.mal_id).catch(() => null);
            await new Promise((r) => setTimeout(r, 350));
        }

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
