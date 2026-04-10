/**
 * Mal Import Service service layer
 */
import { logger } from '@/utils/logger';
/**
 * MyAnimeList Import Service
 * Handles parsing MAL XML exports and converting them to Bingeki Work format
 */

import type { Work } from '@/store/libraryStore';
import { getWorkDetails } from '@/services/animeApi';
import pako from 'pako';

// MAL XML Entry structure
export interface MALEntry {
    malId: number;
    title: string;
    type: 'anime' | 'manga';
    currentProgress: number;
    totalProgress: number | null;
    status: string;
    score: number;
    // Raw XML data for reference
    rawData?: Record<string, string>;
}

// Import result for a single entry
export interface ImportEntryResult {
    entry: MALEntry;
    status: 'success' | 'duplicate' | 'error' | 'skipped';
    work?: Work;
    existingWork?: Work;
    error?: string;
}

// Overall import result
export interface ImportResult {
    total: number;
    imported: number;
    duplicates: MALEntry[];
    errors: { entry: MALEntry; error: string }[];
    skipped: number;
}

// Duplicate resolution options
export type DuplicateAction = 'overwrite' | 'skip' | 'keep_existing';

// Status mapping: MAL -> Bingeki
const STATUS_MAP: Record<string, Work['status']> = {
    // Anime statuses
    'Watching': 'reading',
    'Completed': 'completed',
    'On-Hold': 'on_hold',
    'Dropped': 'dropped',
    'Plan to Watch': 'plan_to_read',
    // Manga statuses
    'Reading': 'reading',
    'Plan to Read': 'plan_to_read',
};

/**
 * Parse a MAL XML export file (supports .xml and .xml.gz)
 */
export async function parseMALExport(file: File): Promise<MALEntry[]> {
    let xmlContent: string;

    // Handle gzipped files
    if (file.name.endsWith('.gz')) {
        const arrayBuffer = await file.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
        xmlContent = new TextDecoder('utf-8').decode(decompressed);
    } else {
        xmlContent = await file.text();
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid XML file: ' + parseError.textContent);
    }

    const entries: MALEntry[] = [];

    // Parse anime entries
    const animeNodes = doc.querySelectorAll('anime');
    animeNodes.forEach((node) => {
        const entry = parseAnimeNode(node);
        if (entry) entries.push(entry);
    });

    // Parse manga entries
    const mangaNodes = doc.querySelectorAll('manga');
    mangaNodes.forEach((node) => {
        const entry = parseMangaNode(node);
        if (entry) entries.push(entry);
    });

    return entries;
}

/**
 * Parse a single anime XML node
 */
function parseAnimeNode(node: Element): MALEntry | null {
    const malId = getNodeText(node, 'series_animedb_id');
    const title = getNodeText(node, 'series_title');

    if (!malId || !title) return null;

    return {
        malId: parseInt(malId, 10),
        title: cleanCDATA(title),
        type: 'anime',
        currentProgress: parseInt(getNodeText(node, 'my_watched_episodes') || '0', 10),
        totalProgress: parseIntOrNull(getNodeText(node, 'series_episodes')),
        status: getNodeText(node, 'my_status') || 'Plan to Watch',
        score: parseInt(getNodeText(node, 'my_score') || '0', 10),
    };
}

/**
 * Parse a single manga XML node
 */
function parseMangaNode(node: Element): MALEntry | null {
    const malId = getNodeText(node, 'manga_mangadb_id');
    const title = getNodeText(node, 'manga_title');

    if (!malId || !title) return null;

    return {
        malId: parseInt(malId, 10),
        title: cleanCDATA(title),
        type: 'manga',
        currentProgress: parseInt(getNodeText(node, 'my_read_chapters') || '0', 10),
        totalProgress: parseIntOrNull(getNodeText(node, 'manga_chapters')),
        status: getNodeText(node, 'my_status') || 'Plan to Read',
        score: parseInt(getNodeText(node, 'my_score') || '0', 10),
    };
}

/**
 * Helper to get text content from a child node
 */
function getNodeText(parent: Element, tagName: string): string | null {
    const node = parent.querySelector(tagName);
    return node?.textContent ?? null;
}

/**
 * Clean CDATA wrappers from text
 */
function cleanCDATA(text: string): string {
    return text.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

/**
 * Parse int or return null
 */
function parseIntOrNull(value: string | null): number | null {
    if (!value || value === '0') return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Map MAL status to Bingeki status
 */
export function mapStatus(malStatus: string): Work['status'] {
    return STATUS_MAP[malStatus] || 'plan_to_read';
}

/**
 * Convert a MAL entry to a partial Work (without enriched data)
 */
export function mapMALToPartialWork(entry: MALEntry): Partial<Work> {
    return {
        id: entry.malId,
        title: entry.title,
        type: entry.type,
        currentChapter: entry.currentProgress,
        totalChapters: entry.totalProgress,
        status: mapStatus(entry.status),
        rating: entry.score > 0 ? entry.score : undefined,
        image: '', // Will be enriched from Jikan
    };
}

/**
 * Enrich a MAL entry with full data from Jikan API
 */
export async function enrichWithJikan(
    entry: MALEntry,
    onProgress?: (message: string) => void
): Promise<Work> {
    onProgress?.(`Fetching details for ${entry.title}...`);

    try {
        const details = await getWorkDetails(entry.malId, entry.type);

        return {
            id: entry.malId,
            title: details.title || entry.title,
            image: details.images?.jpg?.large_image_url || details.images?.jpg?.image_url || '',
            type: entry.type,
            format: details.type,
            totalChapters: (entry.type === 'manga' ? details.chapters : details.episodes) ?? undefined,
            currentChapter: entry.currentProgress,
            status: mapStatus(entry.status),
            score: details.score ?? undefined,
            rating: entry.score > 0 ? entry.score : undefined,
            synopsis: details.synopsis,
            genres: details.genres,
            year: details.year,
            rank: details.rank,
            popularity: details.popularity,
            source: details.source,
        };
    } catch (error) {
        // Fallback to partial data if Jikan fails
        logger.warn(`Failed to fetch details for ${entry.title}:`, error);
        return {
            id: entry.malId,
            title: entry.title,
            image: '',
            type: entry.type,
            totalChapters: entry.totalProgress ?? undefined,
            currentChapter: entry.currentProgress,
            status: mapStatus(entry.status),
            rating: entry.score > 0 ? entry.score : undefined,
        };
    }
}

/**
 * Delay utility for rate limiting
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a work already exists in the library
 */
export function findDuplicate(entry: MALEntry, existingWorks: Work[]): Work | undefined {
    return existingWorks.find((w) => w.id === entry.malId);
}
