/**
 * cron weeklyRecap — TOP 3 de la semaine, basé sur les stats users
 * Bingeki (notes moyennes sur les 7 derniers jours).
 *
 * Schedule: dimanche 19h.
 *
 * Phase 1 stub.
 */

// exports.weeklyRecap = onSchedule({
//     schedule: '0 19 * * 0',
//     timeZone: 'Europe/Paris',
// }, async () => {
//     const config = await loadBotConfig();
//     if (isKilled(config)) return;
//
//     const top3 = await computeWeeklyTop(3);
//     const { caption, hashtags } = await generateCaption('weekly', top3, config);
//     const slides = await renderSlides('weekly', top3, ['feed', 'story']);
//
//     await createPendingPost({
//         type: 'weekly',
//         title: `Récap semaine ${isoWeek()}`,
//         caption, hashtags, slides,
//         platforms: { insta: true, tiktok: true, x: false },
//     });
// });
