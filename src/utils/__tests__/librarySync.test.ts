import { describe, expect, it } from 'vitest';
import type { LibraryData } from '@/firebase/library';
import type { Work } from '@/store/libraryStore';
import { mergeLibraryData, mergeTombstones } from '../dataProtection';
import {
    assertLibrarySize, cleanLibraryData, estimateLibraryBytes, MAX_LIBRARY_DOCUMENT_BYTES, mergeLibrarySnapshot,
} from '../librarySync';
import { workKey } from '../workIdentity';

const work = (type: Work['type'], lastUpdated = 100): Work => ({
    id: 1, title: type, type, status: 'reading', image: '', lastUpdated,
});
const snapshot = (data: Partial<LibraryData> = {}): LibraryData => ({ works: [], lastUpdated: 0, ...data });

describe('bidirectional deletion merge', () => {
    it('does not resurrect either local or remote stale copies, including an empty cloud library', () => {
        const deletedWorks = [{ id: 1, type: 'anime' as const, deletedAt: 200 }];
        const deviceB = mergeLibrarySnapshot(snapshot({ works: [work('anime'), work('manga')] }), snapshot({ deletedWorks }));
        expect(deviceB.works.map(workKey)).toEqual(['manga:1']);
        expect(deviceB.deletedWorks).toEqual(deletedWorks);
        const deviceC = mergeLibrarySnapshot(snapshot({ works: [work('anime')] }), deviceB);
        expect(deviceC.works.map(workKey)).toEqual(['manga:1']);
        expect(mergeLibraryData([work('anime')], [], deletedWorks)).toEqual([]);
    });

    it('deduplicates tombstones by type and retains legacy untyped and old records indefinitely', () => {
        const old = { id: 1, deletedAt: 1 };
        const a = { id: 1, type: 'anime' as const, deletedAt: 10 };
        const b = { id: 1, type: 'manga' as const, deletedAt: 20 };
        expect(mergeTombstones([old, a], [b, { ...a, deletedAt: 30 }])).toEqual([old, { ...a, deletedAt: 30 }, b]);
        expect(mergeLibraryData([work('anime', 0), work('manga', 0)], null, [old])).toEqual([]);
    });

    it('retains a later explicit re-add and keeps both namespaces in a legacy array', () => {
        const result = mergeLibraryData([work('anime', 300)], [work('anime'), work('manga')], [{ id: 1, type: 'anime', deletedAt: 200 }]);
        expect(result.map(workKey)).toEqual(['anime:1', 'manga:1']);
        expect(mergeLibraryData([work('anime'), { ...work('anime'), id: '1' }], [work('manga')])).toHaveLength(2);
    });

    it('honors the newest work edit independently from metadata timestamps', () => {
        const merged = mergeLibrarySnapshot(snapshot({ works: [{ ...work('anime', 500), notes: 'new' }], metadataUpdatedAt: 10 }),
            snapshot({ works: [work('anime')], metadataUpdatedAt: 20 }));
        expect(merged.works[0].notes).toBe('new');
    });
});

describe('metadata and document compatibility', () => {
    it('preserves legacy cloud folders and library sharing on an empty login', () => {
        const cloud = snapshot({
            works: [work('anime')],
            folders: [{ id: 'f', name: 'F', color: '', emoji: '', createdAt: 1 }],
            sharing: { enabled: true, access: 'friends', sharedAt: 10 },
        });
        expect(mergeLibrarySnapshot(snapshot(), cloud)).toMatchObject(cloud);
    });

    it('uses newer metadata, and preserves independently updated folder sharing', () => {
        const folder = { id: 'f', name: 'F', color: '', emoji: '', createdAt: 1 };
        const local = snapshot({ folders: [{ ...folder, name: 'renamed' }], metadataUpdatedAt: 100 });
        const cloud = snapshot({ folders: [{ ...folder, sharing: { enabled: true, access: 'public', sharedAt: 90 } }], metadataUpdatedAt: 80 });
        expect(mergeLibrarySnapshot(local, cloud).folders?.[0]).toEqual({ ...cloud.folders![0], name: 'renamed' });
    });

    it('lets an intentionally empty newer folder list remove old folders', () => {
        const cloud = snapshot({ folders: [{ id: 'f', name: 'F', color: '', emoji: '', createdAt: 1 }], metadataUpdatedAt: 1 });
        expect(mergeLibrarySnapshot(snapshot({ folders: [], metadataUpdatedAt: 2 }), cloud).folders).toEqual([]);
    });

    it('strips optional undefined fields but rejects non-finite numbers rather than silently converting them', () => {
        expect(cleanLibraryData(snapshot({ works: [{ ...work('anime'), notes: undefined }] })).works[0]).not.toHaveProperty('notes');
        expect(() => cleanLibraryData(snapshot({ works: [{ ...work('anime'), rating: Infinity }] }))).toThrow('Non-finite');
    });
});

describe('explicit Firestore size boundary', () => {
    it('accepts exactly 900 KiB and rejects one byte above without modifying data', () => {
        const data = snapshot({ works: [{ ...work('anime'), notes: '' }] });
        const overhead = estimateLibraryBytes(data);
        data.works[0].notes = 'a'.repeat(MAX_LIBRARY_DOCUMENT_BYTES - overhead);
        expect(estimateLibraryBytes(data)).toBe(MAX_LIBRARY_DOCUMENT_BYTES);
        expect(() => assertLibrarySize(data)).not.toThrow();
        data.works[0].notes += 'a';
        expect(() => assertLibrarySize(data)).toThrow('Local data is preserved');
        expect(data.works[0].notes).toHaveLength(MAX_LIBRARY_DOCUMENT_BYTES - overhead + 1);
    });

    it('counts UTF-8 bytes, retained tombstones and inline images, not JavaScript character length', () => {
        expect(estimateLibraryBytes('あ')).toBe(4);
        const data = snapshot({ works: [{ ...work('anime'), image: 'data:image/png;base64,' + 'a'.repeat(MAX_LIBRARY_DOCUMENT_BYTES) }] });
        expect(() => assertLibrarySize(data)).toThrow('exceeds');
        expect(estimateLibraryBytes(snapshot({ deletedWorks: [{ id: 1, type: 'anime', deletedAt: 1 }] })))
            .toBeGreaterThan(estimateLibraryBytes(snapshot()));
    });
});
