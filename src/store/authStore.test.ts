import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/firebase/firestore';
import { useAuthStore } from './authStore';

const backend = vi.hoisted(() => ({
    getUserProfile: vi.fn<(uid: string) => Promise<UserProfile | null>>(),
    subscribeToUserProfile: vi.fn<(uid: string, callback: (profile: UserProfile | null) => void) => () => void>(),
}));
vi.mock('@/firebase/firestore', () => backend);

const account = (uid: string) => ({ uid, email: `${uid}@example.test` }) as User;
const profile = (uid: string): UserProfile => ({
    uid, email: null, displayName: uid, photoURL: null, lastLogin: 0,
});

beforeEach(() => {
    vi.clearAllMocks();
    backend.subscribeToUserProfile.mockReturnValue(vi.fn());
    useAuthStore.setState({ user: account('alice'), userProfile: null, loading: true });
});

describe('lazy profile subscriptions', () => {
    it('does not subscribe after cleanup while the backend module is loading', async () => {
        const stop = useAuthStore.getState().subscribeToProfile('alice');
        stop();
        await vi.dynamicImportSettled();
        expect(backend.subscribeToUserProfile).not.toHaveBeenCalled();
    });

    it('does not subscribe for a superseded account', async () => {
        const stop = useAuthStore.getState().subscribeToProfile('alice');
        useAuthStore.getState().setUser(account('bob'));
        await vi.dynamicImportSettled();
        expect(backend.subscribeToUserProfile).not.toHaveBeenCalled();
        stop();
    });

    it('hydrates only the current owner email and ignores late profile events', async () => {
        const stop = useAuthStore.getState().subscribeToProfile('alice');
        await vi.dynamicImportSettled();
        const callback = backend.subscribeToUserProfile.mock.calls[0][1];
        callback(profile('alice'));
        expect(useAuthStore.getState().userProfile?.email).toBe('alice@example.test');
        useAuthStore.getState().setUser(account('bob'));
        useAuthStore.getState().setUserProfile(null);
        callback(profile('alice'));
        expect(useAuthStore.getState().userProfile).toBeNull();
        stop();
        expect(backend.subscribeToUserProfile.mock.results[0].value).toHaveBeenCalledOnce();
    });

    it('ignores a profile fetch completed after an account switch', async () => {
        let finish!: (profile: UserProfile) => void;
        backend.getUserProfile.mockReturnValue(new Promise(resolve => { finish = resolve; }));
        const pending = useAuthStore.getState().syncUserProfile('alice');
        await vi.dynamicImportSettled();
        useAuthStore.getState().setUser(account('bob'));
        finish(profile('alice'));
        await pending;
        expect(useAuthStore.getState().userProfile).toBeNull();
    });
});
