/**
 * Anime Api service layer
 */
import { jikanQueue } from '@/utils/apiQueue';
import type { QueueOptions } from '@/utils/apiQueue';
import { useSettingsStore } from '@/store/settingsStore';
import { logger } from '@/utils/logger';
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
    getCharacterFullFn,
    searchCharactersFn,
    getPersonFullFn,
    getAnimeEpisodeDetailsFn,
    getRandomAnimeFn,
    getRandomMangaFn,
    getGenresFn,
    getProducersFn,
    getSeasonsListFn,
    getUpcomingAnimeFn,
    getSeasonAnimeFn,
    getRecentRecommendationsFn,
    getTopCharactersFn,
    getWorkNewsFn,
    getJikanStatusFn,
} from '@/firebase/functions';


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
const CACHE_TTL_SHORT = 30 * 60 * 1000;   // 30 min — search results
const CACHE_TTL_MEDIUM = 60 * 60 * 1000;  // 1 hour — reviews, stats, staff
const CACHE_TTL_LONG = 4 * 60 * 60 * 1000; // 4 hours — anime details, characters, episodes
const CACHE_TTL_LISTS = 6 * 60 * 60 * 1000; // 6 hours — top/seasonal/schedule (Jikan les cache 24 h en amont)
const CACHE_TTL_TAXONOMY = 7 * 24 * 60 * 60 * 1000; // 7 jours — genres, producteurs, saisons
const CACHE_STALE_MAX = 7 * 24 * 60 * 60 * 1000; // au-delà, une entrée expirée n'est plus servie en stale

const LS_PREFIX = 'bgk_c_';

/** One-shot cleanup des clés jetables persistées par les anciens builds (saturaient le quota) */
let lsPurged = false;
const purgeLegacyLS = (): void => {
    if (lsPurged) return;
    lsPurged = true;
    try {
        const now = Date.now();
        for (const k of Object.keys(localStorage)) {
            if (!k.startsWith(LS_PREFIX)) continue;
            if (k.startsWith(`${LS_PREFIX}jikan_status_`) || k.startsWith(`${LS_PREFIX}random_anime_`)) {
                localStorage.removeItem(k);
                continue;
            }
            try {
                const e = JSON.parse(localStorage.getItem(k) || '') as CacheEntry<unknown>;
                if (!e || typeof e.timestamp !== 'number' || now - e.timestamp > CACHE_STALE_MAX) {
                    localStorage.removeItem(k);
                }
            } catch {
                localStorage.removeItem(k);
            }
        }
    } catch { /* localStorage unavailable — ignore */ }
};

/** Read from localStorage into the in-memory map (lazy, on first access per key). */
const hydrateFromLS = (key: string): void => {
    purgeLegacyLS();
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
        // Quota exceeded — evict the oldest ~25% of bgk_c_ entries and retry once
        try {
            const lsKeys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
            if (lsKeys.length > 0) {
                const dated = lsKeys.map(k => {
                    try {
                        return { k, ts: (JSON.parse(localStorage.getItem(k) || '{}') as CacheEntry<unknown>).timestamp ?? 0 };
                    } catch {
                        return { k, ts: 0 };
                    }
                }).sort((a, b) => a.ts - b.ts);
                const evictCount = Math.max(1, Math.ceil(dated.length / 4));
                for (const { k } of dated.slice(0, evictCount)) localStorage.removeItem(k);
                localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
            }
        } catch { /* still no space — skip silently */ }
    }
};

interface CachedLookup<T> {
    data: T;
    isStale: boolean;
    isError?: boolean;
}

/** Fraîche → isStale:false ; expirée < CACHE_STALE_MAX → isStale:true (servie pendant le refresh) ; au-delà → null */
const getCachedEntry = <T>(key: string, ttl: number): CachedLookup<T> | null => {
    hydrateFromLS(key);
    const cached = API_CACHE.get(key) as CacheEntry<T> | undefined;
    if (!cached) return null;
    const age = Date.now() - cached.timestamp;
    if (age < ttl) return { data: cached.data, isStale: false, isError: cached.isError };
    if (age < CACHE_STALE_MAX && !cached.isError) return { data: cached.data, isStale: true };
    API_CACHE.delete(key);
    try { localStorage.removeItem(LS_PREFIX + key); } catch { /* ignore */ }
    return null;
};

const getCachedDetail = <T>(key: string, ttl: number = CACHE_TTL_LONG): T | 'NOT_FOUND' | null => {
    const cached = getCachedEntry<T>(key, ttl);
    if (!cached || cached.isStale) return null;
    if (cached.isError) return 'NOT_FOUND';
    return cached.data;
};

const setCache = <T>(key: string, data: T, isError: boolean = false) => {
    const entry: CacheEntry<unknown> = { data, timestamp: Date.now(), isError };
    API_CACHE.set(key, entry);
    persistToLS(key, entry);
};

/** In-flight requests — prevents duplicate concurrent calls (e.g. React StrictMode double-mount) */
const inflight = new Map<string, Promise<unknown>>();

// --- Appels directs : 3-6x plus rapides que le proxy (CDN + cache navigateur), proxy en fallback ---
// Tenrai suit le schéma Jikan v4 (mêmes chemins) et renvoie `Cache-Control: max-age=14400`,
// donc le navigateur cache 4 h nativement. Jikan ferme le 2026-10-01.
const JIKAN_BASE = 'https://api.tenrai.org/v1';
// Désactivé en test : jsdom tenterait de vrais appels réseau
const DIRECT_ENABLED = typeof window !== 'undefined' && import.meta.env.MODE !== 'test';

interface DirectCall {
    path: string;
    /** true : renvoie le JSON complet ({ data, pagination }) comme les endpoints paginés du proxy */
    full?: boolean;
}

async function jikanDirect(path: string, returnFull: boolean): Promise<unknown> {
    const res = await fetch(`${JIKAN_BASE}${path}`, {
        signal: AbortSignal.timeout(10000),
        headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new ApiError(res.status, `Jikan HTTP ${res.status} for ${path}`);
    const json = await res.json();
    return returnFull ? json : json.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callProxy<T, I = any>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: any,
    args: I,
    cacheKey: string,
    ttl: number,
    defaultValue?: T,
    options?: CallOptions,
    direct?: DirectCall
): Promise<T> {
    const cached = ttl > 0 ? getCachedEntry<T>(cacheKey, ttl) : null;
    if (cached && !cached.isError && !cached.isStale) {
        logger.debug(`%c[Cache] SESSION HIT`, 'color: #22c55e; font-weight: bold', cacheKey);
        return cached.data;
    }
    const staleData = cached && !cached.isError && cached.isStale ? cached.data : undefined;

    if (inflight.has(cacheKey)) {
        logger.debug(`%c[Cache] IN-FLIGHT`, 'color: #a855f7; font-weight: bold', cacheKey);
        if (staleData !== undefined) return staleData;
        return inflight.get(cacheKey) as Promise<T>;
    }
    logger.debug(`%c[Cache] SESSION MISS${staleData !== undefined ? ' (stale servie)' : ''}`, 'color: #f59e0b; font-weight: bold', cacheKey, args);

    const promise = jikanQueue.run<T>(
        async () => {
            const t0 = performance.now();
            let data: T;
            if (direct && DIRECT_ENABLED) {
                try {
                    data = await jikanDirect(direct.path, direct.full === true) as T;
                    logger.debug(`%c[Jikan direct] OK`, 'color: #10b981; font-weight: bold', cacheKey, `${Math.round(performance.now() - t0)}ms`);
                } catch (directError) {
                    // 4xx direct (hors 429) : le proxy renverrait la même chose — inutile de rejouer
                    if (directError instanceof ApiError && directError.status >= 400 && directError.status < 500 && directError.status !== 429) {
                        throw directError;
                    }
                    logger.debug(`%c[Jikan direct] fallback proxy`, 'color: #f97316', cacheKey, directError);
                    const result = await fn(args);
                    data = result.data as T;
                }
            } else {
                const result = await fn(args);
                data = result.data as T;
            }
            if (ttl > 0) setCache<T>(cacheKey, data);
            logger.debug(`%c[API] OK`, 'color: #3b82f6; font-weight: bold', cacheKey, `${Math.round(performance.now() - t0)}ms`);
            return data;
        },
        options
    ).catch((error: unknown) => {
        logger.error(`%c[API] ERROR`, 'color: #ef4444; font-weight: bold', cacheKey, error);
        if (staleData !== undefined) {
            logger.warn(`%c[API] Refresh échoué — on garde la valeur stale`, 'color: #f97316', cacheKey);
            return staleData;
        }
        if (defaultValue !== undefined) {
            logger.warn(`%c[API] Falling back to default value for`, 'color: #f97316', cacheKey);
            return defaultValue;
        }
        throw error;
    });

    inflight.set(cacheKey, promise);
    promise.finally(() => inflight.delete(cacheKey));

    if (staleData !== undefined) {
        // Stale-while-revalidate : on sert l'ancienne valeur, le refresh met le cache à jour
        return staleData;
    }
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

const SEARCH_FILTER_KEYS: (keyof SearchFilters)[] = ['min_score', 'status', 'genres', 'order_by', 'sort', 'rating', 'start_date', 'end_date', 'producers', 'limit'];

export const searchWorks = async (
    query: string,
    type: 'anime' | 'manga' = 'manga',
    filters?: SearchFilters,
    page: number = 1,
    options?: CallOptions
): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `search_${type}_${query}_${JSON.stringify(filters || {})}_nsfw_${nsfwMode}_p${page}`;
    // Miroir de la query string construite par le backend (searchWorks, jikan_proxy.js)
    let direct: DirectCall | undefined;
    if (!nsfwMode) {
        const params = new URLSearchParams({ page: String(page), sfw: 'true' });
        if (query) params.set('q', query);
        for (const k of SEARCH_FILTER_KEYS) {
            const v = filters?.[k];
            if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
        }
        direct = { path: `/${type}?${params.toString()}`, full: true };
    }
    const result = await callProxy<{ data: JikanResult[] }>(
        searchWorksFn,
        { query, type, page, filters, nsfwMode },
        cacheKey,
        CACHE_TTL_SHORT,
        { data: [] },
        options,
        direct
    );
    return result?.data ?? [];
};

// Toujours fetché avec limit=24 sous une clé unique puis slicé — évite 3 fetchs des mêmes tops
const TOP_FETCH_LIMIT = 24;

export const getTopWorks = async (
    type: 'anime' | 'manga' = 'manga',
    filter: 'airing' | 'upcoming' | 'bypopularity' | 'favorite' = 'bypopularity',
    limit: number = 24,
    options?: CallOptions
): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `top_${type}_${filter}_${TOP_FETCH_LIMIT}_nsfw_${nsfwMode}`;
    const direct: DirectCall | undefined = nsfwMode
        ? undefined
        : { path: `/top/${type}?filter=${filter}&limit=${TOP_FETCH_LIMIT}&sfw=true` };
    const data = await callProxy<JikanResult[]>(
        getTopWorksFn,
        { type, filter, limit: TOP_FETCH_LIMIT, nsfwMode },
        cacheKey,
        CACHE_TTL_LISTS,
        [],
        options,
        direct
    );
    return (data ?? []).slice(0, limit);
};

export const getSeasonalAnime = async (limit: number = 24, options?: CallOptions): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `seasonal_${limit}_nsfw_${nsfwMode}`;
    const direct: DirectCall | undefined = nsfwMode
        ? undefined
        : { path: `/seasons/now?limit=${limit}&sfw=true` };
    return callProxy<JikanResult[]>(
        getSeasonalAnimeFn,
        { limit, nsfwMode },
        cacheKey,
        CACHE_TTL_LISTS,
        [],
        options,
        direct
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
        { data: [], pagination: { has_next_page: false, last_visible_page: 1 } },
        undefined,
        { path: `/anime/${id}/episodes?page=${page}`, full: true }
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
        options,
        { path: `/anime/${id}/episodes/${episodeId}` }
    );
};

/** Chemin commun getWorkDetails/getWorkFull : callProxy (file + inflight + direct) avec cache d'erreur 404 */
const fetchWorkFullCore = async <T extends JikanResult>(id: number, type: 'anime' | 'manga'): Promise<T> => {
    const cacheKey = `${type}_${id}_details`;
    const sessionCached = getCachedDetail<T>(cacheKey, CACHE_TTL_LONG);
    if (sessionCached === 'NOT_FOUND') throw new ApiError(404, `${type} with ID ${id} not found (cached)`);
    if (sessionCached) {
        logger.debug(`%c[Cache] SESSION HIT`, 'color: #22c55e; font-weight: bold', cacheKey);
        return sessionCached;
    }

    try {
        const data = await callProxy<T | null>(
            getWorkDetailsFn,
            { id, type },
            cacheKey,
            CACHE_TTL_LONG,
            undefined,
            { priority: 'high' },
            { path: `/${type}/${id}/full` }
        );
        if (!data) {
            setCache(cacheKey, null, true);
            throw new ApiError(404, `${type} with ID ${id} not found`);
        }
        return data;
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) setCache(cacheKey, null, true);
        throw error;
    }
};

export const getWorkDetails = async (id: number, type: 'anime' | 'manga'): Promise<JikanResult> => {
    return fetchWorkFullCore<JikanResult>(id, type);
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
    // Same backend endpoint as getWorkDetails (/full) — share the cache key to avoid double fetches
    return fetchWorkFullCore<JikanResultFull>(id, type);
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
    return callProxy(getWorkCharactersFn, { id, type }, `${type}_${id}_characters`, CACHE_TTL_LONG, [], undefined, { path: `/${type}/${id}/characters` });
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
    return callProxy(getWorkRelationsFn, { id, type }, `${type}_${id}_relations`, CACHE_TTL_LONG, [], undefined, { path: `/${type}/${id}/relations` });
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
    return callProxy(getWorkRecommendationsFn, { id, type }, `${type}_${id}_recommendations`, CACHE_TTL_MEDIUM, [], undefined, { path: `/${type}/${id}/recommendations` });
};

export interface JikanPicture {
    jpg: {
        image_url: string;
        large_image_url: string;
    };
}

export const getWorkPictures = async (id: number, type: 'anime' | 'manga'): Promise<JikanPicture[]> => {
    return callProxy(getWorkPicturesFn, { id, type }, `${type}_${id}_pictures`, CACHE_TTL_LONG, [], undefined, { path: `/${type}/${id}/pictures` });
};

export interface JikanTheme {
    openings: string[];
    endings: string[];
}

export const getWorkThemes = async (id: number): Promise<JikanTheme> => {
    return callProxy(getAnimeThemesFn, { id }, `anime_${id}_themes`, CACHE_TTL_LONG, { openings: [], endings: [] }, undefined, { path: `/anime/${id}/themes` });
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

export const getWorkStatistics = async (id: number, type: 'anime' | 'manga'): Promise<JikanStatistics | null> => {
    return callProxy(getWorkStatisticsFn, { id, type }, `${type}_${id}_statistics`, CACHE_TTL_MEDIUM, null, undefined, { path: `/${type}/${id}/statistics` });
};

export interface JikanStreaming {
    name: string;
    url: string;
}

export const getAnimeStreaming = async (id: number): Promise<JikanStreaming[]> => {
    return callProxy(getAnimeStreamingFn, { id }, `anime_${id}_streaming`, CACHE_TTL_LONG, [], undefined, { path: `/anime/${id}/streaming` });
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
    return callProxy(getAnimeStaffFn, { id }, `anime_${id}_staff`, CACHE_TTL_LONG, [], undefined, { path: `/anime/${id}/staff` });
};

export const getAnimeSchedule = async (filter?: string, options?: CallOptions): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `schedule_${filter || 'all'}_nsfw_${nsfwMode}`;
    const direct: DirectCall | undefined = nsfwMode
        ? undefined
        : { path: filter ? `/schedules?filter=${filter}&sfw=true` : '/schedules?sfw=true' };
    return callProxy<JikanResult[]>(
        getAnimeScheduleFn,
        { filter, nsfwMode },
        cacheKey,
        CACHE_TTL_LISTS,
        [],
        options,
        direct
    );
};

export const getRandomAnime = async (options?: CallOptions): Promise<JikanResult | null> => {
    const { nsfwMode } = useSettingsStore.getState();
    // No caching — random by nature. Use a throwaway key that never hits cache.
    const cacheKey = `random_anime_${Date.now()}`;
    const direct: DirectCall | undefined = nsfwMode ? undefined : { path: '/random/anime?sfw=true' };
    return callProxy<JikanResult | null>(
        getRandomAnimeFn,
        { nsfwMode },
        cacheKey,
        0, // TTL 0 = never cache
        null,
        options,
        direct
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
        [],
        undefined,
        { path: `/${type}/${id}/reviews?spoilers=false&preliminary=false` }
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
        options,
        { path: `/characters/${id}/full` }
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
        options,
        { path: `/people/${id}/full` }
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
        options,
        { path: `/characters?q=${encodeURIComponent(query)}&limit=${limit}` }
    );
};

// ==================== TAXONOMIES & DÉCOUVERTE ====================

export interface JikanGenre {
    mal_id: number;
    name: string;
    url: string;
    count: number;
}

/** Liste complète des genres MAL (78 en anime, 79 en manga) — remplace toute liste codée en dur. */
export const getGenres = async (type: 'anime' | 'manga' = 'anime', options?: CallOptions): Promise<JikanGenre[]> => {
    return callProxy<JikanGenre[]>(
        getGenresFn,
        { type },
        `genres_${type}`,
        CACHE_TTL_TAXONOMY,
        [],
        options,
        { path: `/genres/${type}` }
    );
};

export interface JikanProducer {
    mal_id: number;
    titles?: { type: string; title: string }[];
    images?: { jpg: { image_url: string } };
    favorites?: number;
    count?: number;
    established?: string | null;
}

/** Studios/producteurs triés par popularité. */
export const getProducers = async (limit: number = 25, page: number = 1, options?: CallOptions): Promise<JikanProducer[]> => {
    const result = await callProxy<{ data: JikanProducer[] }>(
        getProducersFn,
        { limit, page },
        `producers_${limit}_p${page}`,
        CACHE_TTL_TAXONOMY,
        { data: [] },
        options,
        { path: `/producers?page=${page}&limit=${limit}&order_by=favorites&sort=desc`, full: true }
    );
    return result?.data ?? [];
};

/** Nom d'affichage d'un producteur (le schéma expose `titles[]`, pas `name`). */
export const getProducerName = (p: JikanProducer): string => {
    const titles = p.titles ?? [];
    return (titles.find(t => t.type === 'Default') ?? titles[0])?.title ?? `#${p.mal_id}`;
};

export interface JikanSeasonEntry {
    year: number;
    seasons: string[];
}

export const getSeasonsList = async (options?: CallOptions): Promise<JikanSeasonEntry[]> => {
    return callProxy<JikanSeasonEntry[]>(
        getSeasonsListFn,
        {},
        'seasons_list',
        CACHE_TTL_TAXONOMY,
        [],
        options,
        { path: '/seasons' }
    );
};

export const getUpcomingAnime = async (limit: number = 24, options?: CallOptions): Promise<JikanResult[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const direct: DirectCall | undefined = nsfwMode
        ? undefined
        : { path: `/seasons/upcoming?limit=${limit}&sfw=true` };
    return callProxy<JikanResult[]>(
        getUpcomingAnimeFn,
        { limit, nsfwMode },
        `upcoming_${limit}_nsfw_${nsfwMode}`,
        CACHE_TTL_LISTS,
        [],
        options,
        direct
    );
};

export const getSeasonAnime = async (
    year: number,
    season: string,
    limit: number = 24,
    page: number = 1,
    options?: CallOptions
): Promise<{ data: JikanResult[]; pagination: JikanPagination }> => {
    const { nsfwMode } = useSettingsStore.getState();
    const direct: DirectCall | undefined = nsfwMode
        ? undefined
        : { path: `/seasons/${year}/${season}?limit=${limit}&page=${page}&sfw=true`, full: true };
    return callProxy(
        getSeasonAnimeFn,
        { year, season, limit, page, nsfwMode },
        `season_${year}_${season}_${limit}_p${page}_nsfw_${nsfwMode}`,
        CACHE_TTL_LONG,
        { data: [], pagination: { has_next_page: false, last_visible_page: 1 } },
        options,
        direct
    );
};

export interface JikanRecommendationPair {
    mal_id: string;
    entry: {
        mal_id: number;
        url: string;
        images: { jpg: { image_url: string; large_image_url: string } };
        title: string;
    }[];
    content: string;
}

/** Recommandations récentes de la communauté : des paires « si tu as aimé X, essaie Y ». */
export const getRecentRecommendations = async (
    type: 'anime' | 'manga' = 'anime',
    limit: number = 12,
    options?: CallOptions
): Promise<JikanRecommendationPair[]> => {
    const { nsfwMode } = useSettingsStore.getState();
    const direct: DirectCall | undefined = nsfwMode
        ? undefined
        : { path: `/recommendations/${type}?limit=${limit}&sfw=true` };
    return callProxy<JikanRecommendationPair[]>(
        getRecentRecommendationsFn,
        { type, limit, nsfwMode },
        `recent_recs_${type}_${limit}_nsfw_${nsfwMode}`,
        CACHE_TTL_MEDIUM,
        [],
        options,
        direct
    );
};

export const getTopCharacters = async (limit: number = 25, page: number = 1, options?: CallOptions): Promise<JikanCharacterFull[]> => {
    return callProxy<JikanCharacterFull[]>(
        getTopCharactersFn,
        { limit, page },
        `top_characters_${limit}_p${page}`,
        CACHE_TTL_LONG,
        [],
        options,
        { path: `/top/characters?limit=${limit}&page=${page}` }
    );
};

export interface JikanNewsItem {
    mal_id: number;
    url: string;
    title: string;
    date: string;
    author_username: string;
    author_url: string;
    forum_url: string;
    images?: { jpg: { image_url: string | null } };
    comments: number;
    excerpt: string;
}

/** Actualités MyAnimeList liées à une œuvre (distinct du fil RSS global du site). */
export const getWorkNews = async (id: number, type: 'anime' | 'manga', options?: CallOptions): Promise<JikanNewsItem[]> => {
    return callProxy<JikanNewsItem[]>(
        getWorkNewsFn,
        { id, type },
        `${type}_${id}_news`,
        CACHE_TTL_MEDIUM,
        [],
        options,
        { path: `/${type}/${id}/news` }
    );
};

export const getRandomManga = async (options?: CallOptions): Promise<JikanResult | null> => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `random_manga_${Date.now()}`;
    const direct: DirectCall | undefined = nsfwMode ? undefined : { path: '/random/manga?sfw=true' };
    return callProxy<JikanResult | null>(
        getRandomMangaFn,
        { nsfwMode },
        cacheKey,
        0,
        null,
        options,
        direct
    );
};
