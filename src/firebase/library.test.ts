import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Work } from '@/store/libraryStore';
import {
    loadFullLibraryData, saveLibraryToFirestore, updateFolderSharing,
    type LibraryData,
} from './library';
import { MAX_LIBRARY_DOCUMENT_BYTES } from '@/utils/librarySync';
import { workKey } from '@/utils/workIdentity';

const mocks = vi.hoisted(() => ({
    read: vi.fn(),
    write: vi.fn(),
    update: vi.fn(),
    runTransaction: vi.fn(),
    getDoc: vi.fn(),
    callable: vi.fn(),
    httpsCallable: vi.fn(),
}));
vi.mock('./config', () => ({ db: {}, auth: { currentUser: { uid: 'A' } }, functions: {} }));
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => 'library-ref'),
    getDoc: mocks.getDoc,
    runTransaction: mocks.runTransaction,
    updateDoc: vi.fn(),
    onSnapshot: vi.fn(),
}));
vi.mock('firebase/functions', () => ({ httpsCallable: mocks.httpsCallable }));

const work = (id: number, type: Work['type'] = 'anime', lastUpdated = 10): Work => ({
    id, type, title: `${type} ${id}`, image: '', status: 'reading', lastUpdated,
});
const snapshot = (data: LibraryData | null) => ({
    exists: () => data !== null,
    data: () => data,
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.read.mockResolvedValue(snapshot(null));
    mocks.getDoc.mockResolvedValue(snapshot(null));
    mocks.runTransaction.mockImplementation(async (_db, body) => body({
        get: mocks.read, set: mocks.write, update: mocks.update,
    }));
    mocks.httpsCallable.mockReturnValue(mocks.callable);
});

describe('transactional library persistence', () => {
    it('reads and merges within the transaction, preserves sharing and sanitizes optional values', async () => {
        const sharing = { enabled: true, access: 'friends' as const, sharedAt: 1 };
        mocks.read.mockResolvedValue(snapshot({
            works: [work(1), work(1, 'manga')], lastUpdated: 10, version: 2, sharing,
        }));
        const saved = await saveLibraryToFirestore('A', [{ ...work(2), notes: undefined }]);
        expect(mocks.runTransaction).toHaveBeenCalledTimes(1);
        expect(mocks.getDoc).not.toHaveBeenCalled();
        expect(saved.works.map(workKey)).toEqual(['anime:2', 'anime:1', 'manga:1']);
        expect(saved).toMatchObject({ sharing, version: 3 });
        expect(saved.works[0]).not.toHaveProperty('notes');
        expect(mocks.write).toHaveBeenCalledWith('library-ref', saved, { merge: true });
    });

    it('re-merges the newly committed cloud data when Firestore retries a conflicted transaction', async () => {
        const initial: LibraryData = { works: [work(1)], lastUpdated: 10, version: 1 };
        const concurrent: LibraryData = {
            works: [work(1), work(3)], lastUpdated: 20, version: 2,
            sharing: { enabled: true, access: 'public', sharedAt: 20 },
        };
        mocks.runTransaction.mockImplementationOnce(async (_db, body) => {
            mocks.read.mockResolvedValueOnce(snapshot(initial));
            await body({ get: mocks.read, set: mocks.write });
            mocks.read.mockResolvedValueOnce(snapshot(concurrent));
            return body({ get: mocks.read, set: mocks.write });
        });
        const saved = await saveLibraryToFirestore('A', [work(2)]);
        expect(saved.works.map(workKey)).toEqual(['anime:2', 'anime:1', 'anime:3']);
        expect(saved.version).toBe(3);
        expect(saved.sharing?.access).toBe('public');
        expect(mocks.write.mock.lastCall?.[1]).toEqual(saved);
    });

    it('propagates deletions to the document and blocks resurrection from a second device', async () => {
        mocks.read.mockResolvedValue(snapshot({
            works: [work(1), work(1, 'manga')], lastUpdated: 10,
        }));
        const deletedWorks = [{ id: 1, type: 'anime' as const, deletedAt: 20 }];
        const first = await saveLibraryToFirestore('A', [work(1, 'manga')], [], 'grid', 'updated', { tombstones: deletedWorks });
        expect(first.deletedWorks).toEqual(deletedWorks);
        mocks.read.mockResolvedValue(snapshot(first));
        const second = await saveLibraryToFirestore('A', [work(1), work(1, 'manga')]);
        expect(second.works.map(workKey)).toEqual(['manga:1']);
        expect(second.deletedWorks).toEqual(deletedWorks);
    });

    it('makes explicit replacements tombstone omitted works rather than resurrecting them on another device', async () => {
        mocks.read.mockResolvedValue(snapshot({
            works: [work(1), work(2)], lastUpdated: 10, sharing: { enabled: false, access: 'friends' },
        }));
        const cleared = await saveLibraryToFirestore('A', [], [], 'grid', 'updated', { replace: true });
        expect(cleared.works).toEqual([]);
        expect(cleared.deletedWorks).toEqual([
            expect.objectContaining({ id: 1, type: 'anime' }),
            expect.objectContaining({ id: 2, type: 'anime' }),
        ]);
        expect(cleared.sharing?.enabled).toBe(false);
    });

    it('rejects oversized and invalid documents before scheduling a transaction write', async () => {
        const local = [{ ...work(1), notes: 'x'.repeat(MAX_LIBRARY_DOCUMENT_BYTES) }];
        await expect(saveLibraryToFirestore('A', local)).rejects.toThrow('Local data is preserved');
        expect(mocks.write).not.toHaveBeenCalled();
        expect(local[0].notes).toHaveLength(MAX_LIBRARY_DOCUMENT_BYTES);
        await expect(saveLibraryToFirestore('A', [{ ...work(1), rating: NaN }])).rejects.toThrow('Non-finite');
        expect(mocks.write).not.toHaveBeenCalled();
    });

    it('updates folder sharing transactionally without replacing other document fields', async () => {
        mocks.read.mockResolvedValue(snapshot({
            works: [work(1)], lastUpdated: 10,
            folders: [{ id: 'f', name: 'folder', color: '', emoji: '', createdAt: 1 }],
        }));
        await updateFolderSharing('A', 'f', { enabled: true, access: 'public' });
        expect(mocks.update).toHaveBeenCalledWith('library-ref', {
            folders: [expect.objectContaining({ id: 'f', sharing: expect.objectContaining({ access: 'public' }) })],
        });
        expect(mocks.getDoc).not.toHaveBeenCalled();
    });
});

describe('read errors and shared projections', () => {
    it('distinguishes a missing owner library from a failed read', async () => {
        expect(await loadFullLibraryData('A')).toBeNull();
        mocks.getDoc.mockRejectedValueOnce(new Error('permission-denied'));
        await expect(loadFullLibraryData('A')).rejects.toThrow('permission-denied');
    });

    it('uses the server projection with folderId for every non-owner read', async () => {
        const projection = { works: [work(1)], lastUpdated: 1 };
        mocks.callable.mockResolvedValue({ data: projection });
        expect(await loadFullLibraryData('B', 'folder')).toEqual(projection);
        expect(mocks.httpsCallable).toHaveBeenCalledWith({}, 'getSharedLibraryFn');
        expect(mocks.callable).toHaveBeenCalledWith({ userId: 'B', folderId: 'folder' });
        expect(mocks.getDoc).not.toHaveBeenCalled();
        mocks.callable.mockRejectedValueOnce(new Error('permission-denied'));
        await expect(loadFullLibraryData('B')).rejects.toThrow('permission-denied');
    });
});
