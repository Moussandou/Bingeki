/**
 * API Request Queue
 * 
 * Throttles requests to external APIs to avoid rate limiting.
 * Jikan API limit: 3 requests/second, 60 requests/minute
 */

interface QueuedRequest {
    url: string;
    options?: RequestInit;
    resolve: (value: Response) => void;
    reject: (reason: Error) => void;
    retries: number;
}

class ApiQueue {
    private queue: QueuedRequest[] = [];
    private processing = false;
    private lastRequestTime = 0;
    private readonly minInterval = 500; // 2 requests/sec to stay safe under 60/min
    private readonly maxRetries = 3;
    private readonly retryDelay = 2000; // Wait 2s on 429

    /**
     * Add a request to the queue
     */
    async fetch(url: string, options?: RequestInit): Promise<Response> {
        return new Promise((resolve, reject) => {
            this.queue.push({ url, options, resolve, reject, retries: 0 });
            this.processQueue();
        });
    }

    /**
     * Process the queue with rate limiting
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const request = this.queue.shift()!;

            // Ensure minimum interval between requests
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.minInterval) {
                await this.delay(this.minInterval - timeSinceLastRequest);
            }

            try {
                this.lastRequestTime = Date.now();
                
                // Create a timeout controller
                const timeoutController = new AbortController();
                const timeoutId = setTimeout(() => timeoutController.abort(), 10000); // 10s default timeout

                const fetchOptions = {
                    ...request.options,
                    signal: request.options?.signal 
                        ? AbortSignal.any([request.options.signal, timeoutController.signal])
                        : timeoutController.signal
                };

                const response = await fetch(request.url, fetchOptions);
                clearTimeout(timeoutId);

                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfterHeader = response.headers.get('Retry-After');
                    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader) * 1000 : this.retryDelay;
                    console.warn(`[ApiQueue] Rate limit hit for ${request.url}, retrying in ${retryAfter}ms...`);
                    await this.delay(retryAfter);
                    this.queue.unshift(request);
                    continue;
                }

                request.resolve(response);
            } catch (error) {
                const isTimeout = error instanceof Error && error.name === 'AbortError';
                const errorMsg = isTimeout ? 'Request timed out' : String(error);
                
                if (request.retries < this.maxRetries) {
                    request.retries++;
                    console.warn(`[ApiQueue] Error fetching ${request.url} (Attempt ${request.retries}/${this.maxRetries}): ${errorMsg}`);
                    this.queue.unshift(request);
                    await this.delay(500); 
                    continue;
                }
                
                console.error(`[ApiQueue] Failed to fetch ${request.url} after ${this.maxRetries} attempts: ${errorMsg}`);
                request.reject(error instanceof Error ? error : new Error(String(error)));
            }
        }

        this.processing = false;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear all pending requests
     */
    clear(): void {
        const pending = this.queue.splice(0);
        pending.forEach(req => req.reject(new Error('Queue cleared')));
    }

    /**
     * Get queue status for debugging
     */
    get status(): { pending: number; processing: boolean } {
        return {
            pending: this.queue.length,
            processing: this.processing
        };
    }
}

// Singleton instance for Jikan API
export const jikanQueue = new ApiQueue();

/**
 * Wrapper for fetch that uses the queue
 * Drop-in replacement for fetch() calls to Jikan API
 */
export const queuedFetch = (url: string, options?: RequestInit): Promise<Response> => {
    return jikanQueue.fetch(url, options);
};
