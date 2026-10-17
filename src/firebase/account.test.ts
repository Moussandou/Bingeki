import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ call: vi.fn(), signOut: vi.fn(), token: vi.fn() }));
vi.mock('./config', () => ({ auth: 'auth', functions: 'functions' }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => mocks.call) }));
vi.mock('firebase/auth', () => ({ signOut: mocks.signOut }));
import { deleteOwnAccount } from './account';
import { activateLibraryOwner } from '@/utils/libraryAccountScope';
import { useLibraryStore, type Work } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';

describe('account deletion client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.signOut.mockReset().mockResolvedValue(undefined);
        localStorage.clear();
        useLibraryStore.getState().resetStoreBase();
        useLibraryStore.setState({ ownerId: null });
        useGamificationStore.getState().resetStore();
    });
    const user = { uid: 'departing', getIdToken: mocks.token };
    it('refreshes recent auth, calls server cleanup, and signs out without sync', async () => {
        mocks.call.mockResolvedValue({ data: { ok: true } });
        await deleteOwnAccount(user);
        expect(mocks.token).toHaveBeenCalledWith(true);
        expect(mocks.call).toHaveBeenCalledOnce();
        expect(mocks.signOut).toHaveBeenCalledWith('auth');
        expect(mocks.call.mock.invocationCallOrder[0]).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
    });
    it('keeps local session on cleanup failure for a safe retry', async () => {
        mocks.call.mockRejectedValueOnce(new Error('cleanup incomplete'));
        await expect(deleteOwnAccount(user)).rejects.toThrow('cleanup incomplete');
        expect(mocks.signOut).not.toHaveBeenCalled();
    });
    it('rejects an unconfirmed response', async () => {
        mocks.call.mockResolvedValueOnce({ data: { ok: false } });
        await expect(deleteOwnAccount(user)).rejects.toThrow('not confirmed');
        expect(mocks.signOut).not.toHaveBeenCalled();
    });
    it.each([true, false])('purges only the deleted account with auth callback already run: %s', async callbackFirst => {
        const work = (id: number): Work => ({ id, title: `Synthetic ${id}`, image: '', type: 'anime', status: 'reading' });
        useLibraryStore.setState({ works: [work(1)] });
        useGamificationStore.setState({ bonusXp: 10 });
        activateLibraryOwner(user.uid);
        useLibraryStore.setState({ works: [work(2)] });
        useGamificationStore.setState({ bonusXp: 20 });
        activateLibraryOwner('other');
        useLibraryStore.setState({ works: [work(3)] });
        activateLibraryOwner(user.uid);
        const guest = localStorage.getItem('bingeki-account-snapshot:guest');
        const other = localStorage.getItem('bingeki-account-snapshot:user:other');
        expect(localStorage.getItem(`bingeki-account-snapshot:user:${user.uid}`)).not.toBeNull();
        mocks.call.mockResolvedValue({ data: { ok: true } });
        mocks.signOut.mockImplementationOnce(async () => {
            if (callbackFirst) activateLibraryOwner(null);
        });
        await deleteOwnAccount(user);
        activateLibraryOwner(null);
        expect(useLibraryStore.getState().works).toEqual([work(1)]);
        expect(useLibraryStore.getState().ownerId).toBeNull();
        expect(useGamificationStore.getState().bonusXp).toBe(10);
        expect(localStorage.getItem(`bingeki-account-snapshot:user:${user.uid}`)).toBeNull();
        expect(localStorage.getItem('bingeki-account-snapshot:guest')).toBe(guest);
        expect(localStorage.getItem('bingeki-account-snapshot:user:other')).toBe(other);
        expect(JSON.parse(localStorage.getItem('bingeki-library-storage')!).state.works).toEqual([work(1)]);
    });
    it('reports a failed local scope transition instead of claiming complete deletion', async () => {
        activateLibraryOwner(user.uid);
        mocks.call.mockResolvedValue({ data: { ok: true } });
        const setter = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('local storage unavailable'); });
        try {
            await expect(deleteOwnAccount(user)).rejects.toThrow('local storage unavailable');
            expect(useLibraryStore.getState().ownerId).toBe(user.uid);
        } finally {
            setter.mockRestore();
        }
    });
});
