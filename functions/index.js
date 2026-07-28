const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");

// Initialize Firebase Admin once at the root
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Co-localisé avec Firestore (europe-west9) : supprime un aller-retour transatlantique
// par lecture/écriture de cache, et rapproche les callables des utilisateurs FR.
// Doit être appelé avant le require des modules qui définissent les fonctions.
setGlobalOptions({ region: "europe-west9" });

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
exports.onGamificationUpdate = gamification.onGamificationUpdate;
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
exports.getRandomManga = jikanProxy.getRandomManga;
exports.getGenres = jikanProxy.getGenres;
exports.getProducers = jikanProxy.getProducers;
exports.getSeasonsList = jikanProxy.getSeasonsList;
exports.getUpcomingAnime = jikanProxy.getUpcomingAnime;
exports.getSeasonAnime = jikanProxy.getSeasonAnime;
exports.getRecentRecommendations = jikanProxy.getRecentRecommendations;
exports.getTopCharacters = jikanProxy.getTopCharacters;
exports.getWorkNews = jikanProxy.getWorkNews;
exports.getJikanStatus = jikanProxy.getJikanStatus;
exports.syncStaleCache = jikanProxy.syncStaleCache;

// 5. Maintenance & Cron Jobs
const maintenance = require("./maintenance");
exports.dailyMaintenance = maintenance.dailyMaintenance;
