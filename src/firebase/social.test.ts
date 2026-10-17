import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFriendsActivity, getFriendsReadingWork, type Friend } from './social';
import { getComments } from './interactions';
import type { Work } from '@/store/libraryStore';

const mocks = vi.hoisted(() => ({
    getProfile: vi.fn(),
    getLibrary: vi.fn(),
    getDocs: vi.fn(),
    where: vi.fn((field, op, value) => ({ field, op, value })),
}));
vi.mock('./config', () => ({ db: {} }));
vi.mock('./users', () => ({ getUserProfile: mocks.getProfile }));
vi.mock('./library', () => ({ getUserLibrary: mocks.getLibrary }));
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    collection: vi.fn(),
    query: vi.fn((...constraints) => constraints),
    where: mocks.where,
    getDocs: mocks.getDocs,
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    setDoc: vi.fn(),
}));

const friend = (uid: string): Friend => ({ uid, status: 'accepted', displayName: uid, photoURL: '' });
const docs = (values: Record<string, unknown>[]) => ({
    forEach: (callback: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
        values.forEach((value, index) => callback({ id: String(index), data: () => value }));
    },
});
const work = (type: Work['type']): Work => ({ id: 1, type, title: type, image: '', status: 'reading' });

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDocs.mockResolvedValue(docs([]));
    mocks.getProfile.mockImplementation(async uid => ({ uid, displayName: uid, profileVisibility: 'public' }));
    mocks.getLibrary.mockResolvedValue([work('anime')]);
});

describe('shared library namespace and privacy', () => {
    it('matches the media type, not just the MAL number', async () => {
        // getFriends() reads the first getDocs response.
        mocks.getDocs.mockResolvedValueOnce(docs([{ uid: 'friend', status: 'accepted' }]));
        expect((await getFriendsReadingWork('owner', 1, 'manga')).count).toBe(0);
    });

    it('omits inaccessible libraries without dropping the other shared friends', async () => {
        mocks.getDocs.mockResolvedValueOnce(docs([{ uid: 'private', status: 'accepted' }, { uid: 'visible', status: 'accepted' }]));
        mocks.getLibrary.mockImplementation(async uid => {
            if (uid === 'private') throw Object.assign(new Error('private'), { code: 'functions/permission-denied' });
            return [work('manga')];
        });
        const result = await getFriendsReadingWork('owner', 1, 'manga');
        expect(result.count).toBe(1);
        expect(result.friends[0].profile.uid).toBe('visible');
    });
});

describe('activity queries under profile privacy rules', () => {
    it('preflights private and opt-out friends individually before constructing the feed query', async () => {
        mocks.getProfile.mockImplementation(async uid => {
            if (uid === 'private') throw Object.assign(new Error('private'), { code: 'permission-denied' });
            return { uid, profileVisibility: 'public', showActivityStatus: uid !== 'opt-out' };
        });
        mocks.getDocs.mockResolvedValue(docs([{ userId: 'visible', timestamp: 1 }]));
        const result = await getFriendsActivity('owner', 20, [friend('private'), friend('opt-out'), friend('visible')]);
        expect(result).toHaveLength(1);
        expect(mocks.where).toHaveBeenCalledWith('userId', 'in', ['visible']);
        expect(mocks.where).toHaveBeenCalledWith('isVisible', '==', true);
        expect(mocks.getDocs).toHaveBeenCalledTimes(1);
    });

    it('caps feed batches at three visible profiles for the rules read budget', async () => {
        await getFriendsActivity('owner', 20, Array.from({ length: 7 }, (_, i) => friend(`u${i}`)));
        const batches = mocks.where.mock.calls.filter(call => call[0] === 'userId');
        expect(batches.map(call => call[2].length)).toEqual([3, 3, 1]);
    });

    it('does not hide network failures as a successfully empty feed', async () => {
        mocks.getProfile.mockRejectedValueOnce(new Error('offline'));
        await expect(getFriendsActivity('owner', 20, [friend('visible')])).rejects.toThrow('offline');
        expect(mocks.getDocs).not.toHaveBeenCalled();
    });
});

describe('typed comments query contract', () => {
    it('queries type as well as raw ID, while keeping the untyped legacy API compatible', async () => {
        await getComments(1, 50, 'manga');
        expect(mocks.where).toHaveBeenCalledWith('workId', '==', 1);
        expect(mocks.where).toHaveBeenCalledWith('workType', '==', 'manga');
        mocks.where.mockClear();
        await getComments(1);
        expect(mocks.where).not.toHaveBeenCalledWith('workType', '==', expect.anything());
    });
});
