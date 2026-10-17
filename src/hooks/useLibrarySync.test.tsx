import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { LibraryData } from '@/firebase/library';
import { useAuthSync } from './useAuthSync';
import { useFirestoreSync } from './useFirestoreSync';
import { useLibraryStore, type Work } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useAuthStore } from '@/store/authStore';
import { syncFlags } from './syncFlags';
import { workKey } from '@/utils/workIdentity';

const mocks = vi.hoisted(() => ({
    authChanged: undefined as ((user: User | null) => Promise<void>) | undefined,
    remoteLibrary: undefined as ((data: LibraryData | null) => void) | undefined,
    loadLibrary: vi.fn(),
    loadGamification: vi.fn(),
    saveProfile: vi.fn(),
    saveLibrary: vi.fn(),
    saveGamification: vi.fn(),
    subscribeProfile: vi.fn(),
    unsubscribeLibrary: vi.fn(),
    unsubscribeProfile: vi.fn(),
}));

vi.mock('@/firebase/config', () => ({ auth: { currentUser: null } }));
vi.mock('firebase/auth', () => ({
    onAuthStateChanged: vi.fn((_auth, callback) => {
        mocks.authChanged = callback;
        return vi.fn();
    }),
}));
vi.mock('@/firebase/firestore', () => ({
    loadFullLibraryData: mocks.loadLibrary,
    loadGamificationFromFirestore: mocks.loadGamification,
    saveUserProfileToFirestore: mocks.saveProfile,
    saveLibraryToFirestore: mocks.saveLibrary,
    saveGamificationToFirestore: mocks.saveGamification,
    subscribeToLibrary: vi.fn((_uid, callback) => {
        mocks.remoteLibrary = callback;
        return mocks.unsubscribeLibrary;
    }),
    getUserProfile: vi.fn(),
    subscribeToUserProfile: vi.fn(),
}));

const user = (uid: string) => ({ uid }) as User;
const work = (id = 1, lastUpdated = 10): Work => ({
    id, type: 'anime', title: `Work ${id}`, image: '', status: 'reading', lastUpdated,
});

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    syncFlags.skipLibrarySave = false;
    syncFlags.skipGamificationSave = false;
    useLibraryStore.getState().resetStoreBase();
    useLibraryStore.setState({ ownerId: null });
    useGamificationStore.getState().resetStore();
    mocks.loadLibrary.mockResolvedValue(null);
    mocks.loadGamification.mockResolvedValue(null);
    mocks.saveProfile.mockResolvedValue(undefined);
    mocks.saveLibrary.mockResolvedValue({ works: [], lastUpdated: 0 });
    mocks.saveGamification.mockResolvedValue(undefined);
    mocks.subscribeProfile.mockReturnValue(mocks.unsubscribeProfile);
    useAuthStore.setState({
        user: null, userProfile: null, loading: true,
        subscribeToProfile: mocks.subscribeProfile,
    });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('auth lifecycle and stale asynchronous work', () => {
    it('does not reset a persisted guest on the first null auth notification', async () => {
        useLibraryStore.setState({ works: [work()] });
        renderHook(() => useAuthSync());
        await act(async () => { await mocks.authChanged!(null); });
        expect(useLibraryStore.getState()).toMatchObject({ works: [work()], hydrated: true, ownerId: null });
        expect(useAuthStore.getState().loading).toBe(false);
    });

    it('ignores a previous account cloud load that resolves after login to another account', async () => {
        let resolveA!: (data: LibraryData) => void;
        const pendingA = new Promise<LibraryData>(resolve => { resolveA = resolve; });
        mocks.loadLibrary.mockImplementation(uid => uid === 'A' ? pendingA : Promise.resolve({ works: [work(2)], lastUpdated: 2 }));
        renderHook(() => useAuthSync());
        let first!: Promise<void>;
        await act(async () => { first = mocks.authChanged!(user('A')); });
        await act(async () => { await mocks.authChanged!(user('B')); });
        await act(async () => {
            resolveA({ works: [work(999)], lastUpdated: 99 });
            await first;
        });
        expect(useLibraryStore.getState().ownerId).toBe('B');
        expect(useLibraryStore.getState().works.map(workKey)).toEqual(['anime:2']);
        expect(useAuthStore.getState().user?.uid).toBe('B');
    });

    it('does not install a stale profile subscription after an older profile write resolves', async () => {
        let resolveA!: () => void;
        const pendingA = new Promise<void>(resolve => { resolveA = resolve; });
        mocks.saveProfile.mockImplementation(u => u.uid === 'A' ? pendingA : Promise.resolve());
        renderHook(() => useAuthSync());
        let first!: Promise<void>;
        await act(async () => { first = mocks.authChanged!(user('A')); });
        await act(async () => { await mocks.authChanged!(user('B')); });
        await act(async () => { resolveA(); await first; });
        expect(mocks.subscribeProfile).toHaveBeenCalledTimes(1);
        expect(mocks.subscribeProfile).toHaveBeenCalledWith('B');
    });

    it('ignores reads after unmount and unsubscribes both live listeners', async () => {
        const { unmount } = renderHook(() => useAuthSync());
        await act(async () => { await mocks.authChanged!(user('A')); });
        unmount();
        expect(mocks.unsubscribeLibrary).toHaveBeenCalled();
        expect(mocks.unsubscribeProfile).toHaveBeenCalled();
        act(() => mocks.remoteLibrary!({ works: [work(99)], lastUpdated: 1 }));
        expect(useLibraryStore.getState().works).toEqual([]);
    });

    it('keeps cloud writes paused and reports failed hydration rather than treating it as an empty library', async () => {
        mocks.loadLibrary.mockRejectedValue(new Error('offline'));
        renderHook(() => { useAuthSync(); useFirestoreSync(); });
        await act(async () => { await mocks.authChanged!(user('A')); });
        act(() => useLibraryStore.getState().addWork(work()));
        await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
        expect(useLibraryStore.getState()).toMatchObject({ hydrated: false, syncError: 'offline' });
        expect(mocks.saveLibrary).not.toHaveBeenCalled();
    });

    it('merges a live remote deletion without echo-writing hydration back', async () => {
        mocks.loadLibrary.mockResolvedValue({ works: [work()], lastUpdated: 1 });
        renderHook(() => { useAuthSync(); useFirestoreSync(); });
        await act(async () => { await mocks.authChanged!(user('A')); });
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        mocks.saveLibrary.mockClear();
        act(() => mocks.remoteLibrary!({
            works: [], lastUpdated: 2,
            deletedWorks: [{ id: 1, type: 'anime', deletedAt: 20 }],
        }));
        await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
        expect(useLibraryStore.getState().works).toEqual([]);
        expect(mocks.saveLibrary).not.toHaveBeenCalled();
    });

    it('pauses a previously hydrated scope when the same account starts a new failed hydration', async () => {
        renderHook(() => useAuthSync());
        await act(async () => { await mocks.authChanged!(user('A')); });
        expect(useLibraryStore.getState().hydrated).toBe(true);
        mocks.loadLibrary.mockRejectedValueOnce(new Error('offline'));
        await act(async () => { await mocks.authChanged!(user('A')); });
        expect(useLibraryStore.getState()).toMatchObject({ hydrated: false, syncError: 'offline' });
    });
});

describe('debounce and lifecycle flushing', () => {
    function mountReadySync() {
        useAuthStore.setState({ user: user('A'), loading: false });
        useLibraryStore.setState({ ownerId: 'A', hydrated: true, works: [work()] });
        return renderHook(() => useFirestoreSync());
    }

    it('flushes pending changes on pagehide before the three-second timer', async () => {
        mountReadySync();
        act(() => useLibraryStore.getState().updateWorkDetails('anime:1', { notes: 'last change' }));
        expect(mocks.saveLibrary).not.toHaveBeenCalled();
        await act(async () => { window.dispatchEvent(new Event('pagehide')); });
        expect(mocks.saveLibrary).toHaveBeenCalledTimes(1);
        expect(mocks.saveLibrary.mock.calls[0][1][0].notes).toBe('last change');
    });

    it('never sends a pending A save to B after account switching', async () => {
        mountReadySync();
        act(() => useLibraryStore.getState().updateStatus('anime:1', 'completed'));
        act(() => {
            useAuthStore.setState({ user: user('B') });
            useLibraryStore.setState({ ownerId: 'B', hydrated: true, works: [] });
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
        expect(mocks.saveLibrary.mock.calls.every(call => call[0] === 'B' && call[1].length === 0)).toBe(true);
    });

    it('retains local changes and exposes the exact save error, then retries on online', async () => {
        mountReadySync();
        mocks.saveLibrary.mockRejectedValueOnce(new Error('size limit'));
        act(() => useLibraryStore.getState().updateStatus('anime:1', 'completed'));
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        expect(useLibraryStore.getState().syncError).toBe('size limit');
        expect(useLibraryStore.getState().works[0].status).toBe('completed');
        await act(async () => { window.dispatchEvent(new Event('online')); });
        expect(mocks.saveLibrary).toHaveBeenCalledTimes(2);
        expect(useLibraryStore.getState().syncError).toBeNull();
    });

    it('does not drop changes made while a save is in flight', async () => {
        let resolveSave!: () => void;
        mocks.saveLibrary.mockImplementationOnce(() => new Promise<void>(resolve => { resolveSave = resolve; }));
        mountReadySync();
        act(() => useLibraryStore.getState().updateStatus('anime:1', 'completed'));
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        act(() => useLibraryStore.getState().updateWorkDetails('anime:1', { notes: 'edited during save' }));
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        expect(mocks.saveLibrary).toHaveBeenCalledTimes(1);
        await act(async () => { resolveSave(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        expect(mocks.saveLibrary).toHaveBeenCalledTimes(2);
        expect(mocks.saveLibrary.mock.calls[1][1][0].notes).toBe('edited during save');
    });

    it('retries a newer edit made during a failed save without indefinitely retrying the failing snapshot', async () => {
        let rejectSave!: (error: Error) => void;
        mocks.saveLibrary.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectSave = reject; }));
        mountReadySync();
        act(() => useLibraryStore.getState().updateStatus('anime:1', 'completed'));
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        act(() => useLibraryStore.getState().updateWorkDetails('anime:1', { notes: 'newer edit' }));
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        await act(async () => { rejectSave(new Error('old snapshot failed')); });
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        expect(mocks.saveLibrary).toHaveBeenCalledTimes(2);
        expect(mocks.saveLibrary.mock.calls[1][1][0].notes).toBe('newer edit');
    });

    it('does not schedule new timers after unmount while a save is completing', async () => {
        let resolveSave!: () => void;
        mocks.saveLibrary.mockImplementationOnce(() => new Promise<void>(resolve => { resolveSave = resolve; }));
        const { unmount } = mountReadySync();
        act(() => useLibraryStore.getState().updateStatus('anime:1', 'completed'));
        await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
        act(() => useLibraryStore.getState().updateWorkDetails('anime:1', { notes: 'durable local edit' }));
        unmount();
        await act(async () => { resolveSave(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
        expect(mocks.saveLibrary).toHaveBeenCalledTimes(1);
        expect(useLibraryStore.getState().works[0].notes).toBe('durable local edit');
    });
});
