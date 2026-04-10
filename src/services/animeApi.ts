/**
 * Anime Api service layer
 */
import { jikanQueue } from '@/utils/apiQueue';
import type { QueueOptions } from '@/utils/apiQueue';
import { useSettingsStore } from '@/store/settingsStore';
import {
    getWorkDetailsFn,
    searchWorksFn,
    getWorkCharactersFn,
    getWorkRelationsFn,
    getWorkPicturesFn,
    getWorkStatisticsFn,
    getWorkRecommendationsFn,
    getAnimeEpisodesFn,
    getAnimeStreamingFn,
    getAnimeStaffFn,
    getAnimeThemesFn,
    getWorkReviewsFn,
    getTopWorksFn,
    getSeasonalAnimeFn,
    getAnimeScheduleFn,
    getCharacterByIdFn,
    getCharacterFullFn,
    searchCharactersFn,
    getPersonByIdFn,
    getPersonFullFn,
    searchPeopleFn,
    getAnimeEpisodeDetailsFn,
    getRandomAnimeFn,
    getJikanStatusFn,
} from '@/firebase/functions';
import type { HttpsCallable } from 'firebase/functions';

export type CallOptions = QueueOptions;

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

export interface JikanPagination {
    last_visible_page: number;
    has_next_page: boolean;
    current_page?: number;
    items?: {
        count: number;
        total: number;
        per_page: number;
    };
}

// Jikan API Status Response
export interface JikanStatusResponse {
    status: 'online' | 'offline' | 'error';
    responseTime?: number; // in milliseconds
    message?: string;
    timestamp: number;
}

// --- API Caching ---
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    isError?: boolean;
}

const API_CACHE = new Map<string, CacheEntry<unknown>>();

// Different TTLs for different content stability
const CACHE_TTL_SHORT = 10 * 60 * 1000;   // 10 min — search results, trending
const CACHE_TTL_MEDIUM = 60 * 60 * 1000;  // 1 hour — reviews, stats, staff
const CACHE_TTL_LONG = 4 * 60 * 60 * 1000; // 4 hours — anime details, characters, episodes

const LS_PREFIX = 'bgk_c_';

/** Read from localStorage into the in-memory map (lazy, on first access per key). */
const hydrateFromLS = (key: string): void => {
    if (API_CACHE.has(key)) return;
    try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        if (raw) {
            const entry = JSON.parse(raw) as CacheEntry<unknown>;
            API_CACHE.set(key, entry);
        }
    } catch {
        // localStorage unavailable or corrupted — ignore
    }
};

/** Persist an entry to localStorage, silently skip if quota exceeded. */
const persistToLS = (key: string, entry: CacheEntry<unknown>): void => {
    try {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
    } catch {
        // Quota exceeded — remove oldest bgk_c_ entries and retry once
        try {
            const lsKeys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
            if (lsKeys.length > 0) {
                // Remove the one with the oldest timestamp
                let oldest = lsKeys[0];
                let oldestTs = Infinity;
                for (const k of lsKeys) {
                    try {
                        const e = JSON.parse(localStorage.getItem(k) || '{}') as CacheEntry<unknown>;
                        if (e.timestamp < oldestTs) { oldestTs = e.timestamp; oldest = k; }
                    } catch { /* skip */ }
                }
                localStorage.removeItem(oldest);
                localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
            }
        } catch { /* still no space — skip silently */ }
    }
};

const getCached = <T>(key: string, ttl: number = CACHE_TTL_SHORT): T | null => {
    hydrateFromLS(key);
    const cached = API_CACHE.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < ttl) {
        if (cached.isError) return null;
        return cached.data;
    }
    if (cached) {
        API_CACHE.delete(key);
        try { localStorage.removeItem(LS_PREFIX + key); } catch { /* ignore */ }
    }
    return null;
};

const getCachedDetail = <T>(key: string, ttl: number = CACHE_TTL_LONG): T | 'NOT_FOUND' | null => {
    hydrateFromLS(key);
    const cached = API_CACHE.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < ttl) {
        if (cached.isError) return 'NOT_FOUND';
        return cached.data;
    }
    if (cached) {
        API_CACHE.delete(key);
        try { localStorage.removeItem(LS_PREFIX + key); } catch { /* ignore */ }
    }
    return null;
};

const setCache = <T>(key: string, data: T, isError: boolean = false) => {
    const entry: CacheEntry<unknown> = { data, timestamp: Date.now(), isError };
    API_CACHE.set(key, entry);
    persistToLS(key, entry);
};

/** In-flight requests — prevents duplicate concurrent calls (e.g. React StrictMode double-mount) */
const inflight = new Map<string, Promise<any>>();


async function callProxy<T, I = any>(
    fn: HttpsCallable<I, any>,
    args: I,
    cacheKey: string,
    ttl: number,
    defaultValue?: T,
    options?: CallOptions
): Promise<T> {
    const sessionCached = getCached<T>(cacheKey, ttl);
    if (sessionCached !== null) {
        console.debug(`%c[Cache] SESSION HIT`, 'color: #22c55e; font-weight: bold', cacheKey);
        return sessionCached;
    }
    if (inflight.has(cacheKey)) {
        console.debug(`%c[Cache] IN-FLIGHT`, 'color: #a855f7; font-weight: bold', cacheKey);
        return inflight.get(cacheKey) as Promise<T>;
    }
    console.debug(`%c[Cache] SESSION MISS — calling Cloud Function`, 'color: #f59e0b; font-weight: bold', cacheKey, args);

    const promise = jikanQueue.run<T>(
        async () => {
            const t0 = performance.now();
            const result = await fn(args);
            const data = result.data as T;
            setCache<T>(cacheKey, data);
            console.debug(`%c[Cloud Function] OK`, 'color: #3b82f6; font-weight: bold', cacheKey, `${Math.round(performance.now() - t0)}ms`);
            return data;
        },
        options
    ).catch((error: unknown) => {
        console.error(`%c[Cloud Function] ERROR`, 'color: #ef4444; font-weight: bold', cacheKey, error);
        if (defaultValue !== undefined) {
            console.warn(`%c[Cloud Function] Falling back to default value for`, 'color: #f97316', cacheKey);
            return defaultValue;
        }
        throw error;
    });

    inflight.set(cacheKey, promise as Promise<unknown>);
    promise.finally(() => inflight.delete(cacheKey));
    return promise;
}

// Check Jikan API status
export const checkJikanStatus = async (): Promise<JikanStatusResponse> => {
    // Use a throwaway key (status checks should never be cached)
    const cacheKey = `jikan_status_${Date.now()}`;
    const result = await callProxy<JikanStatusResponse>(
        getJikanStatusFn,
        {},
        cacheKey,
        0,
        { status: 'offline', responseTime: 0, message: 'Failed to check status', timestamp: Date.now() }
    );
    return result;
};


export interface JikanResult {
    mal_id: number;
    title: string;
    images: {
        jpg: {
            image_url: string;
            small_image_url: string;
            large_image_url: string;
        }
    };
    title_english?: string | null;
    title_japanese?: string | null;
    title_synonyms?: string[];
    titles?: { type: string; title: string }[];
    trailer?: {
        youtube_id: string;
        url: string;
        embed_url: string;
        images: {
            image_url: string;
            large_image_url: string;
            maximum_image_url: string;
        }
    };
    chapters?: number | null; // API can return null
    episodes?: number | null;
    synopsis: string;
    type: string;
    status: string;
    score?: number | null;
    studios?: { mal_id: number; type: string; name: string; url: string }[];
    genres?: { mal_id: number; type: string; name: string; url: string }[];
    rating?: string;
    season?: string;
    year?: number;
    duration?: string;
    rank?: number;
    popularity?: number;
    source?: string;
    broadcast?: {
        day?: string;
        time?: string;
        timezone?: string;
        string?: string;
    };
}

export interface SearchFilters {
    min_score?: number;
    status?: string;
    genres?: string; // Comma separated IDs
    order_by?: 'score' | 'popularity' | 'title';
    sort?: 'desc' | 'asc';
    rating?: 'g' | 'pg' | 'pg13' | 'r17' | 'r' | 'rx'; // Allow strings generally to avoid conflict if API allows more
    start_date?: string; // YYYY-MM-DD
    end_date?: string;
    producers?: string; // Comma separated IDs
    limit?: number;
}

export const searchWorks = async (
    query: string,
    type: 'anime' | 'manga' = 'manga',
    filters?: SearchFilters,
    page: number = 1,
    options?: CallOptions
): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `search_${type}_${query}_${JSON.stringify(filters || {})}_nsfw_${nsfwMode}_p${page}`;
    const result = await callProxy<{ data: JikanResult[] }>(
        searchWorksFn,
        { query, type, page, filters, nsfwMode },
        cacheKey,
        CACHE_TTL_SHORT,
        { data: [] },
        options
    );
    return result?.data ?? [];
};

export const getTopWorks = async (
    type: 'anime' | 'manga' = 'manga',
    filter: 'airing' | 'upcoming' | 'bypopularity' | 'favorite' = 'bypopularity',
    limit: number = 24,
    options?: CallOptions
): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `top_${type}_${filter}_${limit}_nsfw_${nsfwMode}`;
    return callProxy<JikanResult[]>(
        getTopWorksFn,
        { type, filter, limit, nsfwMode },
        cacheKey,
        CACHE_TTL_SHORT,
        [],
        options
    );
};

export const getSeasonalAnime = async (limit: number = 24, options?: CallOptions): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `seasonal_${limit}_nsfw_${nsfwMode}`;
    return callProxy<JikanResult[]>(
        getSeasonalAnimeFn,
        { limit, nsfwMode },
        cacheKey,
        CACHE_TTL_SHORT,
        [],
        options
    );
};

export interface JikanEpisode {
    mal_id: number;
    url: string;
    title: string;
    title_japanese: string | null;
    title_romanji: string | null;
    aired: string | null;
    score: number | null;
    filler: boolean;
    recap: boolean;
    forum_url: string | null;
}

export const getAnimeEpisodes = async (id: number, page: number = 1): Promise<{ data: JikanEpisode[]; pagination: JikanPagination }> => {
    const cacheKey = `anime_${id}_episodes_p${page}`;
    return callProxy(
        getAnimeEpisodesFn,
        { id, page },
        cacheKey,
        CACHE_TTL_LONG,
        { data: [], pagination: { has_next_page: false, last_visible_page: 1 } }
    );
};

export const getAnimeEpisodeDetails = async (
    id: number,
    episodeId: number,
    options?: CallOptions
): Promise<{ synopsis: string; duration: number } | null> => {
    const cacheKey = `anime_${id}_episode_${episodeId}`;
    return callProxy<{ synopsis: string; duration: number } | null>(
        getAnimeEpisodeDetailsFn,
        { id, episodeId },
        cacheKey,
        CACHE_TTL_LONG,
        null,
        options
    );
};

export const getWorkDetails = async (id: number, type: 'anime' | 'manga'): Promise<JikanResult> => {
    const cacheKey = `${type}_${id}_details`;
    const sessionCached = getCachedDetail<JikanResult>(cacheKey, CACHE_TTL_LONG);
    if (sessionCached === 'NOT_FOUND') throw new ApiError(404, `${type} with ID ${id} not found (cached)`);
    if (sessionCached) {
        console.debug(`%c[Cache] SESSION HIT`, 'color: #22c55e; font-weight: bold', cacheKey);
        return sessionCached;
    }

    console.debug(`%c[Cache] SESSION MISS — calling Cloud Function getWorkDetails`, 'color: #f59e0b; font-weight: bold', { id, type });
    try {
        const t0 = performance.now();
        const result = await getWorkDetailsFn({ id, type });
        if (!result.data) {
            setCache(cacheKey, null, true);
            throw new ApiError(404, `${type} with ID ${id} not found`);
        }
        const data = result.data as JikanResult;
        setCache<JikanResult>(cacheKey, data);
        console.debug(`%c[Cloud Function] getWorkDetails OK`, 'color: #3b82f6; font-weight: bold', `${Math.round(performance.now() - t0)}ms`);
        return data;
    } catch (error) {
        console.error(`%c[Cloud Function] getWorkDetails ERROR`, 'color: #ef4444; font-weight: bold', error);
        throw error;
    }
};

/**
 * Fetch full details (including relations, themes, streaming) in a single request
 * Available for Anime and Manga
 */
export interface JikanResultFull extends JikanResult {
    relations?: JikanRelation[];
    theme?: JikanTheme;
    external?: { name: string; url: string }[];
    streaming?: JikanStreaming[];
}

export const getWorkFull = async (id: number, type: 'anime' | 'manga'): Promise<JikanResultFull> => {
    const cacheKey = `${type}_${id}_full`;
    const sessionCached = getCachedDetail<JikanResultFull>(cacheKey, CACHE_TTL_LONG);
    if (sessionCached === 'NOT_FOUND') throw new ApiError(404, `Full ${type} with ID ${id} not found (cached)`);
    if (sessionCached) {
        console.debug(`%c[Cache] SESSION HIT`, 'color: #22c55e; font-weight: bold', cacheKey);
        return sessionCached;
    }

    console.debug(`%c[Cache] SESSION MISS — calling Cloud Function getWorkFull`, 'color: #f59e0b; font-weight: bold', { id, type });
    try {
        const t0 = performance.now();
        const result = await getWorkDetailsFn({ id, type });
        if (!result.data) {
            setCache(cacheKey, null, true);
            throw new ApiError(404, `Full ${type} with ID ${id} not found`);
        }
        const data = result.data as JikanResultFull;
        setCache<JikanResultFull>(cacheKey, data);
        console.debug(`%c[Cloud Function] getWorkFull OK`, 'color: #3b82f6; font-weight: bold', `${Math.round(performance.now() - t0)}ms`);
        return data;
    } catch (error) {
        console.error(`%c[Cloud Function] getWorkFull ERROR`, 'color: #ef4444; font-weight: bold', error);
        throw error;
    }
};

export interface JikanVoiceActor {
    person: {
        mal_id: number;
        url: string;
        images: {
            jpg: {
                image_url: string;
            };
        };
        name: string;
    };
    language: string;
}

export interface JikanCharacter {
    character: {
        mal_id: number;
        url: string;
        images: {
            jpg: {
                image_url: string;
            };
        };
        name: string;
    };
    role: string;
    favorites: number;
    voice_actors: JikanVoiceActor[];
}

export const getWorkCharacters = async (id: number, type: 'anime' | 'manga'): Promise<JikanCharacter[]> => {
    return callProxy(getWorkCharactersFn, { id, type }, `${type}_${id}_characters`, CACHE_TTL_LONG, []);
};

export interface JikanRelation {
    relation: string;
    entry: {
        mal_id: number;
        type: string;
        name: string;
        url: string;
    }[];
}

export const getWorkRelations = async (id: number, type: 'anime' | 'manga'): Promise<JikanRelation[]> => {
    return callProxy(getWorkRelationsFn, { id, type }, `${type}_${id}_relations`, CACHE_TTL_LONG, []);
};

export interface JikanRecommendation {
    entry: {
        mal_id: number;
        url: string;
        images: {
            jpg: {
                image_url: string;
                large_image_url: string;
            };
        };
        title: string;
    };
    votes: number;
}

export const getWorkRecommendations = async (id: number, type: 'anime' | 'manga'): Promise<JikanRecommendation[]> => {
    return callProxy(getWorkRecommendationsFn, { id, type }, `${type}_${id}_recommendations`, CACHE_TTL_MEDIUM, []);
};

export interface JikanPicture {
    jpg: {
        image_url: string;
        large_image_url: string;
    };
}

export const getWorkPictures = async (id: number, type: 'anime' | 'manga'): Promise<JikanPicture[]> => {
    return callProxy(getWorkPicturesFn, { id, type }, `${type}_${id}_pictures`, CACHE_TTL_LONG, []);
};

export interface JikanTheme {
    openings: string[];
    endings: string[];
}

export const getWorkThemes = async (id: number): Promise<JikanTheme> => {
    return callProxy(getAnimeThemesFn, { id }, `anime_${id}_themes`, CACHE_TTL_LONG, { openings: [], endings: [] });
};

export interface JikanStatistics {
    watching: number;
    completed: number;
    on_hold: number;
    dropped: number;
    plan_to_watch: number;
    total: number;
    scores: {
        score: number;
        percentage: number;
        votes: number;
    }[];
}

export const getWorkStatistics = async (id: number, type: 'anime' | 'manga'): Promise<JikanStatistics> => {
    return callProxy(getWorkStatisticsFn, { id, type }, `${type}_${id}_statistics`, CACHE_TTL_MEDIUM);
};

export interface JikanStreaming {
    name: string;
    url: string;
}

export const getAnimeStreaming = async (id: number): Promise<JikanStreaming[]> => {
    return callProxy(getAnimeStreamingFn, { id }, `anime_${id}_streaming`, CACHE_TTL_LONG, []);
};

export interface JikanStaff {
    person: {
        mal_id: number;
        url: string;
        images: {
            jpg: {
                image_url: string;
            };
        };
        name: string;
    };
    positions: string[];
}


export const getAnimeStaff = async (id: number): Promise<JikanStaff[]> => {
    return callProxy(getAnimeStaffFn, { id }, `anime_${id}_staff`, CACHE_TTL_LONG, []);
};

export const getAnimeSchedule = async (filter?: string, options?: CallOptions): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `schedule_${filter || 'all'}_nsfw_${nsfwMode}`;
    return callProxy<JikanResult[]>(
        getAnimeScheduleFn,
        { filter, nsfwMode },
        cacheKey,
        CACHE_TTL_SHORT,
        [],
        options
    );
};

export const getRandomAnime = async (options?: CallOptions): Promise<JikanResult | null> => {
    const { nsfwMode } = useSettingsStore.getState();
    // No caching — random by nature. Use a throwaway key that never hits cache.
    const cacheKey = `random_anime_${Date.now()}`;
    return callProxy<JikanResult | null>(
        getRandomAnimeFn,
        { nsfwMode },
        cacheKey,
        0, // TTL 0 = never cache
        null,
        options
    );
};

export interface JikanReview {
    mal_id: number;
    url: string;
    type: string;
    reactions: {
        overall: number;
        nice: number;
        love_it: number;
        funny: number;
        confusing: number;
        informative: number;
        well_written: number;
        creative: number;
    };
    date: string;
    review: string;
    score: number;
    tags: string[];
    is_spoiler: boolean;
    is_preliminary: boolean;
    user: {
        username: string;
        url: string;
        images: {
            jpg: {
                image_url: string;
            }
        }
    };
}

export const getWorkReviews = async (id: number, type: 'anime' | 'manga') => {
    return callProxy<JikanReview[]>(
        getWorkReviewsFn,
        { id, type },
        `${type}_${id}_reviews`,
        CACHE_TTL_MEDIUM,
        []
    );
};

// ==================== CHARACTER & PERSON ENDPOINTS ====================

export interface JikanCharacterFull {
    mal_id: number;
    url: string;
    images: {
        jpg: { image_url: string };
        webp: { image_url: string; small_image_url: string };
    };
    name: string;
    name_kanji: string | null;
    nicknames: string[];
    favorites: number;
    about: string | null;
}

export interface JikanCharacterAnime {
    role: string;
    anime: {
        mal_id: number;
        url: string;
        images: { jpg: { image_url: string; large_image_url: string } };
        title: string;
    };
}

export interface JikanCharacterVoice {
    language: string;
    person: {
        mal_id: number;
        url: string;
        images: { jpg: { image_url: string } };
        name: string;
    };
}

export const getCharacterById = async (id: number, options?: CallOptions) => {
    const cacheKey = `character_${id}`;
    return callProxy<JikanCharacterFull | null>(
        getCharacterByIdFn,
        { id },
        cacheKey,
        CACHE_TTL_LONG,
        null,
        options
    );
};

export interface JikanCharacterManga {
    role: string;
    manga: {
        mal_id: number;
        url: string;
        images: { jpg: { image_url: string; large_image_url: string } };
        title: string;
    };
}

export const getCharacterFull = async (id: number, options?: CallOptions) => {
    const cacheKey = `character_full_${id}`;
    return callProxy<(JikanCharacterFull & {
        anime: JikanCharacterAnime[];
        manga: JikanCharacterManga[];
        voices: JikanCharacterVoice[];
    }) | null>(
        getCharacterFullFn,
        { id },
        cacheKey,
        CACHE_TTL_LONG,
        null,
        options
    );
};

export interface JikanPersonFull {
    mal_id: number;
    url: string;
    website_url: string | null;
    images: { jpg: { image_url: string } };
    name: string;
    given_name: string | null;
    family_name: string | null;
    alternate_names: string[];
    birthday: string | null;
    favorites: number;
    about: string | null;
}

export interface JikanPersonVoice {
    role: string;
    anime: {
        mal_id: number;
        url: string;
        images: { jpg: { image_url: string; large_image_url: string } };
        title: string;
    };
    character: {
        mal_id: number;
        url: string;
        images: { jpg: { image_url: string } };
        name: string;
    };
}

export const getPersonById = async (id: number, options?: CallOptions) => {
    const cacheKey = `person_${id}`;
    return callProxy<JikanPersonFull | null>(
        getPersonByIdFn,
        { id },
        cacheKey,
        CACHE_TTL_LONG,
        null,
        options
    );
};

export const getPersonFull = async (id: number, options?: CallOptions) => {
    const cacheKey = `person_full_${id}`;
    return callProxy<(JikanPersonFull & {
        voices: JikanPersonVoice[];
        anime: { position: string; anime: { mal_id: number; title: string; images: { jpg: { image_url: string } } } }[];
    }) | null>(
        getPersonFullFn,
        { id },
        cacheKey,
        CACHE_TTL_LONG,
        null,
        options
    );
};

export const searchCharacters = async (query: string, limit: number = 25, options?: CallOptions): Promise<JikanCharacterFull[]> => {
    const cacheKey = `search_chars_${query}_${limit}`;
    return callProxy<JikanCharacterFull[]>(
        searchCharactersFn,
        { query, limit },
        cacheKey,
        CACHE_TTL_SHORT,
        [],
        options
    );
};

export const searchPeople = async (query: string, limit: number = 15, options?: CallOptions): Promise<JikanPersonFull[]> => {
    const cacheKey = `search_people_${query}_${limit}`;
    return callProxy<JikanPersonFull[]>(
        searchPeopleFn,
        { query, limit },
        cacheKey,
        CACHE_TTL_SHORT,
        [],
        options
    );
};
