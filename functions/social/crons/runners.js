/**
 * crons/runners.js — table cronId → fonction à exécuter.
 *
 * Utilisée par le callable socialTriggerCron (bouton « Lancer ») et par
 * le cron cronWatchdog (relance automatique d'un cron en erreur).
 */

const { runDailyReleases } = require('./dailyReleases');
const { runWeeklyRecap } = require('./weeklyRecap');
const { runCommunityFavorite } = require('./communityFavorite');
const { runNewSeasonDetector } = require('./newSeasonDetector');
const { runAnnouncement } = require('./announcement');
const { runPollReach } = require('./pollReach');
const { runCleanupPending } = require('./cleanupPending');
const { runCultureNewsAuto } = require('./cultureNewsAuto');
const { runSeasonPreviewAuto } = require('./seasonPreviewAuto');
const { runAutoPublish } = require('./autoPublish');
const { runTiktokStats } = require('./tiktokStats');

const CRON_RUNNERS = {
    dailyReleases: runDailyReleases,
    weeklyRecap: runWeeklyRecap,
    communityFavorite: runCommunityFavorite,
    newSeasonDetector: runNewSeasonDetector,
    announcement: runAnnouncement,
    pollReach: runPollReach,
    cleanupPending: runCleanupPending,
    cultureNewsAuto: runCultureNewsAuto,
    seasonPreviewAuto: runSeasonPreviewAuto,
    autoPublish: runAutoPublish,
    tiktokStats: runTiktokStats,
};

module.exports = { CRON_RUNNERS };
