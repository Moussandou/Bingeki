/**
 * cron announcement — nouvelle saison ANNONCÉE (pas encore diffusée).
 *
 * Fires Mon/Wed/Fri 15h Europe/Paris. Fetches upcoming sequels from MAL
 * via Tenrai, filters TV sequels (S2, S3, Part 2…) we haven't announced
 * yet, puis les regroupe TOUS dans UN SEUL post digest au format dense
 * (4 annonces par slide, jusqu'à 20 annonces en 6 slides).
 *
 * Pas de split solo/digest : trop de posts individuels finissaient par
 * saturer la queue admin. Un gros post regroupé = 1 seul truc à valider.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { loadBotConfig, isKilled } = require('../shared/config');
const { fetchUpcomingSeasons, fetchAnimeById, fetchPrequelChain, parseSeasonFromTitle } = require('../generators/jikan');
const { generateCaption } = require('../generators/gemini');
const { renderSlides } = require('../generators/renderer');
const { createPendingPost, hasBeenAnnounced, markAsAnnounced } = require('../shared/firestore');
const { notifyPendingPost } = require('../shared/discord');
const { withCronHealth } = require('../shared/cronHealth');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
// Cap large pour que jusqu'à 20 annonces tiennent dans un digest dense
// (intro + 5 slides × 4 annonces = 6 slides).
const MAX_PER_RUN = 20;

/**
 * Récupère détail complet + prequel pour un anime candidat.
 * Retourne { enriched, prequel } où `enriched` combine /seasons/upcoming
 * (léger) + /anime/{id} (détail) + prequel meta.
 */
async function enrichCandidate(anime) {
    const detail = await fetchAnimeById(anime.mal_id).catch(() => null);
    const full = { ...anime, ...(detail || {}) };
    const prequel = await fetchPrequelChain(anime.mal_id).catch(() => null);

    let prequelSeasonLabel = null;
    if (prequel?.title) {
        const { season: prevSeasonNum } = parseSeasonFromTitle(prequel.title);
        prequelSeasonLabel = `Saison ${prevSeasonNum || 1}`;
    }

    const enriched = {
        ...full,
        prequel_title: prequel?.title || null,
        prequel_season_label: prequelSeasonLabel,
        prequel_score: prequel?.score ?? null,
        prequel_scored_by: prequel?.scored_by ?? null,
    };
    return { enriched, prequel };
}

function toSourceAnime(enriched) {
    return {
        mal_id: enriched.mal_id,
        title: enriched.title,
        cover: enriched.cover,
        studios: enriched.studios || [],
        episodes: enriched.episodes ?? null,
        score: enriched.score ?? null,
        source_type: enriched.source_type ?? null, // TV, Movie…
        source: enriched.source ?? null,           // Manga, Original…
        genres: enriched.genres || [],
        themes: enriched.themes || [],
        demographics: enriched.demographics || [],
        rating: enriched.rating ?? null,
        aired_from: enriched.aired_from ?? null,
        aired_string: enriched.aired_string ?? null,
        season: enriched.season ?? null,
        year: enriched.year ?? null,
        prequel_title: enriched.prequel_title,
        prequel_season_label: enriched.prequel_season_label,
        prequel_score: enriched.prequel_score,
        prequel_scored_by: enriched.prequel_scored_by,
    };
}

async function createDigestPost(enrichedList, config) {
    const items = enrichedList.map(toSourceAnime);
    // Gemini digest caption : type spécifique pour un prompt adapté (liste
    // de N annonces). generateCaption gère 'announcement_digest' via un
    // prompt dédié — si Gemini plante, fallbackCaption le prend en charge.
    const { caption, hashtags } = await generateCaption('announcement_digest', { animes: items }, config);
    const slides = await renderSlides('announcement_digest', { animes: items }, ['feed', 'story']);
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const title = `Prochainement · ${items.length} annonces · ${dateStr}`;
    const id = await createPendingPost({
        type: 'announcement_digest',
        scheduledAt: Date.now() + 3600_000,
        title,
        caption,
        hashtags,
        slides,
        sourceData: {
            animeIds: items.map(a => a.mal_id),
            animes: items,
        },
        platforms: { insta: true, tiktok: true, x: false },
    });
    return { id, title, slidesCount: slides.length };
}

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

        // Enrichit + split hype/digest les MAX_PER_RUN premiers.
        const picks = candidates.slice(0, MAX_PER_RUN);
        const enrichedPicks = [];
        for (const anime of picks) {
            try {
                const { enriched, prequel } = await enrichCandidate(anime);
                enrichedPicks.push({ enriched, prequel });
            } catch (err) {
                console.error(`[social/announcement] enrich failed for ${anime.title}:`, err.message || err);
            }
        }

        if (enrichedPicks.length === 0) {
            console.log('[social/announcement] no enriched picks after fetch');
            return { note: 'no enriched picks' };
        }

        // Un seul post digest par run avec tout dedans — plus de split
        // solo/hype pour éviter d'encombrer la queue admin.
        const enrichedList = enrichedPicks.map(p => p.enriched);
        let created = null;
        try {
            created = await createDigestPost(enrichedList, config);
            await notifyPendingPost(config, {
                type: 'announcement_digest',
                title: created.title,
                postId: created.id,
                slidesCount: created.slidesCount,
            });
            for (const enriched of enrichedList) {
                await markAsAnnounced(enriched.mal_id, { title: enriched.title });
            }
            console.log(`[social/announcement] created DIGEST pending ${created.id} (${enrichedList.length} animes)`);
        } catch (err) {
            console.error('[social/announcement] digest failed:', err.message || err);
            throw err;
        }

        return {
            postId: created.id,
            note: `${enrichedList.length} annonces dans 1 digest (${candidates.length - picks.length} en attente pour le prochain run)`,
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
