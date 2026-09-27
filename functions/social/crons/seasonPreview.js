/**
 * cron seasonPreview — post carousel "preview de saison".
 *
 * Déclenché manuellement depuis AdminSocial (pas de schedule auto).
 * Un post par saison : hero + jusqu'à 6 slides de 4 animes, source
 * AniList (dates fiables, sequels détectés, films marqués).
 */

const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchAniListSeasonPreview } = require('../generators/anilist');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Buffer plafonne les carousels à 10 assets. Intro + 6 slides de 4
// animes = 7 slides pour 24 animes visibles. Marge pour un outro
// éventuel plus tard.
const MAX_ANIMES = 24;

const SEASON_TO_FR = {
    WINTER: { fr: 'Hiver', title: 'HIVER' },
    SPRING: { fr: 'Printemps', title: 'PRINTEMPS' },
    SUMMER: { fr: 'Été', title: 'ÉTÉ' },
    FALL: { fr: 'Automne', title: 'AUTOMNE' },
};

function captionFor(seasonLabelFr, year, count) {
    return [
        `${count} animes attendus pour l'${seasonLabelFr.toLowerCase() === 'été' ? '' : ''}${seasonLabelFr.toLowerCase()} ${year} — dates, films, suites.`,
        '',
        'Ajoute-les à ta watchlist sur Bingeki avant qu\'ils ne sortent :',
        'https://bingeki.web.app',
    ].join('\n');
}

/**
 * @param {Object} params
 * @param {'WINTER'|'SPRING'|'SUMMER'|'FALL'} params.season
 * @param {number} params.year
 * @param {number} [params.limit=20]
 */
async function runSeasonPreview({ season, year, limit = 20 } = {}) {
    return withCronHealth('seasonPreview', async () => {
        const config = await loadBotConfig();
        if (isKilled(config)) {
            console.log('[social/seasonPreview] skipped — kill-switch');
            return { note: 'skipped: kill-switch' };
        }
        if (!season || !year) {
            throw new Error('season and year are required');
        }
        const meta = SEASON_TO_FR[season];
        if (!meta) throw new Error(`Unknown season: ${season}`);

        const cappedLimit = Math.min(limit, MAX_ANIMES);
        const animes = await fetchAniListSeasonPreview({ season, year, limit: cappedLimit });
        if (animes.length === 0) {
            console.log('[social/seasonPreview] no animes returned from AniList');
            return { note: 'no animes found' };
        }

        const data = {
            animes,
            seasonLabelFr: meta.fr,
            titleWord1: meta.title,
            titleWord2: '',
            year,
        };

        const nextEvening = new Date();
        nextEvening.setHours(19, 0, 0, 0);
        if (nextEvening.getTime() < Date.now()) nextEvening.setDate(nextEvening.getDate() + 1);
        const scheduledAt = nextEvening.getTime();

        const title = `Preview · ${meta.fr} ${year}`;
        const caption = captionFor(meta.fr, year, animes.length);
        const hashtags = ['#anime', '#animefr', `#${meta.title.toLowerCase()}${year}`, '#bingeki'];
        const slides = await renderSlides('season_preview', data, ['feed', 'story']);

        const id = await createPendingPost({
            type: 'season_preview',
            scheduledAt,
            title,
            caption,
            hashtags,
            slides,
            sourceData: data,
            platforms: { insta: true, tiktok: true, x: false },
        });

        console.log(`[social/seasonPreview] created pending ${id} (${animes.length} animes, ${slides.length} slides)`);
        await notifyPendingPost(config, { type: 'season_preview', title, postId: id, slidesCount: slides.length });
        return { postId: id, note: `${animes.length} animes, ${slides.length} slides` };
    });
}

exports.runSeasonPreview = runSeasonPreview;
exports.GEMINI_API_KEY = GEMINI_API_KEY;
