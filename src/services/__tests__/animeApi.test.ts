import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as animeApi from '../animeApi';
import * as firebaseFunctions from '@/firebase/functions';

// Mock localStorage with proper typing for TS
interface MockStorage extends Storage {
    [key: string]: unknown;
}

const localStorageMock = {} as MockStorage;

Object.defineProperties(localStorageMock, {
    getItem: { 
        value: vi.fn(function(this: MockStorage, key: string) { return this[key] || null; }), 
        enumerable: false 
    },
    setItem: { 
        value: vi.fn(function(this: MockStorage, key: string, value: string) { 
            this[key] = value.toString(); 
        }), 
        enumerable: false 
    },
    removeItem: { 
        value: vi.fn(function(this: MockStorage, key: string) { 
            delete this[key]; 
        }), 
        enumerable: false 
    },
    clear: { 
        value: vi.fn(function(this: MockStorage) { 
            Object.keys(this).forEach(key => delete this[key]);
        }), 
        enumerable: false 
    },
    key: { 
        value: vi.fn(function(this: MockStorage, index: number) {
            return Object.keys(this)[index] || null;
        }), 
        enumerable: false 
    },
    length: { 
        get: function(this: MockStorage) {
            return Object.keys(this).length;
        }, 
        enumerable: false 
    }
});

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

vi.mock('@/firebase/functions', () => ({
    getWorkReviewsFn: vi.fn()
}));

describe('Anime API Service - callProxy & Caching', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    it('should call the Cloud Function on first call (Cache MISS)', async () => {
        const mockData = [{ mal_id: 1, review: 'Test' }];
        vi.mocked(firebaseFunctions.getWorkReviewsFn).mockResolvedValue({ data: mockData } as unknown as { data: unknown });

        const result = await animeApi.getWorkReviews(123, 'anime');

        expect(result).toEqual(mockData);
        expect(firebaseFunctions.getWorkReviewsFn).toHaveBeenCalledTimes(1);
    });

    it('should use memory cache on subsequent calls (Cache HIT)', async () => {
        const mockData = [{ mal_id: 1, review: 'Test' }];
        vi.mocked(firebaseFunctions.getWorkReviewsFn).mockResolvedValue({ data: mockData } as unknown as { data: unknown });

        await animeApi.getWorkReviews(456, 'anime'); // First call
        const result = await animeApi.getWorkReviews(456, 'anime'); // Second call

        expect(result).toEqual(mockData);
        expect(firebaseFunctions.getWorkReviewsFn).toHaveBeenCalledTimes(1); // Only once
    });

    it('should deduplicate concurrent in-flight requests', async () => {
        const mockData = [{ mal_id: 1, review: 'Test' }];
        let callCount = 0;
        vi.mocked(firebaseFunctions.getWorkReviewsFn).mockImplementation(() => {
            callCount++;
            return new Promise(resolve => setTimeout(() => resolve({ data: mockData }), 50));
        });

        // Trigger two calls simultaneously
        const [res1, res2] = await Promise.all([
            animeApi.getWorkReviews(789, 'anime'),
            animeApi.getWorkReviews(789, 'anime')
        ]);

        expect(res1).toEqual(mockData);
        expect(res2).toEqual(mockData);
        expect(callCount).toBe(1); // Cloud Function called only once
    });

    it('should fallback to localStorage on page reload (Hydration)', async () => {
        const mockData = [{ id: 1, text: 'Cached' }];
        const cacheKey = 'anime_111_reviews';
        const lsKey = 'bgk_c_' + cacheKey;
        
        localStorageMock.setItem(lsKey, JSON.stringify({
            data: mockData,
            timestamp: Date.now()
        }));

        const result = await animeApi.getWorkReviews(111, 'anime');

        expect(result).toEqual(mockData);
        expect(firebaseFunctions.getWorkReviewsFn).not.toHaveBeenCalled();
    });

    it('should handle localStorage quota exceeded by cleaning up oldest entries', async () => {
        const mockData = { some: 'data' };
        
        // Setup initial storage
        localStorageMock.setItem('bgk_c_old', JSON.stringify({ data: 'old', timestamp: 100 }));
        localStorageMock.setItem('bgk_c_new', JSON.stringify({ data: 'new', timestamp: Date.now() }));

        // Mock setItem to fail on first attempt, then succeed
        let attempts = 0;
        vi.mocked(localStorageMock.setItem).mockImplementation(function(this: MockStorage, key: string, value: string) {
            attempts++;
            if (attempts === 1) {
                throw new Error('QuotaExceededError');
            }
            this[key] = value;
        });

        // Trigger a cache set that triggers the quota logic
        vi.mocked(firebaseFunctions.getWorkReviewsFn).mockResolvedValue({ data: mockData } as unknown as { data: unknown });
        
        // We'll call it with a fresh ID
        await animeApi.getWorkReviews(999, 'anime'); 

        // Verify that bgk_c_old was removed (the oldest one)
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('bgk_c_old');
        expect(localStorageMock['bgk_c_old']).toBeUndefined();
    });
});

// Chaque test réimporte le module : la purge héritée ne s'exécute qu'une fois par instance
describe('Anime API Service - purge, rotation & stale-while-revalidate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        vi.resetModules();
    });

    const loadModules = async () => ({
        api: await import('../animeApi'),
        fns: await import('@/firebase/functions'),
    });

    it('purge les clés jetables héritées (jikan_status_*, random_anime_*) au premier accès', async () => {
        const now = Date.now();
        localStorageMock.setItem('bgk_c_jikan_status_1700000000', JSON.stringify({ data: {}, timestamp: now }));
        localStorageMock.setItem('bgk_c_random_anime_1700000000', JSON.stringify({ data: {}, timestamp: now }));
        localStorageMock.setItem('bgk_c_anime_1_reviews', JSON.stringify({ data: [], timestamp: now }));

        const { api, fns } = await loadModules();
        vi.mocked(fns.getWorkReviewsFn).mockResolvedValue({ data: [] } as unknown as { data: unknown });
        await api.getWorkReviews(1, 'anime');

        expect(localStorageMock['bgk_c_jikan_status_1700000000']).toBeUndefined();
        expect(localStorageMock['bgk_c_random_anime_1700000000']).toBeUndefined();
        expect(localStorageMock['bgk_c_anime_1_reviews']).toBeDefined();
    });

    it('purge les entrées plus vieilles que la fenêtre stale', async () => {
        localStorageMock.setItem('bgk_c_ancient', JSON.stringify({ data: 'x', timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000 }));
        localStorageMock.setItem('bgk_c_corrupt', 'not-json');

        const { api, fns } = await loadModules();
        vi.mocked(fns.getWorkReviewsFn).mockResolvedValue({ data: [] } as unknown as { data: unknown });
        await api.getWorkReviews(2, 'anime');

        expect(localStorageMock['bgk_c_ancient']).toBeUndefined();
        expect(localStorageMock['bgk_c_corrupt']).toBeUndefined();
    });

    it('sert une entrée périmée immédiatement et rafraîchit en arrière-plan', async () => {
        const stale = [{ mal_id: 1, review: 'stale' }];
        const fresh = [{ mal_id: 1, review: 'fresh' }];
        localStorageMock.setItem('bgk_c_anime_222_reviews', JSON.stringify({
            data: stale,
            timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 h > TTL de 1 h
        }));

        const { api, fns } = await loadModules();
        vi.mocked(fns.getWorkReviewsFn).mockResolvedValue({ data: fresh } as unknown as { data: unknown });

        const result = await api.getWorkReviews(222, 'anime');

        expect(result).toEqual(stale); // pas d'attente réseau
        expect(fns.getWorkReviewsFn).toHaveBeenCalledTimes(1); // refresh déclenché
    });

    it('évince un lot d\'entrées (et pas une seule) quand le quota est saturé', async () => {
        const now = Date.now();
        for (let i = 0; i < 8; i++) {
            localStorageMock.setItem(`bgk_c_e${i}`, JSON.stringify({ data: i, timestamp: now - (8 - i) * 1000 }));
        }

        const { api, fns } = await loadModules();
        vi.mocked(fns.getWorkReviewsFn).mockResolvedValue({ data: [] } as unknown as { data: unknown });

        let firstWrite = true;
        vi.mocked(localStorageMock.setItem).mockImplementation(function (this: MockStorage, key: string, value: string) {
            if (firstWrite) {
                firstWrite = false;
                throw new Error('QuotaExceededError');
            }
            this[key] = value;
        });

        await api.getWorkReviews(333, 'anime');

        // ceil(8/4) = 2 entrées les plus anciennes évincées
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('bgk_c_e0');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('bgk_c_e1');
        expect(localStorageMock['bgk_c_e7']).toBeDefined();
    });
});
