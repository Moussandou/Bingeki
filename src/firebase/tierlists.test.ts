import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    auth: { currentUser: null as { uid: string } | null },
    transaction: { get: vi.fn(), update: vi.fn() },
    runTransaction: vi.fn(), addDoc: vi.fn(), query: vi.fn(), where: vi.fn(), getDocs: vi.fn(), getCountFromServer: vi.fn(),
}));
vi.mock('./config', () => ({ db: {}, auth: mocks.auth }));
vi.mock('firebase/firestore', () => ({
    ...mocks,
    doc: vi.fn(() => 'list-ref'), collection: vi.fn(), getDoc: vi.fn(),
    orderBy: vi.fn(), limit: vi.fn(), deleteDoc: vi.fn(), startAfter: vi.fn(),
}));
import { createTierList, toggleTierListLike, getUserTierLists, getUserTierListsCount } from './tierlists';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = null;
    mocks.runTransaction.mockImplementation(async (_db, callback) => callback(mocks.transaction));
    mocks.getDocs.mockResolvedValue({ forEach: () => {} });
    mocks.getCountFromServer.mockResolvedValue({ data: () => ({ count: 2 }) });
});
describe('tier list count and visibility contracts', () => {
    it('writes an initial count and never accepts seeded likes', async () => {
        mocks.addDoc.mockResolvedValue({ id: 'new-list' });
        await createTierList({ userId: 'u', authorName: 'Synthetic', title: 'List', category: 'anime', likes: ['forged'], isPublic: true, tiers: [], createdAt: 0 });
        expect(mocks.addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({ likes: [], likesCount: 0 }));
    });
    it('toggles likes and their count together in a transaction', async () => {
        mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => ({ likes: ['other'] }) });
        await toggleTierListLike('list', 'me');
        expect(mocks.transaction.update).toHaveBeenLastCalledWith('list-ref', { likes: ['other', 'me'], likesCount: 2 });
        mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => ({ likes: ['other', 'me'] }) });
        await toggleTierListLike('list', 'me');
        expect(mocks.transaction.update).toHaveBeenLastCalledWith('list-ref', { likes: ['other'], likesCount: 1 });
        expect(mocks.runTransaction).toHaveBeenCalledTimes(2);
    });
    it('surfaces failed likes instead of claiming success', async () => {
        mocks.runTransaction.mockRejectedValueOnce(new Error('permission-denied'));
        await expect(toggleTierListLike('list', 'me')).rejects.toThrow('permission-denied');
    });
    it('constrains both visitor lists and counts to public documents, but preserves owner access', async () => {
        await getUserTierLists('owner');
        await getUserTierListsCount('owner');
        expect(mocks.where.mock.calls.filter(([field]) => field === 'isPublic')).toHaveLength(2);
        mocks.where.mockClear();
        mocks.auth.currentUser = { uid: 'owner' };
        await getUserTierLists('owner');
        await getUserTierListsCount('owner');
        expect(mocks.where.mock.calls.some(([field]) => field === 'isPublic')).toBe(false);
    });
});
