/**
 * cron newSeasonDetector — event-driven. Check quotidien pour détecter
 * un anime attendu qui commence sa nouvelle saison (S2, S3, remake…) et
 * queue un post d'annonce.
 *
 * Schedule: chaque jour à 8h.
 * Utilise Jikan pour lister les animes "airing" dont c'est le premier
 * épisode ET dont le titre matche un anime déjà en base users (proxy
 * "attendu").
 *
 * Phase 1 stub.
 */

// exports.newSeasonDetector = onSchedule({
//     schedule: '0 8 * * *',
//     timeZone: 'Europe/Paris',
// }, async () => {
//     const config = await loadBotConfig();
//     if (isKilled(config)) return;
//
//     const newSeasons = await detectNewSeasons();
//     for (const anime of newSeasons) {
//         const { caption, hashtags } = await generateCaption('newseason', anime, config);
//         const slides = await renderSlides('newseason', anime, ['feed', 'story']);
//         await createPendingPost({
//             type: 'newseason',
//             title: `${anime.title} · Announcement`,
//             caption, hashtags, slides,
//             platforms: { insta: true, tiktok: true, x: false },
//         });
//     }
// });
