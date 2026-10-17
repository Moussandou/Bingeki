import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const participant = (id, status) => ({ id, name: id, photo: '', progress: 0, joinedAt: 1, status });
const challenge = () => ({
    title: 'Group challenge', type: 'most_chapters', createdBy: 'alice', workType: 'manga', workId: 1,
    participants: [participant('alice', 'accepted'), participant('bob', 'pending'), participant('eve', 'pending')],
    participantIds: ['alice', 'bob', 'eve'], startDate: 1, status: 'active',
});
const party = () => ({
    title: 'Group watch party', hostId: 'alice', hostName: 'Alice', workId: 1, workType: 'anime', workTitle: 'Work',
    currentEpisode: 20, status: 'active', createdAt: 1, lastActivity: 1,
    participants: ['alice', 'bob', 'eve'].map((id, index) => ({
        id, name: id, photo: '', joinedAt: 1, isReady: index === 0, currentProgress: index === 0 ? 20 : 0,
    })),
});

function harness(profile = { displayName: 'alice', photoURL: '' }, deleted = false, overrides = {}) {
    const writes = [];
    const reads = [];
    class HttpsError extends Error {
        constructor(code, message) { super(message); this.code = code; }
    }
    const db = {
        collection: collection => ({ doc: (id = 'generated') => ({ path: `${collection}/${id}`, id }) }),
        runTransaction: callback => callback({
            getAll: async (...refs) => refs.map(ref => {
                reads.push(ref.path);
                const id = ref.path.split('/')[1];
                const value = Object.hasOwn(overrides, ref.path) ? overrides[ref.path]
                    : ref.path.startsWith('users/')
                        ? id === 'alice' ? profile : { displayName: id, photoURL: '' }
                        : id === 'alice' && deleted ? {} : null;
                return { exists: value !== null, data: () => value };
            }),
            create: (ref, data) => { writes.push({ path: ref.path, data }); },
        }),
    };
    const exports = {};
    vm.runInNewContext(readFileSync(require.resolve('../interactions.js'), 'utf8'), {
        exports,
        require: name => {
            if (name === 'firebase-admin') return { firestore: () => db };
            if (name === 'firebase-functions/v2/https') return { onCall: (_, handler) => handler, HttpsError };
            return require(`../${name.replace('./', '')}`);
        },
    });
    return { ...exports, writes, reads };
}

describe('validated group invitations', () => {
    it.each(['anime', 'manga'])('preserves multi-friend challenges with workType %s', async workType => {
        const api = harness();
        const payload = { ...challenge(), workType };
        await expect(api.createChallengeFn({ auth: { uid: 'alice' }, data: payload })).resolves.toEqual({ id: 'generated' });
        expect(api.writes[0].data).toEqual(payload);
    });
    it('accepts groups larger than a duel and preserves solo-host or multi-friend watch parties', async () => {
        const api = harness();
        const payload = challenge();
        for (let i = 0; i < 20; i++) {
            payload.participants.push(participant(`friend${i}`, 'pending'));
            payload.participantIds.push(`friend${i}`);
        }
        await expect(api.createChallengeFn({ auth: { uid: 'alice' }, data: payload })).resolves.toHaveProperty('id');
        await expect(api.createWatchPartyFn({ auth: { uid: 'alice' }, data: party() })).resolves.toHaveProperty('id');
        const solo = party();
        solo.participants = solo.participants.slice(0, 1);
        await expect(api.createWatchPartyFn({ auth: { uid: 'alice' }, data: solo })).resolves.toHaveProperty('id');
        expect(api.writes[1].data.id).toBe('generated');
    });
    it('rejects forged creator, invitation acceptance, progress, identities and winners', async () => {
        const invalid = [
            { ...challenge(), createdBy: 'bob' },
            { ...challenge(), winnerId: 'bob' },
            { ...challenge(), participantIds: ['alice', 'bob', 'bob'] },
            { ...challenge(), participants: [participant('alice', 'accepted'), participant('bob', 'accepted'), participant('eve', 'pending')] },
            { ...challenge(), participants: [participant('alice', 'accepted'), participant('bob', 'pending'), { ...participant('eve', 'pending'), progress: 99 }] },
            { ...challenge(), participantIds: ['alice', 'bob', 'outsider'] },
        ];
        for (const data of invalid) {
            const api = harness();
            await expect(api.createChallengeFn({ auth: { uid: 'alice' }, data })).rejects.toHaveProperty('code', 'invalid-argument');
            expect(api.writes).toHaveLength(0);
        }
    });
    it('rejects forged watch-party host, readiness and invitee progress', async () => {
        const ready = party();
        ready.participants[1].isReady = true;
        const progress = party();
        progress.participants[2].currentProgress = 99;
        for (const data of [{ ...party(), hostId: 'bob' }, ready, progress]) {
            await expect(harness().createWatchPartyFn({ auth: { uid: 'alice' }, data }))
                .rejects.toHaveProperty('code', 'invalid-argument');
        }
    });
    it.each([null, { isBanned: true }, { deleting: true }])('rejects inactive creator %j', async profile => {
        const api = harness(profile);
        await expect(api.createChallengeFn({ auth: { uid: 'alice' }, data: challenge() }))
            .rejects.toHaveProperty('code', 'permission-denied');
        await expect(api.createWatchPartyFn({ auth: { uid: 'alice' }, data: party() }))
            .rejects.toHaveProperty('code', 'permission-denied');
        expect(api.writes).toHaveLength(0);
    });
    it('rejects anonymous or permanently deleted creators', async () => {
        await expect(harness().createChallengeFn({ data: challenge() })).rejects.toHaveProperty('code', 'unauthenticated');
        await expect(harness({}, true).createWatchPartyFn({ auth: { uid: 'alice' }, data: party() }))
            .rejects.toHaveProperty('code', 'permission-denied');
    });
    it.each(['bob', 'eve'])('checks inactive invitee %s before creating any references', async invitee => {
        for (const overrides of [
            { [`users/${invitee}`]: null },
            { [`users/${invitee}`]: { deleting: true } },
            { [`users/${invitee}`]: { isBanned: true } },
            { [`accountDeletions/${invitee}`]: { deleting: false } },
        ]) {
            const api = harness(undefined, false, overrides);
            await expect(api.createChallengeFn({ auth: { uid: 'alice' }, data: challenge() }))
                .rejects.toHaveProperty('code', 'permission-denied');
            await expect(api.createWatchPartyFn({ auth: { uid: 'alice' }, data: party() }))
                .rejects.toHaveProperty('code', 'permission-denied');
            expect(api.writes).toHaveLength(0);
        }
    });
    it('derives caller and invitee names/photos from profiles, never the submitted metadata', async () => {
        const api = harness({ displayName: 'Real Alice', photoURL: 'https://example.test/alice.png' }, false, {
            'users/bob': { displayName: 'Real Bob', photoURL: 'https://example.test/bob.png' },
            'users/eve': { displayName: 'Real Eve', photoURL: 'https://example.test/eve.png' },
        });
        const payload = challenge();
        payload.participants = payload.participants.map(p => ({ ...p, name: 'Spoof', photo: 'https://example.test/spoof.png' }));
        await api.createChallengeFn({ auth: { uid: 'alice' }, data: payload });
        const watchParty = party();
        watchParty.hostName = 'Spoof Host';
        watchParty.participants = watchParty.participants.map(p => ({ ...p, name: 'Spoof', photo: '' }));
        await api.createWatchPartyFn({ auth: { uid: 'alice' }, data: watchParty });
        for (const write of api.writes) {
            expect(write.data.participants.map(p => p.name)).toEqual(['Real Alice', 'Real Bob', 'Real Eve']);
            expect(write.data.participants.map(p => p.photo)).toEqual([
                'https://example.test/alice.png', 'https://example.test/bob.png', 'https://example.test/eve.png',
            ]);
            expect(JSON.stringify(write)).not.toContain('Spoof');
        }
        expect(api.writes[1].data.hostName).toBe('Real Alice');
        expect(api.writes[0].data.participants.map(p => p.status)).toEqual(['accepted', 'pending', 'pending']);
        expect(api.writes[1].data.participants.map(p => p.currentProgress)).toEqual([20, 0, 0]);
        expect(api.reads).toEqual([
            'users/alice', 'accountDeletions/alice', 'users/bob', 'accountDeletions/bob', 'users/eve', 'accountDeletions/eve',
            'users/alice', 'accountDeletions/alice', 'users/bob', 'accountDeletions/bob', 'users/eve', 'accountDeletions/eve',
        ]);
        expect(payload.participants[0].name).toBe('Spoof');
    });
});
