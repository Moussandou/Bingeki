/**
 * generators/trakt.js — Trakt.tv API wrapper for episode ratings.
 *
 * Trakt lets us pull weekly episode scores faster than MAL: viewers rate
 * as they watch, so scores land within hours, not the 1-2 weeks MAL
 * needs to accumulate a public rating.
 *
 * Auth model: read-only endpoints just need the `trakt-api-key` client
 * ID header. Rate limit is 1000 GET/5min (unauth), plenty for the
 * weekly cron.
 *
 * ID pivot: airing shows come from Jikan (MAL id source of truth). We
 * cache the MAL → Trakt id resolution in Firestore so we don't spam
 * /search/mal on every run.
 */

const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const { parseSeasonFromTitle } = require('./jikan');

const TRAKT_CLIENT_ID = defineSecret('TRAKT_CLIENT_ID');
const TRAKT_BASE = 'https://api.trakt.tv';
const MAP_COLLECTION = 'social_trakt_ids';
const WEEK_MS = 7 * 24 * 3600_000;

function traktHeaders() {
    const key = process.env.TRAKT_CLIENT_ID;
    if (!key) throw new Error('TRAKT_CLIENT_ID not configured');
    return {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': key,
    };
}

async function traktFetch(path) {
    const res = await fetch(`${TRAKT_BASE}${path}`, {
        method: 'GET',
        headers: traktHeaders(),
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Trakt ${res.status} on ${path}: ${body.slice(0, 200)}`);
    }
    return res.json();
}

/**
 * Resolve a MAL show id → Trakt show slug (cached in Firestore).
 * Returns null when Trakt has no entry for that MAL id.
 */
async function resolveMalToTrakt(malId) {
    const db = admin.firestore();
    const ref = db.collection(MAP_COLLECTION).doc(String(malId));
    const cached = await ref.get();
    if (cached.exists) {
        const data = cached.data();
        return data.slug || null;
    }

    let slug = null;
    try {
        const results = await traktFetch(`/search/mal/${malId}?type=show`);
        const match = (results || []).find((r) => r?.show?.ids?.slug);
        slug = match?.show?.ids?.slug || null;
    } catch (err) {
        console.warn(`[social/trakt] mal→trakt search failed for ${malId}:`, err.message || err);
    }
    // Cache even the null result so we don't retry every week for missing entries.
    await ref.set({ slug, resolvedAt: Date.now() }, { merge: true });
    return slug;
}

/**
 * Fetch all episodes of a Trakt show with their ratings.
 * Uses `?extended=full,episodes` on /seasons to avoid N per-episode calls.
 */
async function fetchTraktEpisodesWithRatings(slug) {
    try {
        const seasons = await traktFetch(`/shows/${slug}/seasons?extended=full,episodes`);
        const episodes = [];
        for (const s of seasons || []) {
            if (s.number === 0) continue; // skip specials
            for (const ep of s.episodes || []) {
                episodes.push({
                    season: s.number,
                    number: ep.number,
                    title: ep.title || '',
                    first_aired: ep.first_aired || null,
                    rating: typeof ep.rating === 'number' ? ep.rating : null,
                    votes: typeof ep.votes === 'number' ? ep.votes : 0,
                });
            }
        }
        return episodes;
    } catch (err) {
        console.warn(`[social/trakt] episodes fetch failed for ${slug}:`, err.message || err);
        return [];
    }
}

/**
 * TOP N episodes across all currently-airing shows for the last N days.
 * Requires the caller to pass the list of airing anime (from Jikan) so
 * we don't duplicate the seasonal fetch.
 *
 * Episode requires: aired within window, has a rating, min votes to
 * avoid picking noisy top-of-1-vote outliers.
 */
async function fetchWeeklyTopEpisodesFromTrakt(airing, { limit = 3, days = 7, minVotes = 2 } = {}) {
    const now = Date.now();
    const cutoff = now - days * 24 * 3600_000;
    const candidates = [];

    for (const anime of airing) {
        const slug = await resolveMalToTrakt(anime.mal_id);
        if (!slug) continue;
        const eps = await fetchTraktEpisodesWithRatings(slug);
        for (const ep of eps) {
            if (!ep.first_aired || !ep.rating) continue;
            const airedAt = new Date(ep.first_aired).getTime();
            if (airedAt < cutoff || airedAt > now) continue;
            if (ep.votes < minVotes) continue;

            const { cleanTitle, season } = parseSeasonFromTitle(anime.title);
            candidates.push({
                mal_id: anime.mal_id,
                title: cleanTitle,
                fullTitle: anime.title,
                season: season || ep.season,
                cover: anime.cover,
                episodeNumber: ep.number,
                episodeTitle: ep.title,
                airedAt: ep.first_aired,
                scoreOn10: Number(ep.rating.toFixed(2)),
                traktVotes: ep.votes,
                filler: false,
                recap: false,
            });
        }
    }

    candidates.sort((a, b) => {
        if (b.scoreOn10 !== a.scoreOn10) return b.scoreOn10 - a.scoreOn10;
        return (b.traktVotes || 0) - (a.traktVotes || 0);
    });
    return candidates.slice(0, limit);
}

module.exports = {
    TRAKT_CLIENT_ID,
    fetchWeeklyTopEpisodesFromTrakt,
    resolveMalToTrakt,
};
