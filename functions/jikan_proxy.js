const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
const { TTL_MS, readCache, writeCache } = require("./cache");
const { jikanFetch } = require("./jikan");
const { CALLABLE_REGIONS } = require("./regions");

// --- CACHED FETCH HELPER ---

// Déduplication par instance : N appels concurrents sur la même clé = 1 seul fetch Jikan
const inflightFetches = new Map();

/**
 * Helper: cache-first fetch pattern with optional background refresh.
 * @param {string} cacheKey   Firestore document ID in apiCache collection
 * @param {number} ttl        TTL in milliseconds
 * @param {() => Promise<*>}  fetchFn  Called on cache miss to get fresh data
 */
async function cachedFetch(cacheKey, ttl, fetchFn) {
    const cached = await readCache(cacheKey, ttl);
    if (cached.hit) {
        if (cached.stale && !inflightFetches.has(cacheKey)) {
            console.log(`[cachedFetch] Stale — refreshing in background: ${cacheKey}`);
            const refresh = fetchFn()
                .then((data) => {
                    if (data !== null) writeCache(cacheKey, data).catch(() => {});
                    return data !== null ? data : cached.data;
                })
                .catch((err) => {
                    console.warn(`[cachedFetch] Background refresh failed for ${cacheKey}:`, err.message);
                    return cached.data;
                });
            inflightFetches.set(cacheKey, refresh);
            refresh.finally(() => inflightFetches.delete(cacheKey));
        }
        return cached.data;
    }
    if (inflightFetches.has(cacheKey)) return inflightFetches.get(cacheKey);
    console.log(`[cachedFetch] Calling Jikan for: ${cacheKey}`);
    const t0 = Date.now();
    const promise = (async () => {
        let data;
        try {
            data = await fetchFn();
        } catch (err) {
            if (cached.expiredData !== undefined) {
                console.warn(`[cachedFetch] Jikan failed (${err.message}) — serving expired cache for: ${cacheKey}`);
                return cached.expiredData;
            }
            throw err;
        }
        console.log(`[cachedFetch] Jikan responded in ${Date.now() - t0}ms for: ${cacheKey}`);
        if (data !== null) await writeCache(cacheKey, data);
        return data;
    })();
    inflightFetches.set(cacheKey, promise);
    promise.catch(() => {}).finally(() => inflightFetches.delete(cacheKey));
    return promise;
}

/** NSFW must be enabled in the user's Firestore profile — the client claim alone is not trusted. */
async function resolveNsfw(request) {
    if (request.data?.nsfwMode !== true) return false;
    const uid = request.auth?.uid;
    if (!uid) return false;
    try {
        const snap = await admin.firestore().collection('users').doc(uid).get();
        return snap.exists && snap.data().nsfwMode === true;
    } catch (err) {
        console.warn(`[resolveNsfw] Profile read failed for ${uid}:`, err.message);
        return false;
    }
}

// --- JIKAN PROXY FUNCTIONS ---

exports.getWorkDetails = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_details_${id}`;
    return cachedFetch(key, TTL_MS.DETAILS, () => jikanFetch(`/${type}/${id}/full`));
});

const SEARCH_FILTER_KEYS = ['min_score', 'status', 'genres', 'order_by', 'sort', 'rating', 'start_date', 'end_date', 'producers', 'limit'];

exports.searchWorks = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { query, type, page = 1, filters = {} } = request.data;
    const hasFilters = filters && Object.keys(filters).some(k => SEARCH_FILTER_KEYS.includes(k) && filters[k] !== undefined && filters[k] !== null && filters[k] !== '');
    if (!type) throw new HttpsError('invalid-argument', 'type is required');
    if (!query && !hasFilters) throw new HttpsError('invalid-argument', 'query or filters are required');
    const nsfwMode = await resolveNsfw(request);
    const params = new URLSearchParams({ page: String(page), sfw: String(!nsfwMode) });
    if (query) params.set('q', query);
    for (const k of SEARCH_FILTER_KEYS) {
        const v = filters?.[k];
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
    const qs = params.toString();
    const hash = require('crypto').createHash('md5').update(qs).digest('hex').slice(0, 16);
    const key = `search_${type}_${hash}`;
    try {
        return await cachedFetch(key, TTL_MS.SEARCH, () => jikanFetch(`/${type}?${qs}`, true));
    } catch (err) {
        // Erreur franche plutôt qu'un succès vide : le client cachait 10 min des "aucun résultat" mensongers
        console.warn(`[searchWorks] Jikan unavailable for ${key}: ${err.message}`);
        throw new HttpsError('unavailable', `Jikan unavailable: ${err.message}`);
    }
});

exports.getWorkCharacters = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_characters_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/characters`));
});

exports.getWorkRelations = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_relations_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/relations`));
});

exports.getWorkPictures = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_pictures_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/pictures`));
});

exports.getWorkStatistics = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_stats_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/statistics`));
});

exports.getWorkRecommendations = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_recs_${id}`;
    return cachedFetch(key, TTL_MS.RECOMMENDATIONS, () => jikanFetch(`/${type}/${id}/recommendations`));
});

exports.getAnimeEpisodes = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, page = 1 } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `anime_episodes_${id}_p${page}`;
    return cachedFetch(key, TTL_MS.EPISODES, () => jikanFetch(`/anime/${id}/episodes?page=${page}`, true));
});

exports.getAnimeStreaming = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `anime_streaming_${id}`;
    return cachedFetch(key, TTL_MS.STREAMING, () => jikanFetch(`/anime/${id}/streaming`));
});

exports.getAnimeStaff = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `anime_staff_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/anime/${id}/staff`));
});

exports.getAnimeThemes = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `anime_themes_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/anime/${id}/themes`));
});

exports.getWorkReviews = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_reviews_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/reviews?spoilers=false&preliminary=false`));
});

exports.getTopWorks = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { type, filter = 'bypopularity', limit = 24 } = request.data;
    if (!type) throw new HttpsError('invalid-argument', 'type is required');
    const nsfwMode = await resolveNsfw(request);
    const key = `top_${type}_${filter}_${limit}_nsfw_${nsfwMode}`;
    return cachedFetch(key, TTL_MS.SEARCH, () => jikanFetch(`/top/${type}?filter=${filter}&limit=${limit}&sfw=${!nsfwMode}`));
});

exports.getSeasonalAnime = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { limit = 24 } = request.data;
    const nsfwMode = await resolveNsfw(request);
    const key = `seasonal_${limit}_nsfw_${nsfwMode}`;
    return cachedFetch(key, TTL_MS.SEARCH, () => jikanFetch(`/seasons/now?limit=${limit}&sfw=${!nsfwMode}`));
});

exports.getAnimeSchedule = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { filter } = request.data;
    const nsfwMode = await resolveNsfw(request);
    const key = `schedule_${filter || 'all'}_nsfw_${nsfwMode}`;
    const url = filter ? `/schedules?filter=${filter}&sfw=${!nsfwMode}` : `/schedules?sfw=${!nsfwMode}`;
    return cachedFetch(key, TTL_MS.SEARCH, () => jikanFetch(url));
});

exports.getCharacterFull = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `character_full_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/characters/${id}/full`));
});

exports.searchCharacters = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { query, limit = 25 } = request.data;
    if (!query) throw new HttpsError('invalid-argument', 'query is required');
    const key = `search_chars_${Buffer.from(query).toString('base64').slice(0, 40)}_${limit}`;
    return cachedFetch(key, TTL_MS.SEARCH, () => jikanFetch(`/characters?q=${encodeURIComponent(query)}&limit=${limit}`));
});

exports.getPersonFull = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `person_full_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/people/${id}/full`));
});

exports.getAnimeEpisodeDetails = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const { id, episodeId } = request.data;
    if (!id || !episodeId) throw new HttpsError('invalid-argument', 'id and episodeId are required');
    const key = `anime_episode_detail_${id}_${episodeId}`;
    return cachedFetch(key, TTL_MS.EPISODES, () => jikanFetch(`/anime/${id}/episodes/${episodeId}`));
});

exports.getRandomAnime = onCall({ cors: true, region: CALLABLE_REGIONS },async (request) => {
    const nsfwMode = await resolveNsfw(request);
    return jikanFetch(`/random/anime?sfw=${!nsfwMode}`);
});

exports.getJikanStatus = onCall({ cors: true, region: CALLABLE_REGIONS },async () => {
    const startTime = Date.now();
    try {
        await jikanFetch('/anime/1');
        return { status: 'online', responseTime: Date.now() - startTime, timestamp: Date.now() };
    } catch (error) {
        return { status: 'offline', responseTime: Date.now() - startTime, message: error instanceof Error ? error.message : 'Unknown error', timestamp: Date.now() };
    }
});

exports.syncStaleCache = onSchedule('0 3 * * *', async () => {
    const db = admin.firestore();
    const now = Date.now();
    const staleThreshold = Timestamp.fromMillis(now - 20 * 60 * 60 * 1000);
    const snapshot = await db.collection('apiCache').where('fetchedAt', '<', staleThreshold).limit(50).get();
    // Lots de 3 espacés : Jikan limite à 3 req/s, 50 fetchs parallèles = 429 garantis
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 3) {
        await Promise.allSettled(docs.slice(i, i + 3).map(async (doc) => {
            const key = doc.id;
            const match = key.match(/^(anime|manga)_details_(\d+)$/);
            if (!match) return;
            const [, type, id] = match;
            try {
                const data = await jikanFetch(`/${type}/${id}/full`);
                if (data) await writeCache(key, data);
            } catch (err) {
                console.warn(`[SyncStale] Failed to refresh ${key}:`, err.message);
            }
        }));
        if (i + 3 < docs.length) await new Promise((r) => setTimeout(r, 1500));
    }
    console.log(`[SyncStale] Refreshed ${docs.length} entries`);
});
