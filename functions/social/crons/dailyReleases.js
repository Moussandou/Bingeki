/**
 * cron dailyReleases — genère un post carousel avec les épisodes sortis
 * dans la journée (source: Jikan /schedules/{today}).
 *
 * Schedule: chaque jour à 19h (Europe/Paris).
 *
 * Phase 1 stub.
 */

// const { onSchedule } = require('firebase-functions/v2/scheduler');
// const { loadBotConfig, isKilled } = require('../shared/config');
// const { fetchTodaysReleases } = require('../generators/jikan');
// const { generateCaption } = require('../generators/gemini');
// const { renderSlides } = require('../generators/renderer');
// const { createPendingPost } = require('../shared/firestore');

// exports.dailyReleases = onSchedule({
//     schedule: '0 19 * * *',
//     timeZone: 'Europe/Paris',
//     retryCount: 1,
// }, async (event) => {
//     const config = await loadBotConfig();
//     if (isKilled(config)) return;
//
//     const releases = await fetchTodaysReleases();
//     if (releases.length === 0) return;
//
//     const { caption, hashtags } = await generateCaption('daily', releases, config);
//     const slides = await renderSlides('daily', releases, ['feed', 'story']);
//
//     await createPendingPost({
//         type: 'daily',
//         title: `Sorties du jour · ${today}`,
//         caption, hashtags, slides,
//         platforms: { insta: true, tiktok: true, x: false },
//         scheduledAt: nextEvening(),
//     });
// });
