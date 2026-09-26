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
const { fetchUpcomingSeasons, fetchAnimeById, fetchPrequelChain, parseSeasonFromTitle } = require('../generators/jikan');
const { generateCaption, translateSynopsisPair } = require('../generators/gemini');
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
                // /seasons/upcoming returns a lighter record — refetch by id
                // to get synopsis, aired_string, season/year. Falls back to
                // the upcoming record if the detail call fails.
                const detail = await fetchAnimeById(anime.mal_id).catch(() => null);
                const full = { ...anime, ...(detail || {}) };

                // Walk the /relations Prequel chain to find the last season
                // that has a real MAL score/synopsis — used to display "Note
                // S2: 8.4 ★" and, when the sequel entry has only a stub
                // synopsis ("Third season of X."), to borrow the prequel's.
                const prequel = await fetchPrequelChain(anime.mal_id).catch(() => null);

                // Derive the exact previous-season number from the prequel
                // title so the synopsis source tag reads "SYNOPSIS SAISON 2"
                // (or 1 for a base entry with no suffix) instead of a vague
                // "saison précédente" — user feedback: be specific.
                let prequelSeasonLabel = null;
                if (prequel?.title) {
                    const { season: prevSeasonNum } = parseSeasonFromTitle(prequel.title);
                    // No suffix means the base entry, i.e. season 1.
                    prequelSeasonLabel = `Saison ${prevSeasonNum || 1}`;
                }

                // MAL/Tenrai synopses are English-only. One batched Gemini
                // call translates both the sequel's own synopsis AND the
                // prequel fallback in a single request — halves the quota
                // vs two calls, which matters at the 15 RPM free tier.
                const wantSeq = (full.synopsis || '').length >= 100;
                const wantPrev = (prequel?.synopsis || '').length >= 100;
                let translatedSynopsis = full.synopsis || null;
                let translatedPrequelSynopsis = prequel?.synopsis || null;
                if (wantSeq || wantPrev) {
                    const pair = await translateSynopsisPair(
                        wantSeq ? full.synopsis : '',
                        wantPrev ? prequel.synopsis : '',
                        config,
                    ).catch(() => ({ sequel: null, prequel: null }));
                    if (pair.sequel) translatedSynopsis = pair.sequel;
                    if (pair.prequel) translatedPrequelSynopsis = pair.prequel;
                }

                const enriched = {
                    ...full,
                    synopsis: translatedSynopsis,
                    prequel_title: prequel?.title || null,
                    prequel_season_label: prequelSeasonLabel,
                    prequel_score: prequel?.score ?? null,
                    prequel_scored_by: prequel?.scored_by ?? null,
                    prequel_synopsis: translatedPrequelSynopsis,
                };

                const { caption, hashtags } = await generateCaption('announcement', enriched, config);
                const slides = await renderSlides('announcement', enriched, ['feed', 'story']);
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
                            mal_id: enriched.mal_id,
                            title: enriched.title,
                            cover: enriched.cover,
                            studios: enriched.studios || [],
                            episodes: enriched.episodes ?? null,
                            score: enriched.score ?? null,
                            synopsis: enriched.synopsis || '',
                            aired_from: enriched.aired_from ?? null,
                            aired_string: enriched.aired_string ?? null,
                            season: enriched.season ?? null,
                            year: enriched.year ?? null,
                            prequel_title: enriched.prequel_title,
                            prequel_season_label: enriched.prequel_season_label,
                            prequel_score: enriched.prequel_score,
                            prequel_scored_by: enriched.prequel_scored_by,
                            prequel_synopsis: enriched.prequel_synopsis,
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
