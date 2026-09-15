/**
 * cron communityFavorite — anime(s) le mieux noté(s) par les users
 * Bingeki cette semaine. Support 1 à N animes en cas d'égalité.
 *
 * Schedule: mercredi 12h.
 *
 * Phase 1 stub.
 */

// exports.communityFavorite = onSchedule({
//     schedule: '0 12 * * 3',
//     timeZone: 'Europe/Paris',
// }, async () => {
//     const config = await loadBotConfig();
//     if (isKilled(config)) return;
//
//     const favorites = await computeCommunityFavorites();  // 1..N ex æquo
//     const { caption, hashtags } = await generateCaption('favorite', favorites, config);
//     const slides = await renderSlides('favorite', favorites, ['feed', 'story']);
//
//     await createPendingPost({
//         type: 'favorite',
//         title: favorites.length > 1
//             ? `${favorites.length} coups de cœur ex æquo`
//             : `Coup de cœur · ${favorites[0].title}`,
//         caption, hashtags, slides,
//         platforms: { insta: true, tiktok: true, x: false },
//     });
// });
