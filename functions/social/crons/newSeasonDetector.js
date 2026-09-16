/**
 * cron newSeasonDetector — event-driven. Poll quotidien à 8h pour
 * détecter les nouvelles saisons qui ont démarré dans les dernières
 * 24h et queue un post d'annonce.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { detectNewSeasons } = require('../generators/jikan');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

exports.newSeasonDetector = onSchedule(
    {
        schedule: '0 8 * * *',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
    },
    async () => {
        const config = await loadBotConfig();
        if (isKilled(config)) {
            console.log('[social/newSeasonDetector] skipped — kill-switch');
            return;
        }

        const candidates = await detectNewSeasons();
        if (candidates.length === 0) {
            console.log('[social/newSeasonDetector] no new season detected today');
            return;
        }

        for (const anime of candidates) {
            try {
                const { caption, hashtags } = await generateCaption('newseason', anime, config);
                const slides = await renderSlides('newseason', anime, ['feed', 'story']);

                const title = `${anime.title} · Announcement`;
                const animesSnapshot = [{
                    mal_id: anime.mal_id,
                    title: anime.title,
                    cover: anime.cover,
                    studios: anime.studios || [],
                    episodes: anime.episodes ?? null,
                    score: anime.score ?? null,
                    airing_from: anime.aired_from ?? null,
                }];
                const id = await createPendingPost({
                    type: 'newseason',
                    scheduledAt: Date.now() + 3600_000,
                    title,
                    caption,
                    hashtags,
                    slides,
                    sourceData: { animeIds: [anime.mal_id], animes: animesSnapshot },
                    platforms: { insta: true, tiktok: true, x: false },
                });
                console.log(`[social/newSeasonDetector] created pending ${id} for ${anime.title}`);
                await notifyPendingPost(config, { type: 'newseason', title, postId: id, slidesCount: slides.length });
            } catch (err) {
                console.error(`[social/newSeasonDetector] failed for ${anime.title}:`, err);
            }
        }
    },
);
