import { queuedFetch } from '@/utils/apiQueue';
import { useSettingsStore } from '@/store/settingsStore';

const BASE_URL = 'https://api.jikan.moe/v4';
 
export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
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
}

const API_CACHE = new Map<string, CacheEntry<unknown>>();

// Different TTLs for different content stability
const CACHE_TTL_SHORT = 10 * 60 * 1000;   // 10 min — search results, trending
const CACHE_TTL_MEDIUM = 60 * 60 * 1000;  // 1 hour — reviews, stats, staff
const CACHE_TTL_LONG = 4 * 60 * 60 * 1000; // 4 hours — anime details, characters, episodes

const getCached = <T>(key: string, ttl: number = CACHE_TTL_SHORT): T | null => {
    const cached = API_CACHE.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
    }
    if (cached) API_CACHE.delete(key);
    return null;
};

const setCache = <T>(key: string, data: T) => {
    API_CACHE.set(key, { data, timestamp: Date.now() } as CacheEntry<unknown>);
};

// Check Jikan API status
export const checkJikanStatus = async (): Promise<JikanStatusResponse> => {
    const startTime = Date.now();
    try {
        const response = await queuedFetch(`${BASE_URL}/anime/1`, {
            method: 'HEAD', // Use HEAD to minimize data transfer
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
            return {
                status: 'online',
                responseTime,
                timestamp: Date.now()
            };
        } else {
            return {
                status: 'error',
                responseTime,
                message: `HTTP ${response.status}: ${response.statusText}`,
                timestamp: Date.now()
            };
        }
    } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            status: 'offline',
            responseTime,
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
        };
    }
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
    filters?: SearchFilters
) => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `search_${type}_${query}_${JSON.stringify(filters || {})}_nsfw_${nsfwMode}`;
    const cached = getCached<JikanResult[]>(cacheKey);
    if (cached) return cached;

    try {
        const params = new URLSearchParams({
            q: query,
            limit: '24',
            sfw: (!nsfwMode).toString(),
        });

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.append(key, String(value));
                }
            });
        }

        const response = await queuedFetch(`${BASE_URL}/${type}?${params.toString()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache<JikanResult[]>(cacheKey, data.data);
        return data.data as JikanResult[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};

export const getTopWorks = async (
    type: 'anime' | 'manga' = 'manga',
    filter: 'airing' | 'upcoming' | 'bypopularity' | 'favorite' = 'bypopularity',
    limit: number = 24
) => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `top_${type}_${filter}_${limit}_nsfw_${nsfwMode}`;
    const cached = getCached<JikanResult[]>(cacheKey);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/top/${type}?filter=${filter}&limit=${limit}&sfw=${!nsfwMode}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache<JikanResult[]>(cacheKey, data.data);
        return data.data as JikanResult[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};

export const getSeasonalAnime = async (limit: number = 24) => {
    const { nsfwMode } = useSettingsStore.getState();
    const cacheKey = `seasonal_${limit}_nsfw_${nsfwMode}`;
    const cached = getCached<JikanResult[]>(cacheKey);
    if (cached) return cached;

    try {
        // Fetches current season's anime
        const response = await queuedFetch(`${BASE_URL}/seasons/now?limit=${limit}&sfw=${!nsfwMode}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache<JikanResult[]>(cacheKey, data.data);
        return data.data as JikanResult[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
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

export const getAnimeEpisodes = async (id: number, page: number = 1) => {
    const cacheKey = `anime_${id}_episodes_p${page}`;
    const cached = getCached<{ data: JikanEpisode[]; pagination: { has_next_page: boolean } }>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;
    try {
        const response = await queuedFetch(`${BASE_URL}/anime/${id}/episodes?page=${page}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const result = { data: data.data as JikanEpisode[], pagination: data.pagination };
        setCache(cacheKey, result);
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { data: [], pagination: { has_next_page: false } };
    }
};

export const getAnimeEpisodeDetails = async (id: number, episodeId: number) => {
    const cacheKey = `anime_${id}_episode_${episodeId}`;
    const cached = getCached<{ synopsis: string; duration: number }>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;
    try {
        const response = await queuedFetch(`${BASE_URL}/anime/${id}/episodes/${episodeId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const result = data.data as { synopsis: string; duration: number; };
        setCache(cacheKey, result);
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
};

export const getWorkDetails = async (id: number, type: 'anime' | 'manga'): Promise<JikanResult> => {
    const cacheKey = `${type}_${id}_details`;
    const cached = getCached<JikanResult>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/${type}/${id}`);
        if (response.status === 404) {
             throw new ApiError(404, `${type} with ID ${id} not found`);
        }
        if (!response.ok) {
            throw new ApiError(response.status, `Jikan API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.status === 404 || (data.error && data.error.includes('not found'))) {
             throw new ApiError(404, `${type} with ID ${id} not found (API response)`);
        }
        
        setCache<JikanResult>(cacheKey, data.data);
        return data.data as JikanResult;
    } catch (error) {
        console.error(`API Error fetching ${type} ${id}:`, error);
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
    const cached = getCached<JikanResultFull>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/${type}/${id}/full`);
        if (response.status === 404) {
             throw new ApiError(404, `Full ${type} with ID ${id} not found`);
        }
        if (!response.ok) {
            throw new ApiError(response.status, `Jikan API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.status === 404 || (data.error && data.error.includes('not found'))) {
             throw new ApiError(404, `Full ${type} with ID ${id} not found (API response)`);
        }

        setCache<JikanResultFull>(cacheKey, data.data);
        return data.data as JikanResultFull;
    } catch (error) {
        console.error(`API Error fetching full ${type} ${id}:`, error);
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

export const getWorkCharacters = async (id: number, type: 'anime' | 'manga') => {
    const cacheKey = `${type}_${id}_characters`;
    const cached = getCached<JikanCharacter[]>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/${type}/${id}/characters`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const chars = (data.data as JikanCharacter[]).slice(0, 10);
        setCache<JikanCharacter[]>(cacheKey, chars);
        return chars;
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
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

export const getWorkRelations = async (id: number, type: 'anime' | 'manga') => {
    const cacheKey = `${type}_${id}_relations`;
    const cached = getCached<JikanRelation[]>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/${type}/${id}/relations`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache<JikanRelation[]>(cacheKey, data.data);
        return data.data as JikanRelation[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
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

export const getWorkRecommendations = async (id: number, type: 'anime' | 'manga') => {
    const cacheKey = `${type}_${id}_recommendations`;
    const cached = getCached<JikanRecommendation[]>(cacheKey, CACHE_TTL_MEDIUM);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/${type}/${id}/recommendations`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const recs = (data.data as JikanRecommendation[]).slice(0, 12); // Limit to 12 recs
        setCache<JikanRecommendation[]>(cacheKey, recs);
        return recs;
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};

export interface JikanPicture {
    jpg: {
        image_url: string;
        large_image_url: string;
    };
}

export const getWorkPictures = async (id: number, type: 'anime' | 'manga') => {
    const cacheKey = `${type}_${id}_pictures`;
    const cached = getCached<JikanPicture[]>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/${type}/${id}/pictures`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache<JikanPicture[]>(cacheKey, data.data);
        return data.data as JikanPicture[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};

export interface JikanTheme {
    openings: string[];
    endings: string[];
}

export const getWorkThemes = async (id: number): Promise<JikanTheme> => {
    const cacheKey = `anime_${id}_themes`;
    const cached = getCached<JikanTheme>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/anime/${id}/themes`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache<JikanTheme>(cacheKey, data.data);
        return data.data as JikanTheme;
    } catch (error) {
        console.error('API Error:', error);
        return { openings: [], endings: [] };
    }
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

export const getWorkStatistics = async (id: number, type: 'anime' | 'manga') => {
    const cacheKey = `${type}_${id}_statistics`;
    const cached = getCached<JikanStatistics>(cacheKey, CACHE_TTL_MEDIUM);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/${type}/${id}/statistics`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache<JikanStatistics>(cacheKey, data.data);
        return data.data as JikanStatistics;
    } catch (error) {
        console.error(`API Error fetching ${type} ${id} statistics:`, error);
        throw error;
    }
};

export interface JikanStreaming {
    name: string;
    url: string;
}

export const getAnimeStreaming = async (id: number) => {
    const cacheKey = `anime_${id}_streaming`;
    const cached = getCached<JikanStreaming[]>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
        const response = await queuedFetch(`${BASE_URL}/anime/${id}/streaming`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache<JikanStreaming[]>(cacheKey, data.data);
        return data.data as JikanStreaming[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
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


export const getAnimeStaff = async (id: number) => {
    const cacheKey = `anime_${id}_staff`;
    const cached = getCached<JikanStaff[]>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;
    try {
        const response = await queuedFetch(`${BASE_URL}/anime/${id}/staff`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache(cacheKey, data.data as JikanStaff[]);
        return data.data as JikanStaff[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};

export const getAnimeSchedule = async (filter?: string) => {
    const { nsfwMode } = useSettingsStore.getState();
    try {
        const url = filter
            ? `${BASE_URL}/schedules?filter=${filter}&sfw=${!nsfwMode}`
            : `${BASE_URL}/schedules?sfw=${!nsfwMode}`;

        const response = await queuedFetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data as JikanResult[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};

export const getRandomAnime = async () => {
    const { nsfwMode } = useSettingsStore.getState();
    try {
        const response = await queuedFetch(`${BASE_URL}/random/anime?sfw=${!nsfwMode}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data as JikanResult;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
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
    const cacheKey = `${type}_${id}_reviews`;
    const cached = getCached<JikanReview[]>(cacheKey, CACHE_TTL_MEDIUM);
    if (cached) return cached;
    try {
        const response = await queuedFetch(`${BASE_URL}/${type}/${id}/reviews?spoilers=false&preliminary=false`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCache(cacheKey, data.data as JikanReview[]);
        return data.data as JikanReview[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
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

export const getCharacterById = async (id: number) => {
    try {
        const response = await queuedFetch(`${BASE_URL}/characters/${id}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data as JikanCharacterFull;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
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

export const getCharacterFull = async (id: number) => {
    try {
        const response = await queuedFetch(`${BASE_URL}/characters/${id}/full`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data as JikanCharacterFull & {
            anime: JikanCharacterAnime[];
            manga: JikanCharacterManga[];
            voices: JikanCharacterVoice[];
        };
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
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

export const getPersonById = async (id: number) => {
    try {
        const response = await queuedFetch(`${BASE_URL}/people/${id}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data as JikanPersonFull;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
};

export const getPersonFull = async (id: number) => {
    try {
        const response = await queuedFetch(`${BASE_URL}/people/${id}/full`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data as JikanPersonFull & {
            voices: JikanPersonVoice[];
            anime: { position: string; anime: { mal_id: number; title: string; images: { jpg: { image_url: string } } } }[];
        };
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
};

export const searchCharacters = async (query: string, limit: number = 15) => {
    try {
        const response = await queuedFetch(`${BASE_URL}/characters?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data as JikanCharacterFull[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};

export const searchPeople = async (query: string, limit: number = 15) => {
    try {
        const response = await queuedFetch(`${BASE_URL}/people?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data as JikanPersonFull[];
    } catch (error) {
        console.error('API Error:', error);
        return [];
    }
};
