/**
 * cron cultureNews — post "actu culture anime" créé manuellement depuis
 * AdminSocial. Pas de schedule auto : l'admin déclenche à la demande.
 *
 * Cadence cible : 1-2 posts/semaine, en complément du daily/annonces.
 * Sujets : jeux, films live-action, goodies, industrie, événements —
 * tout ce qui touche l'univers anime hors sortie d'épisode.
 */

const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');
const { withCronHealth } = require('../shared/cronHealth');
const { CULTURE_CATEGORIES } = require('../generators/templates');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const VALID_CATEGORIES = new Set(Object.keys(CULTURE_CATEGORIES));

/**
 * @param {Object} params
 * @param {'game'|'movie'|'goodies'|'industry'|'event'|'other'} params.category
 * @param {string} params.title
 * @param {string} [params.description]
 * @param {string} params.imageUrl - déjà hébergée sur Firebase Storage
 * @param {string} [params.source]
 */
async function runCultureNews({ category, title, description = '', imageUrl, source = '' } = {}) {
    return withCronHealth('cultureNews', async () => {
        const config = await loadBotConfig();
        if (isKilled(config)) {
            console.log('[social/cultureNews] skipped — kill-switch');
            return { note: 'skipped: kill-switch' };
        }
        if (!VALID_CATEGORIES.has(category)) {
            throw new Error(`invalid category: ${category}`);
        }
        if (!title || !imageUrl) {
            throw new Error('title and imageUrl are required');
        }

        const data = {
            category,
            title: String(title).trim().slice(0, 140),
            description: String(description || '').trim().slice(0, 260),
            imageUrl: String(imageUrl).trim(),
            source: String(source || '').trim().slice(0, 60),
        };

        const catLabel = CULTURE_CATEGORIES[category].label;
        const postTitle = `${catLabel} · ${data.title.slice(0, 60)}`;

        // Publication programmée : le soir même à 19h si on est avant,
        // sinon lendemain 12h.
        const now = new Date();
        const evening = new Date(now);
        evening.setHours(19, 0, 0, 0);
        const scheduledAt = evening.getTime() > now.getTime()
            ? evening.getTime()
            : (() => { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); return d.getTime(); })();

        const { caption, hashtags } = await generateCaption('culture_news', data, config);
        const slides = await renderSlides('culture_news', data, ['feed', 'story']);

        const id = await createPendingPost({
            type: 'culture_news',
            scheduledAt,
            title: postTitle,
            caption,
            hashtags,
            slides,
            sourceData: data,
            platforms: { insta: true, tiktok: true, x: false },
        });

        console.log(`[social/cultureNews] created pending ${id} (category=${category}, title="${data.title.slice(0, 60)}")`);
        await notifyPendingPost(config, { type: 'culture_news', title: postTitle, postId: id, slidesCount: slides.length });
        return { postId: id, note: `culture_news · ${category} · ${slides.length} slides` };
    });
}

exports.runCultureNews = runCultureNews;
exports.GEMINI_API_KEY = GEMINI_API_KEY;
