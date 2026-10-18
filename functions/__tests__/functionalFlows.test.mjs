import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { Firestore } from '@google-cloud/firestore';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { cleanupAccount } = require('../accountCore.js');
const { publishPost, LEASE_MS } = require('../social/publishers/publicationCore.js');
const { repairTierListCounts } = require('../../scripts/repair-tierlist-counts.cjs');
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST);
const collections = { pending: 'social_pending_posts', published: 'social_published_posts' };
const buffer = require('../social/publishers/buffer.js');

describe('publisher preflight without transport', () => {
    it('marks local validation failures as safe to retry rather than uncertain sends', async () => {
        await expect(buffer.publishToInstagram([], '', {})).rejects.toMatchObject({ definitive: true });
        await expect(buffer.publishToTikTok([{ format: 'story' }], '', { apiKey: 'mock', channelId: 'mock' }))
            .rejects.toMatchObject({ definitive: true });
    });
});

describe.skipIf(!enabled)('functional flows on isolated demo emulators', () => {
    let db;
    let app;
    let bucket;
    let gamification;
    let account;
    let firestoreHelpers;
    let socialCallables;
    let friends;
    beforeAll(() => {
        for (const host of [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_STORAGE_EMULATOR_HOST]) {
            if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Local emulator hosts required');
        }
        db = new Firestore({ projectId: 'demo-bingeki-flows' });
        app = initializeApp({ projectId: 'demo-bingeki-flows', storageBucket: 'demo-bingeki-flows.appspot.com' });
        bucket = getStorage(app).bucket();
        gamification = require('../gamification.js');
        account = require('../account.js');
        firestoreHelpers = require('../social/shared/firestore.js');
        socialCallables = require('../social/admin/callables.js');
        friends = require('../social.js');
    });
    beforeEach(async () => {
        for (const collection of await db.listCollections()) await db.recursiveDelete(collection);
        await bucket.deleteFiles();
    });
    afterAll(async () => {
        await db.terminate();
        await deleteApp(app);
    });

    it('removes owned data, embedded mentions, orphan mirrors and storage, and is retryable', async () => {
        const fixtures = {
            'users/departing': { displayName: 'Synthetic user' },
            'users/departing/data/library': { works: [] },
            'users/departing/notifications/n': { body: 'private' },
            'users/remaining': { displayName: 'Other' },
            'users/remaining/friends/departing': { displayName: 'Synthetic user' },
            'users/remaining/notifications/ref': { actorId: 'departing' },
            'activities/a': { userId: 'departing' },
            'comments/owned': { userId: 'departing' },
            'tierLists/owned': { userId: 'departing' },
            'tierLists/liked': { userId: 'remaining', likes: ['departing', 'remaining'], likesCount: 2 },
            'comments/liked': { userId: 'remaining', likes: ['departing'] },
            'watchparties/hosted': { hostId: 'departing' },
            'watchparties/legacy': { creatorId: 'departing' },
            'watchparties/joined': { hostId: 'remaining', participants: [{ id: 'departing', name: 'Remove me' }, { id: 'remaining' }] },
            'challenges/owned': { createdBy: 'departing', participantIds: ['departing', 'remaining'] },
            'challenges/joined': {
                createdBy: 'remaining', participantIds: ['departing', 'remaining'], winnerId: 'departing',
                participants: [{ id: 'departing', name: 'Remove me' }, { id: 'remaining', progress: 12 }],
            },
            'challenges/empty': { createdBy: 'remaining', participantIds: ['departing'] },
            'feedback/f': { userId: 'departing' },
        };
        await Promise.all(Object.entries(fixtures).map(([path, data]) => db.doc(path).set(data)));
        await Promise.all(['users/departing/banner.png', 'avatars/departing', 'avatars/departing/a.png', 'avatars/departing-other', 'banners/departing_legacy.png', 'feedback-attachments/f/a.png', 'users/remaining/keep.png']
            .map(path => bucket.file(path).save('synthetic', { contentType: 'image/png', resumable: false })));
        const auth = { deleteUser: vi.fn().mockResolvedValue(undefined) };
        await cleanupAccount(db, bucket, auth, 'departing');
        expect((await db.doc('users/departing').get()).exists).toBe(false);
        expect((await db.doc('users/departing/data/library').get()).exists).toBe(false);
        expect((await db.doc('users/remaining/friends/departing').get()).exists).toBe(false);
        expect((await db.doc('users/remaining/notifications/ref').get()).exists).toBe(false);
        expect((await db.doc('watchparties/hosted').get()).exists).toBe(false);
        expect((await db.doc('watchparties/legacy').get()).exists).toBe(false);
        expect((await db.doc('watchparties/joined').get()).data().participants).toEqual([{ id: 'remaining' }]);
        expect((await db.doc('challenges/owned').get()).exists).toBe(false);
        expect((await db.doc('challenges/empty').get()).exists).toBe(false);
        expect((await db.doc('challenges/joined').get()).data()).toEqual({
            createdBy: 'remaining', participantIds: ['remaining'], participants: [{ id: 'remaining', progress: 12 }],
        });
        expect((await db.doc('tierLists/liked').get()).data()).toMatchObject({ likes: ['remaining'], likesCount: 1 });
        expect((await db.doc('comments/liked').get()).data().likes).toEqual([]);
        expect((await bucket.getFiles())[0].map(file => file.name).sort()).toEqual(['avatars/departing-other', 'users/remaining/keep.png']);
        expect((await db.doc('accountDeletions/departing').get()).exists).toBe(true);
        auth.deleteUser.mockRejectedValue(Object.assign(new Error('already removed'), { code: 'auth/user-not-found' }));
        await expect(cleanupAccount(db, bucket, auth, 'departing')).resolves.toBeUndefined();
    }, 30_000);

    it('resumes a long scan after its durable document cursor without revisiting completed documents', async () => {
        await db.doc('users/departing').set({});
        for (const id of ['a', 'b', 'c']) {
            await db.doc(`watchparties/${id}`).set({ hostId: 'remaining', participants: [{ id: 'departing' }, { id: 'remaining' }] });
        }
        const reads = [];
        let interrupted = false;
        const run = db.runTransaction.bind(db);
        const spy = vi.spyOn(db, 'runTransaction').mockImplementation(callback => run(transaction => {
            const get = transaction.get.bind(transaction);
            transaction.get = async ref => {
                reads.push(ref.path);
                if (ref.path === 'watchparties/b' && !interrupted) {
                    interrupted = true;
                    throw new Error('synthetic interruption mid-scan');
                }
                return get(ref);
            };
            return callback(transaction);
        }));
        const auth = { deleteUser: vi.fn() };
        try {
            await expect(cleanupAccount(db, bucket, auth, 'departing')).rejects.toThrow('interruption mid-scan');
            expect(auth.deleteUser).not.toHaveBeenCalled();
            expect((await db.doc('accountDeletions/departing').get()).data().cleanupProgress['watchparty-participants'])
                .toMatchObject({ lastId: 'a', done: false });
            reads.length = 0;
            await cleanupAccount(db, bucket, auth, 'departing');
            expect(reads).not.toContain('watchparties/a');
            expect(reads).toContain('watchparties/b');
            for (const id of ['a', 'b', 'c']) {
                expect((await db.doc(`watchparties/${id}`).get()).data().participants).toEqual([{ id: 'remaining' }]);
            }
            expect(auth.deleteUser).toHaveBeenCalledOnce();
        } finally {
            spy.mockRestore();
        }
    }, 30_000);

    it('keeps a tombstone and reports cleanup failures before Auth deletion', async () => {
        await db.doc('users/u').set({ displayName: 'u' });
        const auth = { deleteUser: vi.fn() };
        const failingBucket = { deleteFiles: vi.fn().mockRejectedValue(new Error('storage unavailable')) };
        await expect(cleanupAccount(db, failingBucket, auth, 'u')).rejects.toThrow('storage unavailable');
        expect(auth.deleteUser).not.toHaveBeenCalled();
        expect((await db.doc('users/u').get()).data().deleting).toBe(true);
        expect((await db.doc('accountDeletions/u').get()).exists).toBe(true);
    });

    it('requires a recent sign-in before starting any cleanup', async () => {
        await expect(account.deleteOwnAccount.run({})).rejects.toMatchObject({ code: 'unauthenticated' });
        await expect(account.deleteOwnAccount.run({
            auth: { uid: 'u', token: { auth_time: Date.now() / 1000 - 600 } },
        })).rejects.toMatchObject({ code: 'failed-precondition', details: { reason: 'requires-recent-login' } });
        expect((await db.collection('accountDeletions').get()).empty).toBe(true);
    });

    it('does not resurrect a deleted profile, gamification or activities from stale trigger events', async () => {
        const works = [{ id: 1, type: 'manga', title: 'Synthetic', currentChapter: 10, status: 'reading' }];
        await db.doc('users/u').set({ displayName: 'Synthetic' });
        await db.doc('users/u/data/library').set({ works });
        const event = {
            params: { userId: 'u' },
            data: { before: { exists: false }, after: { exists: true, data: () => ({ works }) } },
        };
        await Promise.all([
            gamification.onLibraryUpdate.run(event),
            cleanupAccount(db, bucket, { deleteUser: vi.fn() }, 'u'),
        ]);
        await gamification.onLibraryUpdate.run(event);
        await gamification.onGamificationUpdate.run({
            params: { userId: 'u' },
            data: { before: { exists: false }, after: { exists: true, data: () => ({ bonusXp: 20 }) } },
        });
        expect((await db.doc('users/u').get()).exists).toBe(false);
        expect((await db.doc('users/u/data/gamification').get()).exists).toBe(false);
        expect((await db.collection('activities').get()).empty).toBe(true);
    }, 30_000);

    it('does not persist a future activity verification date', async () => {
        await db.doc('users/u').set({ displayName: 'Synthetic' });
        await db.doc('users/u/data/gamification').set({ bonusXp: 10, lastActivityDate: '2999-01-01T00:00:00Z' });
        await gamification.onGamificationUpdate.run({
            params: { userId: 'u' },
            data: { before: { exists: false }, after: { exists: true, data: () => ({ bonusXp: 10 }) } },
        });
        const data = (await db.doc('users/u/data/gamification').get()).data();
        expect(data.lastActivityDate).toBeNull();
        expect(data.verifiedStreakAt).toBeNull();
    });

    it('does not recreate friend mirrors when a request races with deletion', async () => {
        await Promise.all([db.doc('users/u').set({ displayName: 'u' }), db.doc('users/v').set({ displayName: 'v' })]);
        const outcomes = await Promise.allSettled([
            friends.sendFriendRequestFn.run({ auth: { uid: 'u' }, data: { targetUserId: 'v' } }),
            cleanupAccount(db, bucket, { deleteUser: vi.fn() }, 'u'),
        ]);
        expect(outcomes[1].status).toBe('fulfilled');
        expect((await db.doc('users/u').get()).exists).toBe(false);
        expect((await db.doc('users/v/friends/u').get()).exists).toBe(false);
        await expect(friends.sendFriendRequestFn.run({
            auth: { uid: 'u' }, data: { targetUserId: 'v' },
        })).rejects.toMatchObject({ code: 'failed-precondition' });
    }, 30_000);

    it('keeps private, banned and deleting profiles out of the public leaderboard', async () => {
        await Promise.all([
            db.doc('users/public').set({ totalXp: 100, profileVisibility: 'public' }),
            db.doc('users/private').set({ totalXp: 1000, profileVisibility: 'private' }),
            db.doc('users/friends').set({ totalXp: 900, profileVisibility: 'friends' }),
            db.doc('users/banned').set({ totalXp: 800, isBanned: true }),
            db.doc('users/deleting').set({ totalXp: 700, deleting: true }),
            db.doc('users/tombstone').set({ totalXp: 600 }),
            db.doc('accountDeletions/tombstone').set({}),
        ]);
        const result = await gamification.getLeaderboard.run({ data: { limit: 20 } });
        expect(result.leaderboard.map(user => user.uid)).toEqual(['public']);
    });

    it('backfills legacy popularity counts transactionally and is safe to rerun', async () => {
        const directory = mkdtempSync(join(tmpdir(), 'bingeki-flow-migration-'));
        try {
            await db.doc('users/owner').set({});
            await db.doc('tierLists/legacy').set({ userId: 'owner', likes: ['a', 'b', 'a'], isPublic: true });
            await db.doc('tierLists/empty').set({ userId: 'owner', likes: [], isPublic: true });
            const planFile = join(directory, 'plan.json');
            expect((await repairTierListCounts(db, { planFile })).entries).toHaveLength(2);
            expect((await repairTierListCounts(db, { apply: true, planFile })).changed).toBe(2);
            expect((await db.doc('tierLists/legacy').get()).data()).toMatchObject({ likes: ['a', 'b'], likesCount: 2 });
            expect((await repairTierListCounts(db)).entries).toHaveLength(0);
            const sorted = await db.collection('tierLists').where('isPublic', '==', true).orderBy('likesCount', 'desc').get();
            expect(sorted.docs.map(doc => doc.id)).toEqual(['legacy', 'empty']);
        } finally {
            rmSync(directory, { recursive: true });
        }
    });

    const options = {
        config: { platforms: { insta: { bufferChannelId: 'mock-insta' }, tiktok: { bufferChannelId: 'mock-tiktok' } } },
        apiKey: 'mock-only', publishedBy: 'synthetic-admin',
    };
    const pending = { caption: 'synthetic', slides: [], platforms: { insta: true, tiktok: true }, status: 'ready' };
    const publish = (publishers, extras) => publishPost(db, collections, publishers, 'p', { ...options, ...extras });

    it('admits only one concurrent publisher and replays its receipt without sending again', async () => {
        await db.doc(`${collections.pending}/p`).set(pending);
        let release;
        let started;
        const entered = new Promise(resolve => { started = resolve; });
        const blocked = new Promise(resolve => { release = resolve; });
        const publishers = {
            insta: vi.fn(async () => { started(); await blocked; return { id: 'insta-receipt' }; }),
            tiktok: vi.fn(async () => ({ id: 'tiktok-receipt' })),
        };
        const first = publish(publishers);
        await entered;
        await expect(publish(publishers)).rejects.toThrow('already in progress');
        release();
        expect((await first).ok).toBe(true);
        expect((await publish(publishers)).ok).toBe(true);
        expect(publishers.insta).toHaveBeenCalledTimes(1);
        expect(publishers.tiktok).toHaveBeenCalledTimes(1);
        expect((await db.doc(`${collections.pending}/p`).get()).exists).toBe(false);
    });

    it('resumes an expired worker without repeating receipts or ambiguous sends', async () => {
        await db.doc(`${collections.pending}/p`).set({
            ...pending, status: 'processing',
            publishLease: { owner: 'crashed', expiresAt: Date.now() - LEASE_MS },
            results: { insta: { id: 'already-sent' } },
            publishAttempts: { tiktok: { state: 'started', attemptId: 'before-crash' } },
        });
        const publishers = { insta: vi.fn(), tiktok: vi.fn() };
        const outcome = await publish(publishers);
        expect(outcome.results.insta.id).toBe('already-sent');
        expect(outcome.errors.tiktok).toMatch(/unknown/);
        expect(publishers.insta).not.toHaveBeenCalled();
        expect(publishers.tiktok).not.toHaveBeenCalled();
        await publish(publishers, { retry: true });
        expect(publishers.tiktok).not.toHaveBeenCalled();
    });

    it('retries explicit rejection only, preserves successful platforms and blocks uncertain failures', async () => {
        await db.doc(`${collections.pending}/p`).set(pending);
        const rejected = Object.assign(new Error('provider rejected input'), { definitive: true });
        const publishers = {
            insta: vi.fn().mockResolvedValue({ id: 'insta-receipt' }),
            tiktok: vi.fn().mockRejectedValueOnce(rejected).mockResolvedValue({ id: 'tiktok-retry' }),
        };
        expect((await publish(publishers)).errors.tiktok).toMatch(/rejected/);
        expect((await publish(publishers, { retry: true })).errors).toEqual({});
        expect(publishers.insta).toHaveBeenCalledTimes(1);
        expect(publishers.tiktok).toHaveBeenCalledTimes(2);

        await db.doc(`${collections.pending}/p`).set({ ...pending, platforms: { insta: true } });
        await db.doc(`${collections.published}/p`).delete();
        publishers.insta.mockRejectedValue(new Error('timeout after remote acceptance'));
        expect((await publish(publishers)).ok).toBe(false);
        await publish(publishers);
        expect(publishers.insta).toHaveBeenCalledTimes(2);
    });

    it('does not resend after the provider succeeded but receipt persistence failed', async () => {
        await db.doc(`${collections.pending}/p`).set({ ...pending, platforms: { insta: true } });
        let transactions = 0;
        const interruptedDb = {
            collection: name => db.collection(name),
            runTransaction: callback => {
                if (++transactions === 3) throw new Error('receipt checkpoint failed');
                return db.runTransaction(callback);
            },
        };
        const publishers = { insta: vi.fn().mockResolvedValue({ id: 'accepted-remotely' }), tiktok: vi.fn() };
        await expect(publishPost(interruptedDb, collections, publishers, 'p', options)).rejects.toThrow('checkpoint failed');
        await db.doc(`${collections.pending}/p`).update({ publishLease: { owner: 'interrupted', expiresAt: 0 } });
        const resumed = await publish(publishers);
        expect(resumed.ok).toBe(false);
        expect(resumed.errors.insta).toMatch(/unknown/);
        expect(publishers.insta).toHaveBeenCalledTimes(1);
    });

    it('guards admin mutations and permits explicit reconciliation without another send', async () => {
        await db.doc(`${collections.pending}/p`).set({
            ...pending, publishLease: { owner: 'active', expiresAt: Date.now() + LEASE_MS },
        });
        await expect(firestoreHelpers.deletePending('p')).rejects.toThrow('already in progress');
        await expect(firestoreHelpers.updatePendingCaption('p', { caption: 'changed' })).rejects.toThrow('already in progress');
        await db.doc(`${collections.pending}/p`).set({
            ...pending, platforms: { insta: true }, status: 'failed',
            publishAttempts: { insta: { state: 'unknown' } }, errors: { insta: 'unknown' },
        });
        await db.doc('users/admin').set({ isAdmin: true, profileVisibility: 'public' });
        const request = { auth: { uid: 'admin', token: { isAdmin: true, admin: true } }, data: { postId: 'p', platform: 'insta' } };
        expect(await socialCallables.socialMarkPublished.run(request)).toMatchObject({ complete: true });
        expect(await socialCallables.socialMarkPublished.run(request)).toMatchObject({ complete: true });
        expect((await db.doc(`${collections.published}/p`).get()).data()).toMatchObject({
            results: { insta: { id: 'manual' } }, errors: {},
            publishAttempts: { insta: { state: 'succeeded', reconciledBy: 'admin' } },
        });
    });
});
