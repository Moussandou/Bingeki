import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../communityCore');
const review = (extra = {}) => ({
    workId: 42, workType: 'manga', unit: 5, text: 'A thoughtful review.', rating: 8,
    spoiler: false, visibility: 'public', ...extra,
});

describe('community domain rules', () => {
    it('uses Monday UTC across year boundaries and Sunday nights', () => {
        expect(core.weekId(Date.parse('2026-10-18T23:59:59Z'))).toBe('2026-10-12');
        expect(core.weekId(Date.parse('2026-10-19T00:00:00Z'))).toBe('2026-10-19');
        expect(core.weekId(Date.parse('2027-01-01T01:00:00Z'))).toBe('2026-12-28');
    });
    it('validates targets, scores, visibility and bounded text', () => {
        expect(core.normalizeReview(review())).toMatchObject({ workKey: 'manga:42', unit: 5 });
        expect(core.normalizeReview(review({ unit: null, rating: null }))).toMatchObject({ unit: null });
        for (const invalid of [
            { workType: 'novel' }, { workId: '42' }, { workId: -1 }, { unit: 1.5 }, { unit: 0 },
            { unit: 5001 }, { rating: 11 }, { rating: 0 }, { rating: 1.5 }, { text: '  ' },
            { text: 'x'.repeat(4001) }, { visibility: 'everyone' }, { spoiler: 'false' },
        ]) expect(() => core.normalizeReview(review(invalid))).toThrow();
    });
    it('masks unknown progress, future units and explicitly marked spoilers', () => {
        expect(core.concealed(review(), undefined)).toBe(true);
        expect(core.concealed(review(), 4)).toBe(true);
        expect(core.concealed(review(), 5)).toBe(false);
        expect(core.concealed(review({ spoiler: true }), 100)).toBe(true);
        expect(core.concealed(review({ spoiler: true }), 0, true)).toBe(false);
        expect(core.concealed(review({ unit: null }), undefined)).toBe(false);
    });
    it('enforces live profile visibility, friendship, moderation and bilateral blocks', () => {
        const post = { ...review(), userId: 'alice', status: 'published' };
        const friends = new Set(['alice']);
        expect(core.canView(post, {}, 'bob', new Set(), false)).toBe(true);
        expect(core.canView(post, { profileVisibility: 'private' }, 'bob', friends, false)).toBe(false);
        expect(core.canView(post, { profileVisibility: 'friends' }, 'bob', friends, false)).toBe(true);
        expect(core.canView({ ...post, visibility: 'friends' }, {}, 'bob', new Set(), false)).toBe(false);
        expect(core.canView(post, {}, 'bob', friends, true)).toBe(false);
        expect(core.canView(post, { isBanned: true }, 'alice', friends, false)).toBe(false);
        expect(core.canView({ ...post, status: 'hidden' }, {}, 'alice', friends, false)).toBe(false);
        expect(core.canView(post, { profileVisibility: 'private' }, 'alice', friends, false)).toBe(true);
    });
    it('establishes import baselines and never awards lowering or replayed progress', () => {
        const work = { id: 1, type: 'manga', currentChapter: 100 };
        const baseline = core.readingDelta([work]);
        expect(baseline.changes).toEqual([]);
        expect(core.readingDelta([{ ...work, currentChapter: 101 }], baseline.highWater).changes).toEqual([
            { key: 'manga:1', type: 'manga', id: 1, delta: 1 },
        ]);
        const lowered = core.readingDelta([{ ...work, currentChapter: 2 }], baseline.highWater);
        expect(core.readingDelta([work], lowered.highWater).changes).toEqual([]);
        expect(core.readingDelta([], baseline.highWater).highWater).toEqual(baseline.highWater);
        expect(core.readingDelta([work], baseline.highWater).changes).toEqual([]);
        expect(core.readingDelta([{ ...work, currentChapter: 99999, totalChapters: 105 }], baseline.highWater).changes[0].delta).toBe(5);
    });
    it('keeps anime and manga IDs distinct and caps rewards', () => {
        const base = core.readingDelta([{ id: 1, type: 'manga', currentChapter: 2 }, { id: 1, type: 'anime', currentChapter: 7 }]);
        expect(base.highWater).toEqual({ 'manga:1': 2, 'anime:1': 7 });
        expect(core.REVIEW_XP).toBe(10);
        expect(core.WEEKLY_XP_CAP).toBe(30);
        const earned = core.earnedDistinctions({ reviews: 3, shonen: 20, useful: 5, explored: ['a', 'b', 'c'] }, Date.parse('2026-10-18T12:00:00Z'));
        expect(earned.map(d => d.id)).toEqual(['first_voice', 'weekly_voice', 'explorer', 'shonen_scout', 'sharp_eye']);
        expect(earned.find(d => d.id === 'first_voice').expiresAt).toBeNull();
        expect(new Date(earned.find(d => d.id === 'weekly_voice').expiresAt).toISOString()).toBe('2026-10-26T00:00:00.000Z');
    });
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('community callable flows on an isolated emulator', () => {
    let db;
    let app;
    let api;
    let admin;
    const write = (uid, data) => api.communityWrite.run({ auth: { uid }, data });
    const read = (uid, data) => api.communityRead.run({ auth: { uid }, data });
    beforeAll(() => {
        if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw new Error('Local emulator required.');
        const localRequire = createRequire(require.resolve('../community.js'));
        admin = localRequire('firebase-admin');
        app = admin.initializeApp({ projectId: 'demo-bingeki-community' });
        db = admin.firestore();
        api = require('../community');
    });
    beforeEach(async () => {
        for (const collection of await db.listCollections()) await db.recursiveDelete(collection);
        for (const uid of ['alice', 'bob', 'carla', 'moderator']) {
            await db.doc(`users/${uid}`).set({
                displayName: uid, profileVisibility: 'public', createdAt: Date.now() - 10 * 86400000,
                ...(uid === 'moderator' ? { isAdmin: true } : {}),
            });
            await db.doc(`users/${uid}/data/library`).set({
                works: [{ id: 42, type: 'manga', title: 'Synthetic manga', currentChapter: uid === 'bob' ? 2 : 10 }],
            });
        }
    });
    afterAll(async () => { await db.terminate(); await app.delete(); });
    const publish = (id = 'post-one', extra = {}) => write('alice', { action: 'publish', id, review: review(extra) });

    it('publishes once, masks spoilers on the wire, reveals explicitly and keeps targets immutable', async () => {
        await expect(publish()).resolves.toMatchObject({ id: 'post-one', xp: 10 });
        await expect(publish()).resolves.toMatchObject({ id: 'post-one', xp: 0 });
        const feed = await read('bob', { action: 'feed' });
        expect(feed.items).toHaveLength(1);
        expect(feed.items[0]).toMatchObject({ text: null, rating: null, concealed: true });
        expect((await read('bob', { action: 'thread', id: 'post-one', reveal: true })).post.text).toBe('A thoughtful review.');
        await expect(write('bob', { action: 'edit', id: 'post-one', review: review() })).rejects.toHaveProperty('code', 'permission-denied');
        await expect(write('alice', { action: 'edit', id: 'post-one', review: review({ unit: 6 }) })).rejects.toHaveProperty('code', 'invalid-argument');
        await write('alice', { action: 'edit', id: 'post-one', review: review({ text: 'Updated review.' }) });
        expect((await read('alice', { action: 'thread', id: 'post-one' })).post.text).toBe('Updated review.');
    });
    it('caps weekly XP, prevents delete/repost awards and keeps XP server-owned', async () => {
        for (let i = 0; i < 4; i++) {
            await db.doc('communityState/alice').set({ lastPublishedAt: 0 }, { merge: true });
            const result = await publish(`post-${i}`, { unit: i + 1 });
            expect(result.xp).toBe(i < 3 ? 10 : 0);
        }
        expect((await db.doc('users/alice/data/gamification').get()).data().communityXp).toBe(30);
        await write('alice', { action: 'delete', id: 'post-0' });
        await db.doc('communityState/alice').set({ lastPublishedAt: 0 }, { merge: true });
        expect((await publish('reposted', { unit: 1 })).xp).toBe(0);
        expect((await read('alice', { action: 'dashboard' })).stats.reviews).toBe(4);
    });
    it('requires valid progress for reward eligibility, but not for sharing an opinion', async () => {
        expect((await publish('future', { unit: 99 })).xp).toBe(0);
        expect((await read('alice', { action: 'dashboard' })).stats.reviews).toBe(0);
    });
    it('enforces private/friends visibility and blocks in both directions on reads and writes', async () => {
        await publish('friends-post', { visibility: 'friends' });
        expect((await read('bob', { action: 'feed' })).items).toEqual([]);
        await db.doc('users/alice/friends/bob').set({ status: 'accepted' });
        await db.doc('users/bob/friends/alice').set({ status: 'accepted' });
        expect((await read('bob', { action: 'feed' })).items).toHaveLength(1);
        await write('bob', { action: 'follow', userId: 'alice', enabled: true });
        await write('alice', { action: 'block', userId: 'bob', enabled: true });
        expect((await read('bob', { action: 'feed' })).items).toEqual([]);
        await expect(read('bob', { action: 'thread', id: 'friends-post', reveal: true })).rejects.toHaveProperty('code', 'not-found');
        await expect(write('bob', { action: 'reply', id: 'friends-post', replyId: 'r', text: 'Blocked' })).rejects.toHaveProperty('code', 'not-found');
        expect((await db.doc('users/bob/communityFollows/alice').get()).exists).toBe(false);
        await write('alice', { action: 'block', userId: 'bob', enabled: false });
        await db.doc('users/alice').update({ profileVisibility: 'private' });
        expect((await read('bob', { action: 'feed' })).items).toEqual([]);
    });
    it('creates idempotent replies and generic notifications, supports opt-out and safe reply pagination', async () => {
        await publish();
        await write('bob', { action: 'reply', id: 'post-one', replyId: 'reply-one', text: 'SECRET SPOILER' });
        await write('bob', { action: 'reply', id: 'post-one', replyId: 'reply-one', text: 'SECRET SPOILER' });
        const notification = (await db.doc('users/alice/notifications/community_reply-one').get()).data();
        expect(notification).toMatchObject({ type: 'community_reply', link: '/social?post=post-one', title: '', body: '' });
        expect(JSON.stringify(notification)).not.toContain('SECRET');
        const hidden = await read('bob', { action: 'thread', id: 'post-one' });
        expect(hidden.replies[0].text).toBeNull();
        const revealed = await read('bob', { action: 'thread', id: 'post-one', reveal: true });
        expect(revealed.replies[0].text).toBe('SECRET SPOILER');
        expect(revealed.post.replyCount).toBe(1);
        await write('alice', { action: 'preferences', replies: false, digest: true });
        await write('carla', { action: 'reply', id: 'post-one', replyId: 'reply-two', text: 'Second response' });
        expect((await db.doc('users/alice/notifications/community_reply-two').get()).exists).toBe(false);
        await write('bob', { action: 'deleteReply', id: 'post-one', replyId: 'reply-one' });
        expect((await read('carla', { action: 'thread', id: 'post-one', reveal: true })).replies).toHaveLength(1);
    });
    it('deduplicates useful votes, rejects self-votes and supports reports plus admin resolution', async () => {
        await publish();
        await expect(write('alice', { action: 'react', id: 'post-one', enabled: true })).rejects.toHaveProperty('code', 'failed-precondition');
        for (const enabled of [true, true, false, true]) await write('bob', { action: 'react', id: 'post-one', enabled });
        expect((await db.doc('communityPosts/post-one').get()).data().usefulCount).toBe(1);
        expect((await db.doc(`communityWeeks/${core.weekId()}_alice`).get()).data().useful).toBe(1);
        await write('bob', { action: 'report', id: 'post-one', reason: 'spam' });
        const reports = await read('moderator', { action: 'reports' });
        expect(reports.items[0]).toMatchObject({ text: 'A thoughtful review.', reason: 'spam' });
        await expect(read('bob', { action: 'reports' })).rejects.toHaveProperty('code', 'permission-denied');
        await expect(write('bob', { action: 'moderate', id: 'post-one', reportId: reports.items[0].id, resolution: 'hide' })).rejects.toHaveProperty('code', 'permission-denied');
        await write('moderator', { action: 'moderate', id: 'post-one', reportId: reports.items[0].id, resolution: 'hide' });
        expect((await read('bob', { action: 'feed' })).items).toEqual([]);
    });
    it('paginates deterministically without mixing anime/manga identity and equips only earned titles', async () => {
        await publish();
        await expect(write('bob', { action: 'equip', title: 'shonen_scout' })).rejects.toHaveProperty('code', 'failed-precondition');
        await write('alice', { action: 'equip', title: 'first_voice' });
        expect((await read('carla', { action: 'feed' })).items[0].title).toBe('first_voice');
        expect((await read('carla', { action: 'feed', workKey: 'anime:42' })).items).toEqual([]);
        await expect(read('alice', { action: 'feed', cursor: { createdAt: 1, id: '../unsafe' } })).rejects.toHaveProperty('code', 'invalid-argument');
    });
    it('moderates long reply identifiers once and keeps visible reply counters accurate', async () => {
        const id = 'p'.repeat(128);
        const replyId = 'r'.repeat(128);
        await publish(id);
        await write('bob', { action: 'reply', id, replyId, text: 'Reported response' });
        await write('carla', { action: 'report', id, replyId, reason: 'spam' });
        await write('carla', { action: 'report', id, replyId, reason: 'spam' });
        const reports = await read('moderator', { action: 'reports' });
        expect(reports.items).toHaveLength(1);
        expect(reports.items[0].id).toHaveLength(64);
        const action = { action: 'moderate', id, reportId: reports.items[0].id, resolution: 'hide' };
        await write('moderator', action);
        await write('moderator', action);
        expect((await db.doc(`communityPosts/${id}`).get()).data()).toMatchObject({ replyCount: 0, otherReplyCount: 0, status: 'published' });
        await write('bob', { action: 'deleteReply', id, replyId });
        expect((await db.doc(`communityPosts/${id}/replies/${replyId}`).get()).data()).toMatchObject({ text: '', status: 'deleted' });
    });
    it('sends only opted-in digests once without resetting a read notification on retry', async () => {
        await write('alice', { action: 'preferences', replies: true, digest: true });
        await write('bob', { action: 'preferences', replies: true, digest: true });
        await db.doc('accountDeletions/bob').set({ deleting: true });
        await api.communityWeeklyDigest.run({});
        const notifications = await db.collection('users/alice/notifications').get();
        expect(notifications.size).toBe(1);
        await notifications.docs[0].ref.update({ read: true });
        await api.communityWeeklyDigest.run({});
        expect((await notifications.docs[0].ref.get()).data().read).toBe(true);
        expect((await db.collection('users/bob/notifications').get()).empty).toBe(true);
        expect((await db.collection('users/carla/notifications').get()).empty).toBe(true);
    });
    it('counts progress idempotently, excludes imports and classifies shonen only from server metadata', async () => {
        const trigger = async before => api.onCommunityLibraryUpdate.run({
            params: { userId: 'alice' },
            data: { before: { exists: true, data: () => ({ works: before }) }, after: await db.doc('users/alice/data/library').get() },
        });
        const work = { id: 42, type: 'manga', title: 'Synthetic', currentChapter: 10 };
        await db.doc('apiCache/manga_details_42').set({ data: { demographics: [{ mal_id: 27 }] } });
        await trigger([]);
        await db.doc('users/alice/data/library').set({ works: [{ ...work, currentChapter: 11 }] });
        await trigger([work]);
        await trigger([work]);
        expect((await read('alice', { action: 'dashboard', category: 'shonen' })).stats).toMatchObject({ chapters: 1, shonen: 1, explored: ['manga:42'] });
        await db.doc('users/alice/data/library').set({ works: [{ ...work, currentChapter: 5 }] });
        await trigger([{ ...work, currentChapter: 11 }]);
        await db.doc('users/alice/data/library').set({ works: [{ ...work, currentChapter: 11 }] });
        await trigger([{ ...work, currentChapter: 5 }]);
        expect((await read('alice', { action: 'dashboard' })).stats.chapters).toBe(1);
    });
    it('attributes delayed reading events to the write week rather than the retry week', async () => {
        const previousTime = core.weekStart() - 1000;
        const work = { id: 42, type: 'manga', title: 'Synthetic', currentChapter: 10 };
        await api.onCommunityLibraryUpdate.run({
            params: { userId: 'alice' },
            data: {
                before: { data: () => ({ works: [work] }) },
                after: { exists: true, data: () => ({ works: [{ ...work, currentChapter: 11 }] }),
                    updateTime: admin.firestore.Timestamp.fromMillis(previousTime) },
            },
        });
        expect((await db.doc(`communityWeeks/${core.weekId(previousTime)}_alice`).get()).data().chapters).toBe(1);
        expect((await db.doc(`communityWeeks/${core.weekId()}_alice`).get()).exists).toBe(false);
    });
    it('blocks stale/deleted accounts and leaves no newly resurrected state', async () => {
        await db.doc('accountDeletions/alice').set({ deleting: true });
        await expect(publish()).rejects.toHaveProperty('code', 'permission-denied');
        await api.onCommunityLibraryUpdate.run({
            params: { userId: 'alice' },
            data: { before: { exists: false, data: () => undefined }, after: await db.doc('users/alice/data/library').get() },
        });
        expect((await db.doc('communityState/alice').get()).exists).toBe(false);
    });
});
