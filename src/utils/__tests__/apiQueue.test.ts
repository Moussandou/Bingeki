import { describe, it, expect, vi } from 'vitest';
import { PriorityQueue, jikanQueue } from '../apiQueue';

describe('PriorityQueue', () => {
    describe('singleton export', () => {
        it('exports jikanQueue as PriorityQueue instance', () => {
            expect(jikanQueue).toBeInstanceOf(PriorityQueue);
        });

        it('has a run method', () => {
            expect(typeof jikanQueue.run).toBe('function');
        });
    });

    describe('basic execution', () => {
        it('resolves the return value of the task', async () => {
            const queue = new PriorityQueue(0);
            const result = await queue.run(async () => 42);
            expect(result).toBe(42);
        });

        it('rejects when the task throws', async () => {
            const queue = new PriorityQueue(0);
            await expect(
                queue.run(async () => { throw new Error('boom'); })
            ).rejects.toThrow('boom');
        });
    });

    describe('priority ordering', () => {
        it('drains high before medium before low', async () => {
            // Use 1 slot so ordering is deterministic
            const queue = new PriorityQueue(0, 1);
            const order: string[] = [];

            // Block the single slot
            let releaseBlocker!: () => void;
            const blocker = queue.run(() => new Promise<void>(r => { releaseBlocker = r; }));

            // Queue in reverse priority order
            const low = queue.run(async () => { order.push('low'); }, { priority: 'low' });
            const medium = queue.run(async () => { order.push('medium'); }, { priority: 'medium' });
            const high = queue.run(async () => { order.push('high'); }, { priority: 'high' });

            releaseBlocker();
            await Promise.all([blocker, low, medium, high]);

            expect(order).toEqual(['high', 'medium', 'low']);
        });
    });

    describe('concurrency', () => {
        it('runs at most maxConcurrent tasks simultaneously', async () => {
            const queue = new PriorityQueue(0, 4);
            let active = 0;
            let maxActive = 0;

            const tasks = Array.from({ length: 8 }, () =>
                queue.run(async () => {
                    active++;
                    maxActive = Math.max(maxActive, active);
                    await new Promise(r => setTimeout(r, 10));
                    active--;
                })
            );

            await Promise.all(tasks);
            expect(maxActive).toBeLessThanOrEqual(4);
            expect(maxActive).toBeGreaterThan(1); // actually concurrent
        });
    });

    describe('abort signal', () => {
        it('rejects immediately with AbortError when signal is already aborted', async () => {
            const queue = new PriorityQueue(0);
            const controller = new AbortController();
            controller.abort();

            await expect(
                queue.run(async () => 'result', { signal: controller.signal })
            ).rejects.toMatchObject({ name: 'AbortError' });
        });

        it('does not execute task if signal is aborted while waiting in queue', async () => {
            const queue = new PriorityQueue(0, 1);
            const fn = vi.fn().mockResolvedValue('result');
            const controller = new AbortController();

            // Block the single slot
            let releaseBlocker!: () => void;
            const blocker = queue.run(() => new Promise<void>(r => { releaseBlocker = r; }));

            // Queue the task, then abort before the slot opens
            const p = queue.run(fn, { signal: controller.signal });
            controller.abort();

            releaseBlocker();
            await blocker;
            await p.catch(() => {}); // suppress rejection

            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe('retry with exponential backoff', () => {
        it('retries up to 3 times on generic errors', async () => {
            const queue = new PriorityQueue(0); // 0ms delay for fast tests
            const fn = vi.fn()
                .mockRejectedValueOnce(new Error('server error'))
                .mockRejectedValueOnce(new Error('server error'))
                .mockResolvedValue('ok');

            const result = await queue.run(fn);
            expect(result).toBe('ok');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('fails after exhausting all retries', async () => {
            const queue = new PriorityQueue(0);
            const fn = vi.fn().mockRejectedValue(new Error('always fails'));

            await expect(queue.run(fn)).rejects.toThrow('always fails');
            expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
        });

        it('does not retry on 4xx errors', async () => {
            const queue = new PriorityQueue(0);
            const error = Object.assign(new Error('Not Found'), { status: 404 });
            const fn = vi.fn().mockRejectedValue(error);

            await expect(queue.run(fn)).rejects.toMatchObject({ status: 404 });
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('does not retry on AbortError', async () => {
            const queue = new PriorityQueue(0);
            const fn = vi.fn().mockRejectedValue(
                Object.assign(new Error('Aborted'), { name: 'AbortError' })
            );

            await expect(queue.run(fn)).rejects.toMatchObject({ name: 'AbortError' });
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it.each([
            'functions/resource-exhausted',
            'functions/unavailable',
            'functions/internal',
        ])('does not retry on %s (backend already retried)', async (code) => {
            const queue = new PriorityQueue(0);
            const fn = vi.fn().mockRejectedValue(Object.assign(new Error('upstream down'), { code }));

            await expect(queue.run(fn)).rejects.toMatchObject({ code });
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('frees the concurrency slot during the retry backoff', async () => {
            const queue = new PriorityQueue(50, 1); // single slot, 50ms backoff
            const order: string[] = [];
            let hasFailed = false;

            const a = queue.run(async () => {
                if (!hasFailed) {
                    hasFailed = true;
                    order.push('a-fail');
                    throw new Error('temporary');
                }
                order.push('a-retry');
            });
            const b = queue.run(async () => { order.push('b'); });

            await Promise.all([a, b]);

            // b must run during a's backoff, not after it
            expect(order).toEqual(['a-fail', 'b', 'a-retry']);
        });
    });

    describe('status', () => {
        it('reports zero active and pending when idle', () => {
            const queue = new PriorityQueue(0);
            expect(queue.status).toEqual({ active: 0, pending: 0 });
        });
    });
});
