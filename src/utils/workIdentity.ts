import type { Work } from '@/store/libraryStore';
import { logger } from '@/utils/logger';

export function workKey(work: Pick<Work, 'type' | 'id'>): string {
    return `${work.type}:${work.id}`;
}

export function normalizeWorkType(type?: string): Work['type'] {
    return ['manga', 'novel', 'light novel', 'manhwa', 'manhua', 'doujinshi', 'one-shot', 'oneshot', 'oel']
        .includes((type || '').toLowerCase()) ? 'manga' : 'anime';
}

/** Legacy raw IDs are accepted only when they identify exactly one work. */
export function resolveWork(works: Work[], id: number | string): Work | undefined {
    const keyed = works.find(work => workKey(work) === String(id));
    if (keyed) return keyed;
    const matches = works.filter(work => String(work.id) === String(id));
    if (matches.length > 1) {
        const error = new Error(`Ambiguous work ID ${id}; use type:id`);
        logger.error('[Library]', error);
        throw error;
    }
    return matches[0];
}

export function nextWorkTimestamp(work: Work): number {
    return Math.max(Date.now(), (work.lastUpdated || 0) + 1);
}
