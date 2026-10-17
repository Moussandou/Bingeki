import type { LibraryData } from '@/firebase/library';
import { mergeLibraryData, mergeTombstones } from '@/utils/dataProtection';

export function mergeLibrarySnapshot(local: LibraryData, cloud: LibraryData | null): LibraryData {
    const deletedWorks = mergeTombstones(local.deletedWorks, cloud?.deletedWorks);
    const localMetadataWins = !cloud || (local.metadataUpdatedAt || 0) > (cloud.metadataUpdatedAt || 0);
    const metadata = localMetadataWins ? local : cloud!;
    const other = localMetadataWins ? cloud : local;
    const folders = (metadata.folders || other?.folders || []).map(folder => {
        const otherFolder = other?.folders?.find(f => f.id === folder.id);
        const sharing = (otherFolder?.sharing?.sharedAt || 0) > (folder.sharing?.sharedAt || 0)
            ? otherFolder?.sharing : folder.sharing;
        return sharing ? { ...folder, sharing } : folder;
    });
    return {
        ...cloud,
        works: mergeLibraryData(
            localMetadataWins ? local.works : cloud?.works,
            localMetadataWins ? cloud?.works || null : local.works,
            deletedWorks,
        ),
        deletedWorks,
        folders,
        viewMode: metadata.viewMode || other?.viewMode || 'grid',
        sortBy: metadata.sortBy || other?.sortBy || 'updated',
        metadataUpdatedAt: Math.max(local.metadataUpdatedAt || 0, cloud?.metadataUpdatedAt || 0),
        lastUpdated: Math.max(local.lastUpdated || 0, cloud?.lastUpdated || 0),
    };
}

// Below Firestore's 1 MiB hard limit, leaving room for field/path overhead.
export const MAX_LIBRARY_DOCUMENT_BYTES = 900 * 1024;

/** Conservative upper bound including Firestore field names and per-container overhead. */
export function estimateLibraryBytes(value: unknown): number {
    if (value === null || value === undefined) return 1;
    if (typeof value === 'string') return new TextEncoder().encode(value).length + 1;
    if (typeof value === 'boolean') return 1;
    if (typeof value === 'number') return 8;
    if (Array.isArray(value)) return 32 + value.reduce((sum, item) => sum + estimateLibraryBytes(item), 0);
    if (typeof value === 'object') return 32 + Object.entries(value).reduce(
        (sum, [key, item]) => sum + estimateLibraryBytes(key) + estimateLibraryBytes(item), 0,
    );
    throw new Error('Unsupported value in library document');
}

export function assertLibrarySize(data: LibraryData): void {
    const bytes = estimateLibraryBytes(data);
    if (bytes > MAX_LIBRARY_DOCUMENT_BYTES) {
        throw new Error(`Library sync exceeds ${MAX_LIBRARY_DOCUMENT_BYTES} bytes (${bytes}). Local data is preserved; export a backup and reduce images or notes before retrying.`);
    }
}

/** Firestore rejects optional properties explicitly set to undefined. */
export function cleanLibraryData(data: LibraryData): LibraryData {
    const clean = (value: unknown): unknown => {
        if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite number in library document');
        if (Array.isArray(value)) return value.map(item => {
            if (item === undefined) throw new Error('Undefined array item in library document');
            return clean(item);
        });
        if (value !== null && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value)
                .filter(([, item]) => item !== undefined)
                .map(([key, item]) => [key, clean(item)]));
        }
        return value;
    };
    return clean(data) as LibraryData;
}
