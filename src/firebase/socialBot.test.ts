import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    transaction: { get: vi.fn(), update: vi.fn() },
    runTransaction: vi.fn(),
}));
vi.mock('./config', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => 'pending-ref'), collection: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
    limit: vi.fn(), onSnapshot: vi.fn(), updateDoc: vi.fn(), setDoc: vi.fn(), getDoc: vi.fn(), deleteField: vi.fn(),
    runTransaction: mocks.runTransaction,
}));
import { validatePost, unvalidatePost } from './socialBot';

describe('admin draft edits during publication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.runTransaction.mockImplementation(async (_db, callback) => callback(mocks.transaction));
    });
    it('refuses edits to a live publication lease without overwriting the draft', async () => {
        mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => ({ publishLease: { expiresAt: Date.now() + 60_000 } }) });
        await expect(validatePost('p', { caption: 'change', hashtags: '', platforms: { insta: true, tiktok: false, x: false } })).rejects.toThrow('locked');
        await expect(unvalidatePost('p')).rejects.toThrow('locked');
        expect(mocks.transaction.update).not.toHaveBeenCalled();
    });
    it('reads and edits an unlocked draft in the same transaction', async () => {
        mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => ({}) });
        await validatePost('p', { caption: 'change', hashtags: '', platforms: { insta: true, tiktok: false, x: false } });
        expect(mocks.transaction.update).toHaveBeenCalledWith('pending-ref', expect.objectContaining({ caption: 'change' }));
    });
});
