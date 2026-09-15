/**
 * generators/stats.js — compute Bingeki-specific stats from Firestore
 * (top ratings, most-watched, favorites).
 *
 * Phase 1 stub.
 */

async function computeWeeklyTop(_limit = 3) {
    // TODO: aggregate ratings from users/*/data/library over last 7 days.
    throw new Error('Not implemented — Phase 2');
}

async function computeCommunityFavorites() {
    // TODO: highest average rating this week; return array of 1..N (ties).
    throw new Error('Not implemented — Phase 2');
}

module.exports = { computeWeeklyTop, computeCommunityFavorites };
