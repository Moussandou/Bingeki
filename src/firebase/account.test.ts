import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ call: vi.fn(), signOut: vi.fn(), token: vi.fn() }));
vi.mock('./config', () => ({ auth: 'auth', functions: 'functions' }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => mocks.call) }));
vi.mock('firebase/auth', () => ({ signOut: mocks.signOut }));
import { deleteOwnAccount } from './account';

describe('account deletion client', () => {
    beforeEach(() => { vi.clearAllMocks(); });
    const user = { getIdToken: mocks.token };
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
});
