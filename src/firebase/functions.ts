/**
 * Firebase callable function bindings
 * Typed wrappers for all Cloud Function endpoints
 */
function callable<Input, Output>(name: string) {
    return async (data: Input) => {
        const [{ httpsCallable }, { functions }] = await Promise.all([
            import('firebase/functions'), import('./config'),
        ]);
        return httpsCallable<Input, Output>(functions, name)(data);
    };
}

export const getWorkDetailsFn     = callable<{ id: number; type: string }, unknown>('getWorkDetails');
export const searchWorksFn         = callable<{ query: string; type: string; page?: number; filters?: Record<string, unknown>; nsfwMode?: boolean }, unknown>('searchWorks');
export const getWorkCharactersFn   = callable<{ id: number; type: string }, unknown>('getWorkCharacters');
export const getWorkRelationsFn    = callable<{ id: number; type: string }, unknown>('getWorkRelations');
export const getWorkPicturesFn     = callable<{ id: number; type: string }, unknown>('getWorkPictures');
export const getWorkStatisticsFn   = callable<{ id: number; type: string }, unknown>('getWorkStatistics');
export const getWorkRecommendationsFn = callable<{ id: number; type: string }, unknown>('getWorkRecommendations');
export const getAnimeEpisodesFn    = callable<{ id: number; page?: number }, unknown>('getAnimeEpisodes');
export const getAnimeStreamingFn   = callable<{ id: number }, unknown>('getAnimeStreaming');
export const getAnimeStaffFn       = callable<{ id: number }, unknown>('getAnimeStaff');
export const getAnimeThemesFn      = callable<{ id: number }, unknown>('getAnimeThemes');
export const getWorkReviewsFn      = callable<{ id: number; type: string }, unknown>('getWorkReviews');


export const getTopWorksFn          = callable<{ type: string; filter?: string; limit?: number; nsfwMode?: boolean }, unknown>('getTopWorks');
export const getSeasonalAnimeFn     = callable<{ limit?: number; nsfwMode?: boolean }, unknown>('getSeasonalAnime');
export const getAnimeScheduleFn     = callable<{ filter?: string; nsfwMode?: boolean }, unknown>('getAnimeSchedule');
export const getCharacterFullFn     = callable<{ id: number }, unknown>('getCharacterFull');
export const searchCharactersFn     = callable<{ query: string; limit?: number }, unknown>('searchCharacters');
export const getPersonFullFn        = callable<{ id: number }, unknown>('getPersonFull');
export const getAnimeEpisodeDetailsFn = callable<{ id: number; episodeId: number }, unknown>('getAnimeEpisodeDetails');
export const getRandomAnimeFn       = callable<{ nsfwMode?: boolean }, unknown>('getRandomAnime');
export const getRandomMangaFn       = callable<{ nsfwMode?: boolean }, unknown>('getRandomManga');
export const getGenresFn            = callable<{ type: string; filter?: string }, unknown>('getGenres');
export const getProducersFn         = callable<{ limit?: number; page?: number; query?: string }, unknown>('getProducers');
export const getSeasonsListFn       = callable<Record<string, never>, unknown>('getSeasonsList');
export const getUpcomingAnimeFn     = callable<{ limit?: number; nsfwMode?: boolean }, unknown>('getUpcomingAnime');
export const getSeasonAnimeFn       = callable<{ year: number; season: string; limit?: number; page?: number; nsfwMode?: boolean }, unknown>('getSeasonAnime');
export const getRecentRecommendationsFn = callable<{ type?: string; limit?: number; nsfwMode?: boolean }, unknown>('getRecentRecommendations');
export const getTopCharactersFn     = callable<{ limit?: number; page?: number }, unknown>('getTopCharacters');
export const getWorkNewsFn          = callable<{ id: number; type: string }, unknown>('getWorkNews');
export const getJikanStatusFn       = callable<Record<string, never>, unknown>('getJikanStatus');
