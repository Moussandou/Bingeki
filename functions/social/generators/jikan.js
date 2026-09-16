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

module.exports = {
    fetchTodaysReleases,
    fetchAnimeById,
    detectNewSeasons,
    normalizeAnime,
};
