/**
 * generators/stats.js — Bingeki users stats (top of the week, community favorites).
 *
 * Scans user libraries (users/{uid}/data/library) filtered on the last
 * 7 days of activity. At the current user scale (< 1000 users) a full
 * scan is fine for a weekly cron; if we grow to 10k+ users we'll want
 * to move to an aggregation collection maintained by an onWrite trigger.
 */

const admin = require('firebase-admin');
const { fetchAnimeById } = require('./jikan');

const WEEK_MS = 7 * 24 * 3600_000;
const MAX_USERS = 500; // safety cap
const MIN_VOTES_TO_QUALIFY = 3; // needs at least 3 users to enter the ranking

/**
 * Aggregate ratings across all user libraries for the last 7 days.
 * @returns {Promise<Map<number, {mal_id, sum, count, avg}>>}
 */
async function aggregateWeeklyRatings() {
    const db = admin.firestore();
    const cutoff = Date.now() - WEEK_MS;

    // Iterate users up to the safety cap
    const usersSnap = await db.collection('users').limit(MAX_USERS).get();

    const perAnime = new Map();

    for (const userDoc of usersSnap.docs) {
        const libSnap = await db.doc(`users/${userDoc.id}/data/library`).get();
        if (!libSnap.exists) continue;
        const works = libSnap.data()?.works || [];

        for (const w of works) {
            if (w.type !== 'anime') continue;
            if (!w.rating || w.rating <= 0) continue;
            if (!w.lastUpdated || w.lastUpdated < cutoff) continue;
            if (!w.id || typeof w.id !== 'number') continue;

            const cur = perAnime.get(w.id) || { mal_id: w.id, title: w.title, sum: 0, count: 0 };
            cur.sum += w.rating;
            cur.count += 1;
            cur.title = w.title || cur.title;
            perAnime.set(w.id, cur);
        }
    }

    // Compute averages
    for (const entry of perAnime.values()) {
        entry.avg = entry.sum / entry.count;
    }

    return perAnime;
}

/**
 * Weekly TOP N — highest average rating, min votes threshold, then by count.
 */
async function computeWeeklyTop(limit = 3) {
    const agg = await aggregateWeeklyRatings();
    const qualified = [...agg.values()].filter((a) => a.count >= MIN_VOTES_TO_QUALIFY);

    qualified.sort((a, b) => {
        if (b.avg !== a.avg) return b.avg - a.avg;
        return b.count - a.count;
    });

    const top = qualified.slice(0, limit);
    // Enrich with covers via Jikan
    return Promise.all(top.map(async (entry) => {
        const anime = await fetchAnimeById(entry.mal_id).catch(() => null);
        return {
            mal_id: entry.mal_id,
            title: entry.title,
            cover: anime?.cover || '',
            avg: Number(entry.avg.toFixed(2)),
            count: entry.count,
        };
    }));
}

/**
 * Community favorites — anime(s) with the highest avg rating this week.
 * Returns 1..N entries when there's a tie on the top score.
 */
async function computeCommunityFavorites() {
    const agg = await aggregateWeeklyRatings();
    const qualified = [...agg.values()].filter((a) => a.count >= MIN_VOTES_TO_QUALIFY);
    if (qualified.length === 0) return [];

    const maxAvg = Math.max(...qualified.map((a) => a.avg));
    const winners = qualified
        .filter((a) => Math.abs(a.avg - maxAvg) < 0.01)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3); // cap ex æquo at 3 to avoid a 10-slide carousel

    return Promise.all(winners.map(async (entry) => {
        const anime = await fetchAnimeById(entry.mal_id).catch(() => null);
        return {
            mal_id: entry.mal_id,
            title: entry.title,
            cover: anime?.cover || '',
            avg: Number(entry.avg.toFixed(2)),
            count: entry.count,
        };
    }));
}

module.exports = {
    computeWeeklyTop,
    computeCommunityFavorites,
    aggregateWeeklyRatings,
    MIN_VOTES_TO_QUALIFY,
};
