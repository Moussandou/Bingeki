/**
 * cron announcement — nouvelle saison ANNONCÉE (pas encore diffusée).
 *
 * Fires Mon/Wed/Fri 15h Europe/Paris. Fetches upcoming anime from MAL
 * via Jikan/Tenrai, filters for TV sequels (S2, S3, Part 2…) we haven't
 * announced yet, and creates up to 3 pending posts per run to avoid
 * flooding the queue when many announcements land at once.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchUpcomingSeasons, parseSeasonFromTitle } = require('../generators/jikan');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost, hasBeenAnnounced, markAsAnnounced } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const MAX_PER_RUN = 3;

async function runAnnouncement() {
    return withCronHealth('announcement', async () => {
        const config = await loadBotConfig();
        if (isKilled(config)) {
            console.log('[social/announcement] skipped — kill-switch');
            return { note: 'skipped: kill-switch' };
        }

        const upcoming = await fetchUpcomingSeasons();
        if (upcoming.length === 0) {
            console.log('[social/announcement] no upcoming anime returned');
            return { note: 'no upcoming anime' };
        }

        // Filter: sequels only (S2, S3, Part 2…) not yet announced.
        const candidates = [];
        for (const anime of upcoming) {
            const { season } = parseSeasonFromTitle(anime.title);
            if (!season || season < 2) continue;
            if (await hasBeenAnnounced(anime.mal_id)) continue;
            candidates.push(anime);
        }

        if (candidates.length === 0) {
            console.log('[social/announcement] no new sequel announcements');
            return { note: 'no new sequels' };
        }

        const picks = candidates.slice(0, MAX_PER_RUN);
        let lastPostId = null;
        for (const anime of picks) {
            try {
                const { caption, hashtags } = await generateCaption('announcement', anime, config);
                const slides = await renderSlides('announcement', anime, ['feed', 'story']);
                const title = `${anime.title} · Annonce`;
                const id = await createPendingPost({
                    type: 'announcement',
                    scheduledAt: Date.now() + 3600_000,
                    title,
                    caption,
                    hashtags,
                    slides,
                    sourceData: {
                        animeIds: [anime.mal_id],
                        animes: [{
                            mal_id: anime.mal_id,
                            title: anime.title,
                            cover: anime.cover,
                            studios: anime.studios || [],
                            episodes: anime.episodes ?? null,
                            score: anime.score ?? null,
                            aired_from: anime.aired_from ?? null,
                        }],
                    },
                    platforms: { insta: true, tiktok: true, x: false },
                });
                await notifyPendingPost(config, { type: 'announcement', title, postId: id, slidesCount: slides.length });
                await markAsAnnounced(anime.mal_id, { title: anime.title });
                lastPostId = id;
                console.log(`[social/announcement] created pending ${id} for ${anime.title}`);
            } catch (err) {
                console.error(`[social/announcement] failed for ${anime.title}:`, err.message || err);
            }
        }

        return {
            postId: lastPostId,
            note: `${picks.length} announced (${candidates.length - picks.length} deferred)`,
        };
    });
}

exports.runAnnouncement = runAnnouncement;
exports.announcement = onSchedule(
    {
        // Monday / Wednesday / Friday 15h Europe/Paris
        schedule: '0 15 * * 1,3,5',
        timeZone: 'Europe/Paris',
        retryCount: 1,
        secrets: [GEMINI_API_KEY],
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    runAnnouncement,
);
