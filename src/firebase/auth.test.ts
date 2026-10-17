import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ signOut: vi.fn(), saveLibrary: vi.fn(), saveGamification: vi.fn() }));
vi.mock('./config', () => ({ auth: { currentUser: { uid: 'synthetic' } } }));
vi.mock('./firestore', () => ({
    saveLibraryToFirestore: mocks.saveLibrary, saveGamificationToFirestore: mocks.saveGamification,
    saveUserProfileToFirestore: vi.fn(),
}));
vi.mock('firebase/auth', async () => ({
    ...await vi.importActual('firebase/auth'),
    signOut: mocks.signOut,
}));
import { logout } from './auth';

describe('logout after incomplete deletion', () => {
    it('still signs out when tombstone rules reject the sync flush', async () => {
        mocks.saveLibrary.mockRejectedValueOnce(new Error('permission-denied'));
        await logout();
        expect(mocks.signOut).toHaveBeenCalledOnce();
    });
    it('preserves the normal flush-before-sign-out ordering', async () => {
        vi.clearAllMocks();
        mocks.saveLibrary.mockResolvedValue(undefined);
        mocks.saveGamification.mockResolvedValue(undefined);
        await logout();
        expect(mocks.saveLibrary).toHaveBeenCalledOnce();
        expect(mocks.saveGamification).toHaveBeenCalledOnce();
        expect(mocks.saveGamification.mock.invocationCallOrder[0]).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
    });
});
