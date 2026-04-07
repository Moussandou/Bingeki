import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiQueue, jikanQueue } from '../apiQueue';

describe('apiQueue', () => {
    describe('jikanQueue singleton', () => {
        it('should export jikanQueue object', () => {
            expect(jikanQueue).toBeDefined();
        });

        it('should have a fetch method', () => {
            expect(typeof jikanQueue.fetch).toBe('function');
        });
    });

    describe('ApiQueue implementation', () => {
        let testQueue: ApiQueue;

        beforeEach(() => {
            testQueue = new ApiQueue();
            vi.useFakeTimers();
        });

        afterEach(() => {
            testQueue.clear();
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it('should sequence requests based on minInterval', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: 'ok' }),
            });
            vi.stubGlobal('fetch', mockFetch);

            const p1 = testQueue.fetch('url1');
            const p2 = testQueue.fetch('url2');
            
            // Premier appel immédiat
            await vi.advanceTimersByTimeAsync(0);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Second appel après intervalle (800ms par défaut dans ApiQueue)
            await vi.advanceTimersByTimeAsync(801);
            expect(mockFetch).toHaveBeenCalledTimes(2);
            
            await Promise.all([p1, p2]);
        });
    });
});
