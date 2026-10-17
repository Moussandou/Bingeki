import { describe, expect, it, vi } from 'vitest';
import { updateDoc, where } from 'firebase/firestore';
import type { WatchParty } from '@/types/watchparty';
import type { Challenge } from '@/types/challenge';
const mocks = vi.hoisted(() => ({ callable: vi.fn(), invoke: vi.fn() }));
vi.mock('./config', () => ({ db: {}, functions: 'functions' }));
vi.mock('firebase/firestore', () => ({
    updateDoc: vi.fn(), where: vi.fn(), doc: vi.fn(), collection: vi.fn(),
    query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), addDoc: vi.fn(), getDoc: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ forEach: () => {} }),
}));
vi.mock('firebase/functions', () => ({
    httpsCallable: mocks.callable.mockImplementation(() => mocks.invoke),
}));
import { createWatchParty, createChallenge, endWatchParty, getComments } from './interactions';

describe('canonical social persistence contracts', () => {
    it('creates invited watch parties through the server validation callable', async () => {
        mocks.invoke.mockResolvedValue({ data: { id: 'party' } });
        const party: Omit<WatchParty, 'id'> = {
            title: 'Synthetic', hostId: 'host', hostName: 'Host', workId: 7, workType: 'anime',
            workTitle: 'Synthetic', workImage: '', participants: [], currentEpisode: 1,
            status: 'active', createdAt: 1, lastActivity: 1,
        };
        expect(await createWatchParty(party)).toBe('party');
        expect(mocks.callable).toHaveBeenLastCalledWith('functions', 'createWatchPartyFn');
        expect(mocks.invoke).toHaveBeenLastCalledWith(party);
    });
    it('creates multi-friend challenges without a client write or losing work category', async () => {
        mocks.invoke.mockResolvedValue({ data: { id: 'challenge' } });
        const challenge: Omit<Challenge, 'id'> = {
            title: 'Synthetic', type: 'race_to_finish', workId: 7, workType: 'manga',
            participants: [], participantIds: ['host', 'friend-a', 'friend-b'],
            startDate: 1, status: 'active', createdBy: 'host',
        };
        expect(await createChallenge(challenge)).toBe('challenge');
        expect(mocks.callable).toHaveBeenLastCalledWith('functions', 'createChallengeFn');
        expect(mocks.invoke).toHaveBeenLastCalledWith(challenge);
    });
    it('ends a watch party with the canonical ended state', async () => {
        await endWatchParty('party');
        expect(updateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({ status: 'ended' }));
    });
    it('constrains typed comments instead of mixing anime and manga sharing the same API ID', async () => {
        await getComments(7, 50, 'anime');
        expect(where).toHaveBeenCalledWith('workId', '==', 7);
        expect(where).toHaveBeenCalledWith('workType', '==', 'anime');
    });
});
