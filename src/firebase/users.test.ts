import { describe, expect, it, vi } from 'vitest';
import { updateDoc } from 'firebase/firestore';
const mocks = vi.hoisted(() => ({ transaction: { get: vi.fn(), set: vi.fn() }, runTransaction: vi.fn() }));
vi.mock('./config', () => ({ db: {}, storage: {} }));
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(), setDoc: vi.fn(), getDoc: vi.fn(), collection: vi.fn(), query: vi.fn(),
    where: vi.fn(), getDocs: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), updateDoc: vi.fn(),
    deleteDoc: vi.fn(), onSnapshot: vi.fn(), runTransaction: mocks.runTransaction,
}));
import { updateUserProfile, saveUserProfileToFirestore } from './users';

describe('onboarding profile writes', () => {
    it('writes only client-owned fields, without the forbidden server timestamp', async () => {
        await updateUserProfile('synthetic', { displayName: 'SyntheticHero' });
        expect(updateDoc).toHaveBeenCalledWith(undefined, { displayName: 'SyntheticHero' });
    });
    it('re-reads profile existence on transaction retry and never rewrites immutable createdAt', async () => {
        mocks.transaction.get.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => true });
        mocks.runTransaction.mockImplementation(async (_db, callback) => {
            await callback(mocks.transaction);
            return callback(mocks.transaction);
        });
        await saveUserProfileToFirestore({ uid: 'synthetic', displayName: 'New user' });
        expect(mocks.runTransaction).toHaveBeenCalledOnce();
        expect(mocks.transaction.set.mock.calls[0][1]).toMatchObject({ createdAt: expect.any(Number), profileVisibility: 'public', displayName: 'New user' });
        expect(mocks.transaction.set.mock.calls[1][1]).not.toHaveProperty('createdAt');
        expect(mocks.transaction.set.mock.calls[1][1]).not.toHaveProperty('displayName');
    });
});
