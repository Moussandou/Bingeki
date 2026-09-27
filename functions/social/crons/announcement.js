/**
 * cron announcement — nouvelle saison ANNONCÉE (pas encore diffusée).
 *
 * Fires Mon/Wed/Fri 15h Europe/Paris. Fetches upcoming sequels from MAL
 * via Tenrai, filters TV sequels (S2, S3, Part 2…) we haven't announced
 * yet, then splits the picks in 2 buckets based on hype :
 *
 *   • "Hype" (prequel score ≥ 8.5 OU > 200k votes) → post SOLO au format
 *     3-slide classique (hero + info + outro).
 *   • Autres sequels → bundlés dans un seul post digest (intro + 1
 *     hero-lite par anime + outro).
 *
 * Résultat : 1-2 posts par run au lieu de 3, avec les gros bangers qui
 * gardent leur post dédié pour maximiser le "wow effect" et les sequels
 * moyens regroupés pour éviter le spam de feed.
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
const MAX_PER_RUN = 3;

// Seuils de "hype" : soit une saison précédente très bien notée (>= 8.5),
// soit très populaire (> 200k votes MAL). Un des 2 suffit — un anime peu
// noté mais culte (Bleach par ex.) déclenche le mode solo aussi.
const HYPE_MIN_SCORE = 8.5;
const HYPE_MIN_VOTES = 200_000;

function isHype(prequel) {
    if (!prequel) return false;
    const score = prequel.score ?? 0;
    const votes = prequel.scored_by ?? 0;
    return score >= HYPE_MIN_SCORE || votes >= HYPE_MIN_VOTES;
}

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

async function createSoloPost(enriched, config) {
    const { caption, hashtags } = await generateCaption('announcement', enriched, config);
    const slides = await renderSlides('announcement', enriched, ['feed', 'story']);
    const title = `${enriched.title} · Annonce`;
    const id = await createPendingPost({
        type: 'announcement',
        scheduledAt: Date.now() + 3600_000,
        title,
        caption,
        hashtags,
        slides,
        sourceData: {
            animeIds: [enriched.mal_id],
            animes: [toSourceAnime(enriched)],
        },
        platforms: { insta: true, tiktok: true, x: false },
    });
    return { id, title, slidesCount: slides.length };
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
                enrichedPicks.push({ enriched, prequel, hype: isHype(prequel) });
            } catch (err) {
                console.error(`[social/announcement] enrich failed for ${anime.title}:`, err.message || err);
            }
        }

        const soloPicks = enrichedPicks.filter(p => p.hype);
        const digestPicks = enrichedPicks.filter(p => !p.hype);
        console.log(`[social/announcement] split: ${soloPicks.length} solo (hype), ${digestPicks.length} digest`);

        const created = [];

        // 1) Posts solo pour les hype
        for (const { enriched } of soloPicks) {
            try {
                const info = await createSoloPost(enriched, config);
                await notifyPendingPost(config, { type: 'announcement', title: info.title, postId: info.id, slidesCount: info.slidesCount });
                await markAsAnnounced(enriched.mal_id, { title: enriched.title });
                created.push(info);
                console.log(`[social/announcement] created SOLO pending ${info.id} for ${enriched.title}`);
            } catch (err) {
                console.error(`[social/announcement] solo failed for ${enriched.title}:`, err.message || err);
            }
        }

        // 2) 1 post digest pour tous les autres
        if (digestPicks.length > 0) {
            try {
                const enrichedList = digestPicks.map(p => p.enriched);
                const info = await createDigestPost(enrichedList, config);
                await notifyPendingPost(config, { type: 'announcement_digest', title: info.title, postId: info.id, slidesCount: info.slidesCount });
                for (const { enriched } of digestPicks) {
                    await markAsAnnounced(enriched.mal_id, { title: enriched.title });
                }
                created.push(info);
                console.log(`[social/announcement] created DIGEST pending ${info.id} (${enrichedList.length} animes)`);
            } catch (err) {
                console.error('[social/announcement] digest failed:', err.message || err);
            }
        }

        return {
            postId: created[0]?.id || null,
            note: `${picks.length} announced (${soloPicks.length} solo + ${digestPicks.length} in digest, ${candidates.length - picks.length} deferred)`,
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
