/**
 * Priority-aware concurrent task queue with retry and abort support
 */
import { logger } from '@/utils/logger';

export type Priority = 'high' | 'medium' | 'low';

export interface QueueOptions {
    priority?: Priority;
    signal?: AbortSignal;
}

interface QueuedTask {
    fn: () => Promise<unknown>;
    priority: Priority;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    signal?: AbortSignal;
    retries: number;
}

const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];
const DEFAULT_MAX_CONCURRENT = 4;
const MAX_RETRIES = 3;

export class PriorityQueue {
    private queues: Record<Priority, QueuedTask[]> = { high: [], medium: [], low: [] };
    private activeSlots = 0;

    private readonly baseRetryDelay: number;
    private readonly maxConcurrent: number;


    constructor(baseRetryDelay: number = 1000, maxConcurrent: number = DEFAULT_MAX_CONCURRENT) {
        this.baseRetryDelay = baseRetryDelay;
        this.maxConcurrent = maxConcurrent;
    }

    run<T>(fn: () => Promise<T>, options?: QueueOptions): Promise<T> {
        const { priority = 'medium', signal } = options ?? {};

        if (signal?.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }

        return new Promise<T>((resolve, reject) => {
            const task: QueuedTask = {
                fn: fn as () => Promise<unknown>,
                priority,
                resolve: resolve as (v: unknown) => void,
                reject,
                signal,
                retries: 0,
            };
            this.queues[priority].push(task);
            this.drain();
        });
    }

    private drain(): void {
        while (this.activeSlots < this.maxConcurrent) {
            this.pruneAborted();
            const task = this.dequeue();
            if (!task) break;
            this.activeSlots++;
            this.execute(task).finally(() => {
                this.activeSlots--;
                this.drain();
            });
        }
    }

    private pruneAborted(): void {
        for (const p of PRIORITY_ORDER) {
            this.queues[p] = this.queues[p].filter(task => {
                if (task.signal?.aborted) {
                    task.reject(new DOMException('Aborted', 'AbortError'));
                    return false;
                }
                return true;
            });
        }
    }

    private dequeue(): QueuedTask | undefined {
        for (const p of PRIORITY_ORDER) {
            if (this.queues[p].length > 0) return this.queues[p].shift();
        }
        return undefined;
    }

    private async execute(task: QueuedTask): Promise<void> {
        if (task.signal?.aborted) {
            task.reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        try {
            const result = await task.fn();
            task.resolve(result);
        } catch (error) {
            const isAbort = error instanceof Error && error.name === 'AbortError';
            const is4xx =
                error instanceof Error &&
                'status' in error &&
                typeof (error as { status: unknown }).status === 'number' &&
                (error as { status: number }).status >= 400 &&
                (error as { status: number }).status < 500;

            if (isAbort || is4xx || task.retries >= MAX_RETRIES) {
                task.reject(error);
                return;
            }

            task.retries++;
            const delay = this.baseRetryDelay * Math.pow(2, task.retries - 1);
            logger.warn(`[PriorityQueue] Retry ${task.retries}/${MAX_RETRIES} in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            // Re-queue at front for retry
            this.queues[task.priority].unshift(task);
        }
    }

    get status(): { active: number; pending: number } {
        const pending = PRIORITY_ORDER.reduce((sum, p) => sum + this.queues[p].length, 0);
        return { active: this.activeSlots, pending };
    }
}


export const jikanQueue = new PriorityQueue();
