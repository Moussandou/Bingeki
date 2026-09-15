/**
 * generators/jikan.js — wrapper API Jikan/Tenrai (dedup avec le module
 * /schedule existant de Bingeki).
 *
 * Phase 1 stub.
 */

// TODO: reuse or import the existing Jikan client from functions/index.js
// so we don't duplicate the rate limiting and Tenrai fallback logic.

async function fetchTodaysReleases() {
    throw new Error('Not implemented — Phase 2');
}

async function fetchAnimeById(_malId) {
    throw new Error('Not implemented — Phase 2');
}

async function detectNewSeasons() {
    // Poll airing animes, filter to "just started" (ep 1 within last 24h)
    // AND matched against Bingeki users' library (proxy for "expected").
    throw new Error('Not implemented — Phase 2');
}

module.exports = { fetchTodaysReleases, fetchAnimeById, detectNewSeasons };
