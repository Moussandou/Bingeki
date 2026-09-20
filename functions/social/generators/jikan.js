/**
 * generators/jikan.js — anime data wrapper.
 *
 * Reuses the existing `functions/jikan.js` client (Tenrai + Jikan
 * fallback, 429 handling) instead of duplicating the source list.
 */

const { jikanFetch } = require('../../jikan');
const { isDuplicateRecentPost } = require('../shared/firestore');

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function normalizeAnime(a) {
    if (!a) return null;
    return {
        mal_id: a.mal_id,
        title: a.title_english || a.title || a.title_japanese,
        cover: a?.images?.jpg?.large_image_url || a?.images?.jpg?.image_url || '',
        studios: (a.studios || []).map((s) => s.name),
        episodes: a.episodes ?? null,
        score: a.score ?? null,
        genres: (a.genres || []).map((g) => g.name),
        broadcast: a.broadcast?.day || null,
        airing: a.airing === true,
        aired_from: a.aired?.from || null,
        source_type: a.type || null, // TV, Movie, ONA…
    };
}

/**
 * Fetch the list of anime broadcasting today (Europe/Paris).
 */
async function fetchTodaysReleases() {
    const day = DAY_NAMES[new Date().getDay()];
    const raw = await jikanFetch(`/schedules?filter=${day}&kids=false&sfw=true`, true);
    const items = raw?.data || [];
    return items
        .map(normalizeAnime)
        .filter((a) => a && a.airing && a.source_type === 'TV');
}

/**
 * Fetch a single anime by its MAL id.
 */
async function fetchAnimeById(malId) {
    const raw = await jikanFetch(`/anime/${malId}`);
    return normalizeAnime(raw);
}

/**
 * Detect anime whose first episode aired within the last 24h AND that
 * look like the start of a new season (title contains "Season 2", "S2",
 * "2nd Season", "Part 2", etc.) OR are the sequel of a known anime.
 *
 * Skips animes already covered by a recent 'newseason' post (dedup).
 */
async function detectNewSeasons() {
    // Poll currently airing animes ordered by start date
    const raw = await jikanFetch('/seasons/now?filter=tv', true);
    const items = (raw?.data || []).map(normalizeAnime).filter(Boolean);

    const oneDayAgo = Date.now() - 24 * 3600_000;
    const seasonPattern = /(season\s*[2-9]|s[2-9]\b|part\s*[2-9]|2nd\s+season|3rd\s+season|4th\s+season)/i;

    const candidates = [];
    for (const anime of items) {
        const aired = anime.aired_from ? new Date(anime.aired_from).getTime() : 0;
        if (!aired || aired < oneDayAgo) continue;

        const looksLikeSequel = seasonPattern.test(anime.title);
        if (!looksLikeSequel) continue;

        // Dedup: skip if we already posted about this anime as a newseason recently
        const isDup = await isDuplicateRecentPost('newseason', [anime.mal_id], 7 * 24 * 3600_000);
        if (isDup) continue;

        candidates.push(anime);
    }

    return candidates;
}

/**
 * Extract the season number from a MAL title string.
 * "Solo Leveling Season 2 Arc" → { cleanTitle: 'Solo Leveling', season: 2 }
 * "Chainsaw Man Part II"        → { cleanTitle: 'Chainsaw Man',  season: 2 }
 * "Frieren"                     → { cleanTitle: 'Frieren',       season: null }
 */
function parseSeasonFromTitle(title) {
    if (!title) return { cleanTitle: title, season: null };
    const roman = { II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    const patterns = [
        /\s+Season\s+(\d+)(?:\s+.*)?$/i,
        /\s+(\d+)(?:st|nd|rd|th)?\s+Season(?:\s+.*)?$/i,
        /\s+S(\d+)$/i,
        /\s+Part\s+(\d+|II|III|IV|V|VI|VII|VIII|IX|X)(?:\s+.*)?$/i,
        /\s+(II|III|IV|V|VI|VII|VIII|IX|X)(?:\s+.*)?$/,
    ];
    for (const p of patterns) {
        const m = title.match(p);
        if (m) {
            const raw = m[1].toUpperCase();
            const num = roman[raw] || parseInt(raw, 10);
            if (!Number.isFinite(num)) continue;
            const cleanTitle = title.replace(p, '').trim();
            return { cleanTitle: cleanTitle || title, season: num };
        }
    }
    return { cleanTitle: title, season: null };
}

/**
 * Fetch every currently-airing TV anime, then for each one grab its
 * episode list from /anime/{id}/episodes and keep the episodes whose
 * air date is within the last 7 days. MAL's per-episode `score` is on
 * a 0-5 scale (different from the /10 overall anime score), so we
 * multiply by 2 to normalise to /10 for consistency with the rest of
 * Bingeki's captions.
 *
 * Warning: this makes ~40-60 Jikan calls (1 per airing show). Only run
 * from a weekly cron, not a daily one.
 */
async function fetchWeeklyTopEpisodes(limit = 3) {
    const raw = await jikanFetch('/seasons/now?filter=tv', true);
    const airing = (raw?.data || []).map(normalizeAnime).filter(Boolean);
    const now = Date.now();

    // Collect every scored recent episode once (up to 21 days), then narrow
    // by increasing windows. MAL publishes episode scores only after enough
    // votes land, so brand-new episodes are often score-less for 1-2 weeks.
    const allRecent = [];
    for (const anime of airing) {
        try {
            const epRaw = await jikanFetch(`/anime/${anime.mal_id}/episodes`);
            const episodes = epRaw?.data || [];
            for (const ep of episodes) {
                if (!ep.aired || !ep.score) continue;
                const airedAt = new Date(ep.aired).getTime();
                if (airedAt > now || airedAt < now - 21 * 24 * 3600_000) continue;

                const { cleanTitle, season } = parseSeasonFromTitle(anime.title);
                allRecent.push({
                    mal_id: anime.mal_id,
                    title: cleanTitle,
                    fullTitle: anime.title,
                    season,
                    cover: anime.cover,
                    episodeNumber: ep.mal_id,
                    episodeTitle: ep.title || '',
                    airedAt: ep.aired,
                    airedAtMs: airedAt,
                    scoreOn5: ep.score,
                    scoreOn10: Number((ep.score * 2).toFixed(2)),
                    filler: !!ep.filler,
                    recap: !!ep.recap,
                });
            }
        } catch (err) {
            console.warn(
                `[social/jikan] episodes fetch failed for ${anime.mal_id} (${anime.title}):`,
                err.message || err,
            );
        }
    }

    const sortByScore = (a, b) => {
        if (b.scoreOn10 !== a.scoreOn10) return b.scoreOn10 - a.scoreOn10;
        if (a.filler !== b.filler) return a.filler ? 1 : -1;
        if (a.recap !== b.recap) return a.recap ? 1 : -1;
        return b.airedAtMs - a.airedAtMs; // fresher wins on tie
    };

    // Cascade windows: prefer the freshest weekly bracket, but fall back
    // wider until we have enough entries. Keeps the "cette semaine"
    // framing accurate whenever possible.
    for (const days of [7, 14, 21]) {
        const cutoff = now - days * 24 * 3600_000;
        const window = allRecent.filter((c) => c.airedAtMs >= cutoff);
        if (window.length >= limit) {
            window.sort(sortByScore);
            return window.slice(0, limit);
        }
    }

    // Nothing in any window: return whatever we got, sorted.
    allRecent.sort(sortByScore);
    return allRecent.slice(0, limit);
}

/**
 * TOP N currently-airing anime on MAL, sorted by score. Used as a
 * fallback for the weekly recap when the Bingeki community hasn't
 * generated enough votes to fill a ranking of its own.
 */
async function fetchSeasonalTopRated(limit = 3) {
    const items = await fetchAiringAnime();
    const scored = items.filter((a) => typeof a.score === 'number' && a.score > 0);
    scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    return scored.slice(0, limit);
}

/**
 * All currently-airing TV anime for the season. Extracted so multiple
 * generators (Jikan episode scan, Trakt episode scan) can share the
 * same base list without hitting `/seasons/now` twice.
 */
async function fetchAiringAnime() {
    const raw = await jikanFetch('/seasons/now?filter=tv', true);
    return (raw?.data || []).map(normalizeAnime).filter(Boolean);
}

module.exports = {
    fetchTodaysReleases,
    fetchAnimeById,
    fetchAiringAnime,
    detectNewSeasons,
    fetchWeeklyTopEpisodes,
    fetchSeasonalTopRated,
    parseSeasonFromTitle,
    normalizeAnime,
};
