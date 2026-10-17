import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, documentId, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

const suite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

suite('authorization regressions (#112)', () => {
    let env: RulesTestEnvironment;
    const db = (uid?: string) => uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
    const seed = async (path: string, data: Record<string, unknown>) => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), path), data));
    const read = (uid: string | undefined, path: string) => getDoc(doc(db(uid), path));
    const update = (uid: string, path: string, data: Record<string, unknown>) => updateDoc(doc(db(uid), path), data);
    const alice = { id: 'alice', name: 'Alice', progress: 0, status: 'accepted', joinedAt: 1 };
    const bob = { id: 'bob', name: 'Bob', progress: 0, status: 'pending', joinedAt: 1 };

    beforeAll(async () => {
        const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
        env = await initializeTestEnvironment({
            projectId: process.env.GCLOUD_PROJECT || 'demo-bingeki-security',
            firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
        });
    });
    afterAll(async () => { await env?.cleanup(); });
    beforeEach(async () => {
        await env.clearFirestore();
        for (const uid of ['alice', 'bob', 'eve', 'admin', 'super', 'banned', 'deleting']) {
            await seed(`users/${uid}`, {
                uid, profileVisibility: 'public',
                isAdmin: uid === 'admin' || uid === 'super', isSuperAdmin: uid === 'super',
                isBanned: uid === 'banned', deleting: uid === 'deleting',
            });
        }
    });

    it('allows public profiles and filtered discovery but rejects unfiltered discovery', async () => {
        await seed('users/private', { profileVisibility: 'private' });
        await assertSucceeds(read(undefined, 'users/alice'));
        await assertSucceeds(getDocs(query(collection(db('bob'), 'users'), where('profileVisibility', '==', 'public'))));
        await assertFails(getDocs(collection(db('bob'), 'users')));
    });

    it('protects private profiles even from authenticated strangers, retaining owner/admin access', async () => {
        await seed('users/alice', { profileVisibility: 'private' });
        await assertFails(read('bob', 'users/alice'));
        await assertFails(read(undefined, 'users/alice'));
        await assertSucceeds(read('alice', 'users/alice'));
        await assertSucceeds(read('admin', 'users/alice'));
    });

    it('requires accepted friendship, not merely an existing request', async () => {
        await seed('users/alice', { profileVisibility: 'friends' });
        await seed('users/alice/friends/bob', { status: 'pending' });
        await assertFails(read('bob', 'users/alice'));
        await seed('users/alice/friends/bob', { status: 'accepted' });
        await assertSucceeds(read('bob', 'users/alice'));
        await assertSucceeds(getDocs(query(collection(db('bob'), 'users'), where(documentId(), 'in', ['alice', 'bob']))));
        await assertFails(read('eve', 'users/alice'));
    });

    it('never exposes the monolithic library, even when a public folder is shared', async () => {
        await seed('users/alice/data/library', { works: [{ notes: 'private' }], sharing: { enabled: true, access: 'public' } });
        await seed('users/alice/friends/bob', { status: 'accepted' });
        await assertFails(read(undefined, 'users/alice/data/library'));
        await assertFails(read('bob', 'users/alice/data/library'));
        await assertSucceeds(read('alice', 'users/alice/data/library'));
        await assertSucceeds(read('admin', 'users/alice/data/library'));
    });

    it('uses live visibility for old public activities and live activity opt-out', async () => {
        await seed('activities/a', { userId: 'alice', isVisible: true, profileVisibility: 'public' });
        await assertSucceeds(read(undefined, 'activities/a'));
        await seed('users/alice', { profileVisibility: 'friends' });
        await seed('users/alice/friends/bob', { status: 'pending' });
        await assertFails(read('bob', 'activities/a'));
        await seed('users/alice/friends/bob', { status: 'accepted' });
        await assertSucceeds(read('bob', 'activities/a'));
        await assertSucceeds(getDocs(query(collection(db('bob'), 'activities'), where('userId', 'in', ['alice']), where('isVisible', '==', true))));
        await seed('users/alice', { profileVisibility: 'private' });
        await assertFails(read('bob', 'activities/a'));
        await assertSucceeds(read('alice', 'activities/a'));
        await seed('users/alice', { profileVisibility: 'public', showActivityStatus: false });
        await assertFails(read(undefined, 'activities/a'));
    });

    it('permits moderation but never ordinary-admin super-admin escalation or server-stat writes', async () => {
        await assertFails(update('admin', 'users/admin', { isSuperAdmin: true }));
        await assertFails(update('admin', 'users/bob', { isSuperAdmin: true }));
        await assertFails(update('admin', 'users/super', { isBanned: true }));
        await assertFails(update('admin', 'users/bob', { totalXp: 999999 }));
        await assertSucceeds(update('admin', 'users/bob', { isBanned: true }));
        await assertSucceeds(update('super', 'users/admin', { isSuperAdmin: true }));
        await assertFails(update('alice', 'users/alice', { deleting: true }));
        await assertFails(update('alice', 'users/alice', { uid: 'bob' }));
    });

    it.each(['banned', 'deleting'])('blocks all social mutations for %s accounts', async uid => {
        await seed('comments/c', { userId: uid, likes: [] });
        await seed('tierLists/t', { userId: uid, isPublic: true, likes: [], likesCount: 0 });
        await assertFails(setDoc(doc(db(uid), 'comments/new'), { userId: uid, likes: [] }));
        await assertFails(update(uid, 'comments/c', { text: 'edited' }));
        await assertFails(update(uid, 'tierLists/t', { likes: [uid], likesCount: 1 }));
        await assertFails(setDoc(doc(db(uid), `users/${uid}/data/library`), { works: [] }));
    });

    it('blocks resurrection of an account with a permanent deletion tombstone', async () => {
        await seed('accountDeletions/gone', { deleting: false });
        await assertFails(setDoc(doc(db('gone'), 'users/gone'), { displayName: 'back' }));
        await assertFails(setDoc(doc(db('gone'), 'users/gone/data/library'), { works: [] }));
        await assertFails(read('gone', 'accountDeletions/gone'));
    });

    it('validates gamification create with the same bounded integer claims as updates', async () => {
        const ref = doc(db('alice'), 'users/alice/data/gamification');
        for (const claims of [
            { bonusXp: -1, streak: 0 }, { bonusXp: 1001, streak: 1 },
            { bonusXp: 10.5, streak: 1 }, { bonusXp: 0, streak: -1 },
            { bonusXp: 0, streak: 366 }, { bonusXp: 0, streak: 1.5 },
            { bonusXp: 0, streak: 1, verifiedStreakAt: '2099-01-01' },
        ]) await assertFails(setDoc(ref, claims));
        await assertSucceeds(setDoc(ref, { bonusXp: 1000, streak: 365 }));
        await assertFails(updateDoc(ref, { bonusXp: -1 }));
        await assertFails(updateDoc(ref, { streak: 999999 }));
        await assertSucceeds(updateDoc(ref, { bonusXp: 0, streak: 0 }));
    });

    it('preserves bounded admin bonus adjustments without granting derived-stat access', async () => {
        const ref = doc(db('admin'), 'users/alice/data/gamification');
        await assertFails(setDoc(ref, { bonusXp: 50001, lastUpdated: 1 }));
        await assertFails(setDoc(ref, { bonusXp: 50000, totalXp: 999999 }));
        await assertSucceeds(setDoc(ref, { bonusXp: 50000, lastUpdated: 1 }));
        await assertSucceeds(updateDoc(ref, { bonusXp: 250, lastUpdated: 2 }));
        await assertFails(updateDoc(ref, { bonusXp: -1 }));
        await assertFails(updateDoc(ref, { verifiedStreak: 365 }));
        await assertFails(updateDoc(ref, { totalXp: 999999 }));
    });

    it('only toggles personal tier-list likes, with an exact count and immutable author', async () => {
        await seed('tierLists/t', { userId: 'alice', isPublic: true, likes: ['eve'], likesCount: 1 });
        await assertSucceeds(update('bob', 'tierLists/t', { likes: ['eve', 'bob'], likesCount: 2 }));
        await assertSucceeds(update('bob', 'tierLists/t', { likes: ['eve'], likesCount: 1 }));
        await assertFails(update('bob', 'tierLists/t', { likes: ['alice'], likesCount: 1 }));
        await assertFails(update('bob', 'tierLists/t', { likes: ['eve', 'bob'], likesCount: 999 }));
        await assertFails(update('bob', 'tierLists/t', { likes: ['eve', 'bob', 'bob'], likesCount: 3 }));
        await assertFails(update('alice', 'tierLists/t', { userId: 'bob' }));
        await assertFails(update('alice', 'tierLists/t', { likes: [], likesCount: 0 }));
        await assertSucceeds(update('alice', 'tierLists/t', { title: 'edited' }));
        await seed('tierLists/private', { userId: 'alice', isPublic: false, likes: [], likesCount: 0 });
        await assertFails(update('bob', 'tierLists/private', { likes: ['bob'], likesCount: 1 }));
    });

    it('prevents comment authors from forging likes or changing authorship', async () => {
        await seed('comments/c', { userId: 'alice', likes: ['bob'] });
        await assertFails(update('alice', 'comments/c', { userId: 'bob' }));
        await assertFails(update('alice', 'comments/c', { likes: ['eve'] }));
        await assertSucceeds(update('alice', 'comments/c', { text: 'edited' }));
        await assertFails(setDoc(doc(db('alice'), 'comments/forged'), { userId: 'alice', likes: ['bob'] }));
    });

    it('allows host control and self join/leave without permitting third-party participant edits', async () => {
        const party = { hostId: 'alice', status: 'active', participants: [alice], currentEpisode: 1 };
        await assertFails(setDoc(doc(db('alice'), 'watchparties/p'), party));
        await seed('watchparties/p', party);
        await assertSucceeds(update('bob', 'watchparties/p', { participants: [alice, bob], lastActivity: 2 }));
        await assertFails(update('bob', 'watchparties/p', { participants: [{ ...alice, progress: 999 }, bob] }));
        await assertFails(update('bob', 'watchparties/p', { participants: [bob] }));
        await assertFails(update('alice', 'watchparties/p', { hostId: 'bob' }));
        await assertFails(update('bob', 'watchparties/p', { currentEpisode: 10 }));
        await assertSucceeds(update('bob', 'watchparties/p', { participants: [alice] }));
        await assertSucceeds(update('alice', 'watchparties/p', { currentEpisode: 2, lastActivity: 3 }));
        await assertSucceeds(update('alice', 'watchparties/p', { status: 'ended' }));
        await assertFails(update('bob', 'watchparties/p', { participants: [alice, bob] }));
    });

    it('allows self challenge progress/accept/decline but not forged winners or third-party edits', async () => {
        await seed('challenges/c', { createdBy: 'alice', participants: [alice, bob], participantIds: ['alice', 'bob'], status: 'pending' });
        await assertFails(update('bob', 'challenges/c', { participants: [bob] }));
        await assertFails(update('bob', 'challenges/c', { participantIds: ['bob'] }));
        await assertFails(update('bob', 'challenges/c', { winnerId: 'bob', status: 'completed' }));
        await assertFails(update('bob', 'challenges/c', { createdBy: 'bob' }));
        await assertSucceeds(update('bob', 'challenges/c', { participants: [alice, { ...bob, status: 'accepted' }], status: 'active' }));
        await assertSucceeds(update('bob', 'challenges/c', { participants: [alice, { ...bob, status: 'accepted', progress: 12 }] }));
        await assertFails(update('alice', 'challenges/c', { winnerId: 'eve', status: 'completed' }));
        await assertSucceeds(update('alice', 'challenges/c', { winnerId: 'bob', status: 'completed', endDate: 2 }));
        await seed('challenges/d', { createdBy: 'alice', participants: [alice, bob], participantIds: ['alice', 'bob'], status: 'pending' });
        await assertSucceeds(update('bob', 'challenges/d', { participants: [alice, { ...bob, status: 'declined' }], participantIds: ['alice'] }));
    });

    it('preserves multi-friend invitation acceptance without changing another participant', async () => {
        const eve = { ...bob, id: 'eve', name: 'Eve' };
        await seed('challenges/group', {
            createdBy: 'alice', participants: [alice, bob, eve],
            participantIds: ['alice', 'bob', 'eve'], status: 'active', workType: 'anime',
        });
        const acceptedBob = { ...bob, status: 'accepted' };
        await assertSucceeds(update('bob', 'challenges/group', {
            participants: [alice, acceptedBob, eve], status: 'pending',
        }));
        await assertFails(update('eve', 'challenges/group', {
            participants: [alice, { ...acceptedBob, progress: 100 }, { ...eve, status: 'accepted' }],
            status: 'active',
        }));
        await assertSucceeds(update('eve', 'challenges/group', {
            participants: [alice, acceptedBob, { ...eve, status: 'accepted' }], status: 'active',
        }));
    });
});
