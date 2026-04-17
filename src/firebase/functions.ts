/**
 * Firebase callable function bindings
 * Typed wrappers for all Cloud Function endpoints
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './config';

export const getWorkDetailsFn     = httpsCallable<{ id: number; type: string }, unknown>(functions, 'getWorkDetails');
export const searchWorksFn         = httpsCallable<{ query: string; type: string; page?: number; filters?: Record<string, unknown>; nsfwMode?: boolean }, unknown>(functions, 'searchWorks');
export const getWorkCharactersFn   = httpsCallable<{ id: number; type: string }, unknown>(functions, 'getWorkCharacters');
export const getWorkRelationsFn    = httpsCallable<{ id: number; type: string }, unknown>(functions, 'getWorkRelations');
export const getWorkPicturesFn     = httpsCallable<{ id: number; type: string }, unknown>(functions, 'getWorkPictures');
export const getWorkStatisticsFn   = httpsCallable<{ id: number; type: string }, unknown>(functions, 'getWorkStatistics');
export const getWorkRecommendationsFn = httpsCallable<{ id: number; type: string }, unknown>(functions, 'getWorkRecommendations');
export const getAnimeEpisodesFn    = httpsCallable<{ id: number; page?: number }, unknown>(functions, 'getAnimeEpisodes');
export const getAnimeStreamingFn   = httpsCallable<{ id: number }, unknown>(functions, 'getAnimeStreaming');
export const getAnimeStaffFn       = httpsCallable<{ id: number }, unknown>(functions, 'getAnimeStaff');
export const getAnimeThemesFn      = httpsCallable<{ id: number }, unknown>(functions, 'getAnimeThemes');
export const getWorkReviewsFn      = httpsCallable<{ id: number; type: string }, unknown>(functions, 'getWorkReviews');


export const getTopWorksFn          = httpsCallable<{ type: string; filter?: string; limit?: number; nsfwMode?: boolean }, unknown>(functions, 'getTopWorks');
export const getSeasonalAnimeFn     = httpsCallable<{ limit?: number; nsfwMode?: boolean }, unknown>(functions, 'getSeasonalAnime');
export const getAnimeScheduleFn     = httpsCallable<{ filter?: string; nsfwMode?: boolean }, unknown>(functions, 'getAnimeSchedule');
export const getCharacterByIdFn     = httpsCallable<{ id: number }, unknown>(functions, 'getCharacterById');
export const getCharacterFullFn     = httpsCallable<{ id: number }, unknown>(functions, 'getCharacterFull');
export const searchCharactersFn     = httpsCallable<{ query: string; limit?: number }, unknown>(functions, 'searchCharacters');
export const getPersonByIdFn        = httpsCallable<{ id: number }, unknown>(functions, 'getPersonById');
export const getPersonFullFn        = httpsCallable<{ id: number }, unknown>(functions, 'getPersonFull');
export const searchPeopleFn         = httpsCallable<{ query: string; limit?: number }, unknown>(functions, 'searchPeople');
export const getAnimeEpisodeDetailsFn = httpsCallable<{ id: number; episodeId: number }, unknown>(functions, 'getAnimeEpisodeDetails');
export const getRandomAnimeFn       = httpsCallable<{ nsfwMode?: boolean }, unknown>(functions, 'getRandomAnime');
export const getJikanStatusFn       = httpsCallable<Record<string, never>, unknown>(functions, 'getJikanStatus');
