import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLibraryStore, type Work } from './libraryStore';
import { useGamificationStore } from './gamificationStore';
import { activateLibraryOwner } from '@/utils/libraryAccountScope';
import { workKey } from '@/utils/workIdentity';
import { mergeLibraryData } from '@/utils/dataProtection';
import { findDuplicate, type MALEntry } from '@/services/malImportService';

vi.mock('@/services/animeApi', () => ({ getWorkDetails: vi.fn() }));

const work = (type: Work['type'] = 'anime', id: Work['id'] = 1): Work => ({
    id, type, title: `${type} ${id}`, image: '', status: 'reading',
});

beforeEach(() => {
    localStorage.clear();
    useLibraryStore.getState().resetStoreBase();
    useLibraryStore.setState({ ownerId: null });
    useGamificationStore.getState().resetStore();
    vi.restoreAllMocks();
});

describe('composite library identity', () => {
    it('stores equal MAL numbers from both namespaces and preserves numeric/string legacy IDs', () => {
        const store = useLibraryStore.getState();
        store.addWork(work());
        store.addWork(work('manga', '1'));
        store.addWork(work('anime', '1'));
        expect(useLibraryStore.getState().works).toHaveLength(2);
        expect(store.getWork('anime:1')?.type).toBe('anime');
        expect(store.getWork('manga:1')?.type).toBe('manga');
        expect(() => store.updateStatus(1, 'completed')).toThrow('Ambiguous');
    });

    it('timestamps status, rating, notes and folder membership, even in one clock tick', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1000);
        const store = useLibraryStore.getState();
        store.addWork(work());
        store.addWork(work('manga'));
        store.updateStatus('anime:1', 'completed');
        expect(store.getWork('anime:1')?.lastUpdated).toBe(1001);
        store.updateWorkDetails('anime:1', { notes: 'note', rating: 8, id: 55, type: 'manga' });
        expect(store.getWork('anime:1')).toMatchObject({ id: 1, type: 'anime', notes: 'note', rating: 8, lastUpdated: 1002 });
        store.addToFolder('anime:1', 'folder');
        expect(store.getWork('anime:1')).toMatchObject({ collections: ['folder'], lastUpdated: 1003 });
        store.removeFromFolder('anime:1', 'folder');
        expect(store.getWork('anime:1')?.lastUpdated).toBe(1004);
        expect(store.getWork('manga:1')).toMatchObject({ status: 'reading', lastUpdated: 1000 });
    });

    it('deletes just one namespace and retains history when explicitly re-added', () => {
        const store = useLibraryStore.getState();
        store.addWork(work());
        store.addWork(work('manga'));
        const old = [...useLibraryStore.getState().works];
        store.removeWork('anime:1');
        expect(useLibraryStore.getState().deletedWorks).toEqual([
            expect.objectContaining({ id: 1, type: 'anime' }),
        ]);
        expect(mergeLibraryData(old, [], useLibraryStore.getState().deletedWorks).map(workKey)).toEqual(['manga:1']);
        store.addWork(work());
        expect(useLibraryStore.getState().deletedWorks).toHaveLength(1);
        expect(mergeLibraryData(useLibraryStore.getState().works, old, useLibraryStore.getState().deletedWorks)).toHaveLength(2);
    });

    it('does not timestamp unrelated works when removing a folder', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1000);
        const store = useLibraryStore.getState();
        store.addWork({ ...work('anime'), collections: ['f'] });
        store.addWork(work('manga'));
        store.deleteFolder('f');
        expect(store.getWork('anime:1')).toMatchObject({ collections: [], lastUpdated: 1001 });
        expect(store.getWork('manga:1')?.lastUpdated).toBe(1000);
    });

    it('treats MAL imports as duplicates only within the same media type', () => {
        const entry: MALEntry = { malId: 1, title: 'M', type: 'manga', currentProgress: 0, totalProgress: 1, status: 'Reading', score: 0 };
        expect(findDuplicate(entry, [work()])).toBeUndefined();
        expect(findDuplicate(entry, [work('manga', '1')])?.type).toBe('manga');
    });
});

describe('account-scoped persistence', () => {
    it('preserves guests across an initial null auth callback and a refresh', async () => {
        useLibraryStore.getState().addWork(work());
        activateLibraryOwner(null);
        await useLibraryStore.persist.rehydrate();
        activateLibraryOwner(null);
        expect(useLibraryStore.getState().works.map(workKey)).toEqual(['anime:1']);
    });

    it('restores guest, A and B independently without carrying private works or bonus XP', () => {
        useLibraryStore.getState().addWork(work('manga', 5));
        activateLibraryOwner('A');
        useLibraryStore.getState().addWork(work('anime', 9));
        useGamificationStore.setState({ bonusXp: 500 });
        activateLibraryOwner('B');
        expect(useLibraryStore.getState().works).toEqual([]);
        expect(useGamificationStore.getState().bonusXp).toBe(0);
        useLibraryStore.getState().addWork(work('anime', 20));
        activateLibraryOwner(null);
        expect(useLibraryStore.getState().works.map(workKey)).toEqual(['manga:5']);
        activateLibraryOwner('A');
        expect(useLibraryStore.getState().works.map(workKey)).toEqual(['anime:9']);
        expect(useGamificationStore.getState().bonusXp).toBe(500);
        activateLibraryOwner('B');
        expect(useLibraryStore.getState().works.map(workKey)).toEqual(['anime:20']);
    });

    it('restores the correct owner after refreshing an authenticated scope then logging out', async () => {
        useLibraryStore.getState().addWork(work('manga', 5));
        activateLibraryOwner('A');
        useLibraryStore.getState().addWork(work('anime', 9));
        await useLibraryStore.persist.rehydrate();
        expect(useLibraryStore.getState().ownerId).toBe('A');
        activateLibraryOwner(null);
        expect(useLibraryStore.getState().works.map(workKey)).toEqual(['manga:5']);
    });

    it('does not clear data when archiving the outgoing scope fails', () => {
        useLibraryStore.getState().addWork(work());
        vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
        expect(() => activateLibraryOwner('A')).toThrow('quota');
        expect(useLibraryStore.getState().works).toHaveLength(1);
        expect(useLibraryStore.getState().ownerId).toBeNull();
    });
});
