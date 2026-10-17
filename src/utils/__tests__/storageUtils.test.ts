import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearImageCache, exportData, importData, restoreBackup } from '../storageUtils';
import { useLibraryStore, type Work } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { mergeLibraryData } from '@/utils/dataProtection';

const work: Work = { id: 7, type: 'manga', title: 'Synthetic', image: '', status: 'reading', currentChapter: 3 };
beforeEach(() => {
    localStorage.clear();
    useLibraryStore.getState().resetStore();
    useGamificationStore.getState().resetStore();
    useSettingsStore.setState({ theme: 'dark', soundEnabled: true });
    vi.restoreAllMocks();
});
describe('image cache clearing', () => {
    it('removes only application image caches without touching auth/settings or the app shell', async () => {
        const remove = vi.fn().mockResolvedValue(true);
        vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue(['mal-images', 'firebase-images', 'dicebear-avatars', 'workbox-precache-v2', 'other-app']), delete: remove });
        localStorage.setItem('auth-token', 'keep');
        expect(await clearImageCache()).toBe(3);
        expect(remove.mock.calls.map(([key]) => key)).toEqual(['mal-images', 'firebase-images', 'dicebear-avatars']);
        expect(localStorage.getItem('auth-token')).toBe('keep');
    });
    it('reports a failed deletion rather than fake success', async () => {
        vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue(['mal-images']), delete: vi.fn().mockResolvedValue(false) });
        await expect(clearImageCache()).rejects.toThrow('could not be removed');
    });
});

describe('validated backup restoration', () => {
    it('restores empty libraries and records removals instead of retaining old works', () => {
        useLibraryStore.setState({ works: [work] });
        restoreBackup({ library: { works: [] } });
        expect(useLibraryStore.getState().works).toEqual([]);
        expect(useLibraryStore.getState().deletedWorks).toContainEqual(expect.objectContaining({ id: 7, type: 'manga' }));
    });
    it('keeps removals newer than known cloud works when the clock moves backwards', () => {
        vi.spyOn(Date, 'now').mockReturnValue(100);
        const old = { ...work, lastUpdated: 200 };
        useLibraryStore.setState({ works: [old] });
        restoreBackup({ library: { works: [] } });
        const state = useLibraryStore.getState();
        expect(state.deletedWorks).toContainEqual({ id: work.id, type: work.type, deletedAt: 201 });
        expect(mergeLibraryData(state.works, [old], state.deletedWorks)).toEqual([]);
    });
    it.each([undefined, 'manga'] as const)('restores notes beyond prior/imported works and %s tombstones', type => {
        vi.spyOn(Date, 'now').mockReturnValue(100);
        const old = { ...work, notes: 'Old', lastUpdated: 200 };
        useLibraryStore.setState({
            works: [old], metadataUpdatedAt: 500,
            deletedWorks: [{ id: work.id, type: work.type, deletedAt: 250 }],
        });
        restoreBackup({ library: {
            works: [{ ...work, notes: 'Restored', lastUpdated: 350 }],
            deletedWorks: [{ id: work.id, ...(type ? { type } : {}), deletedAt: 400 }],
        } });
        const state = useLibraryStore.getState();
        expect(state.works[0]).toMatchObject({ notes: 'Restored', lastUpdated: 401 });
        expect(state.metadataUpdatedAt).toBe(501);
        expect(mergeLibraryData(state.works, [old], state.deletedWorks)[0]).toMatchObject({ notes: 'Restored' });
    });
    it('rejects invalid sections before touching any state or persisted storage', () => {
        useLibraryStore.setState({ works: [work] });
        const before = localStorage.getItem('bingeki-library-storage');
        expect(() => restoreBackup({
            library: { works: [] }, settings: { theme: 'invalid' },
        })).toThrow('Invalid backup field');
        expect(useLibraryStore.getState().works).toEqual([work]);
        expect(localStorage.getItem('bingeki-library-storage')).toBe(before);
        expect(() => restoreBackup({ library: { works: [{ ...work, currentChapter: 'ten' }] } })).toThrow();
        expect(() => restoreBackup({ library: '{}' })).toThrow();
        expect(() => restoreBackup({ unexpected: true })).toThrow();
    });
    it('does not overwrite actions or ownership metadata from an imported backup', () => {
        const action = useLibraryStore.getState().resetStore;
        restoreBackup({ library: { works: [work], ownerId: 'other-user', resetStore: 'malicious', hydrated: true } });
        expect(useLibraryStore.getState().resetStore).toBe(action);
        expect(useLibraryStore.getState().hydrated).toBe(false);
        expect(useLibraryStore.getState()).not.toMatchObject({ ownerId: 'other-user' });
    });
    it('preserves legacy deletion history instead of forgetting another category on restore', () => {
        useLibraryStore.setState({ deletedWorks: [{ id: 7, deletedAt: 1 }] });
        restoreBackup({ library: { works: [work], deletedWorks: [{ id: 9, deletedAt: 2 }] } });
        expect(useLibraryStore.getState().deletedWorks).toEqual([{ id: 7, deletedAt: 1 }, { id: 9, deletedAt: 2 }]);
    });
    it('rolls back quota failures without emitting partially restored state', () => {
        useLibraryStore.setState({ works: [work] });
        const original = localStorage.setItem.bind(localStorage);
        const setter = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
            if (key === 'bingeki-settings' && value.includes('"theme":"light"')) throw new Error('quota');
            original(key, value);
        });
        expect(() => restoreBackup({ library: { works: [] }, settings: { theme: 'light' } })).toThrow('Backup restore failed');
        expect(useLibraryStore.getState().works).toEqual([work]);
        expect(useSettingsStore.getState().theme).toBe('dark');
        setter.mockRestore();
    });
    it('roundtrips the active library, folders, favorites, settings and gamification through a file', async () => {
        const folder = { id: 'f', name: 'Favorites', color: '#fff', emoji: '*', createdAt: 1 };
        const character = { id: 8, name: 'Test', image: '' };
        useLibraryStore.setState({ works: [work], folders: [folder], favoriteCharacters: [character], viewMode: 'list', sortBy: 'title' });
        useGamificationStore.setState({ bonusXp: 50 });
        useSettingsStore.setState({ theme: 'light' });
        let blob: Blob | undefined;
        vi.stubGlobal('URL', class extends URL {
            static createObjectURL(value: Blob) { blob = value; return 'blob:backup'; }
            static revokeObjectURL() {}
        });
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        exportData();
        expect(blob).toBeDefined();
        const contents = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsText(blob!);
        });
        useLibraryStore.getState().resetStore();
        useSettingsStore.setState({ theme: 'dark' });
        await expect(importData(new File([contents], 'backup.json'))).resolves.toBe(true);
        expect(useLibraryStore.getState()).toMatchObject({ works: [expect.objectContaining(work)], folders: [folder], favoriteCharacters: [character], viewMode: 'list', sortBy: 'title' });
        expect(useSettingsStore.getState().theme).toBe('light');
        expect(useGamificationStore.getState().bonusXp).toBe(50);
        await expect(importData(new File(['{invalid'], 'broken.json'))).rejects.toThrow();
    });
});
