const admin = require("firebase-admin");

// Initialize Firebase Admin once at the root
if (admin.apps.length === 0) {
    admin.initializeApp();
}

/**
 * Bingeki V2 Cloud Functions
 * Split into modules for better maintainability.
 */

// 1. SEO & OG Images
const seo = require("./seo");
exports.seoHandler = seo.seoHandler;

// 2. Gamification & Library Triggers
const gamification = require("./gamification");
exports.onLibraryUpdate = gamification.onLibraryUpdate;
exports.recalculateAllUserStats = gamification.recalculateAllUserStats;
exports.getLeaderboard = gamification.getLeaderboard;

// 3. Social & Friends
const social = require("./social");
exports.sendFriendRequestFn = social.sendFriendRequestFn;
exports.acceptFriendRequestFn = social.acceptFriendRequestFn;
exports.rejectFriendRequestFn = social.rejectFriendRequestFn;

// 4. Jikan Proxy & Cache
const jikanProxy = require("./jikan_proxy");
exports.getWorkDetails = jikanProxy.getWorkDetails;
exports.searchWorks = jikanProxy.searchWorks;
exports.getWorkCharacters = jikanProxy.getWorkCharacters;
exports.getWorkRelations = jikanProxy.getWorkRelations;
exports.getWorkPictures = jikanProxy.getWorkPictures;
exports.getWorkStatistics = jikanProxy.getWorkStatistics;
exports.getWorkRecommendations = jikanProxy.getWorkRecommendations;
exports.getAnimeEpisodes = jikanProxy.getAnimeEpisodes;
exports.getAnimeStreaming = jikanProxy.getAnimeStreaming;
exports.getAnimeStaff = jikanProxy.getAnimeStaff;
exports.getAnimeThemes = jikanProxy.getAnimeThemes;
exports.getWorkReviews = jikanProxy.getWorkReviews;
exports.getTopWorks = jikanProxy.getTopWorks;
exports.getSeasonalAnime = jikanProxy.getSeasonalAnime;
exports.getAnimeSchedule = jikanProxy.getAnimeSchedule;
exports.getCharacterFull = jikanProxy.getCharacterFull;
exports.searchCharacters = jikanProxy.searchCharacters;
exports.getPersonFull = jikanProxy.getPersonFull;
exports.getAnimeEpisodeDetails = jikanProxy.getAnimeEpisodeDetails;
exports.getRandomAnime = jikanProxy.getRandomAnime;
exports.getJikanStatus = jikanProxy.getJikanStatus;
exports.syncStaleCache = jikanProxy.syncStaleCache;

// 5. Maintenance & Cron Jobs
const maintenance = require("./maintenance");
exports.dailyMaintenance = maintenance.dailyMaintenance;
