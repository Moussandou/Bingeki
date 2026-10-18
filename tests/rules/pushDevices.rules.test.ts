import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const run = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
const ID = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'synthetic-fcm:abcdefghijklmnopqrstuvwxyz';
const DEVICE = `users/alice/pushDevices/${ID}`;

run('private iOS push device rules', () => {
    let env: RulesTestEnvironment;
    beforeAll(async () => {
        const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
        env = await initializeTestEnvironment({
            projectId: 'demo-bingeki-push-rules',
            firestore: { host, port: Number(port), rules: readFileSync(resolve('firestore.rules'), 'utf8') },
        });
    });
    afterAll(async () => { await env?.cleanup(); });
    beforeEach(async () => {
        await env.clearFirestore();
        await env.withSecurityRulesDisabled(async ctx => {
            const db = ctx.firestore();
            await Promise.all([
                setDoc(doc(db, 'users/alice'), { profileVisibility: 'public', displayName: 'Alice' }),
                setDoc(doc(db, 'users/bob'), { profileVisibility: 'public' }),
                setDoc(doc(db, 'users/friend'), {}),
                setDoc(doc(db, 'users/admin'), { isAdmin: true, isSuperAdmin: true }),
                setDoc(doc(db, 'users/alice/friends/friend'), { status: 'accepted' }),
                setDoc(doc(db, DEVICE), { tokenFCM: TOKEN, enabled: true, generation: ID }),
                setDoc(doc(db, 'pushTokenBindings/hash'), { uid: 'alice', installationId: ID, generation: ID }),
                setDoc(doc(db, 'pushDeviceState/alice'), { lastRegisteredAt: 1 }),
            ]);
        });
    });

    it('allows only the owner to get/list devices without copying tokens to public profiles', async () => {
        const db = env.authenticatedContext('alice').firestore();
        expect((await assertSucceeds(getDoc(doc(db, DEVICE)))).data()?.tokenFCM).toBe(TOKEN);
        expect((await assertSucceeds(getDocs(collection(db, 'users/alice/pushDevices')))).size).toBe(1);
        const profile = await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')));
        expect(profile.data()).not.toHaveProperty('tokenFCM');
        expect(JSON.stringify(profile.data())).not.toContain(TOKEN);
    });

    it.each(['bob', 'friend', 'admin', 'guest', 'unauthenticated'])('denies device get/list for %s', async uid => {
        const ctx = uid === 'unauthenticated' ? env.unauthenticatedContext()
            : env.authenticatedContext(uid, uid === 'guest' ? { firebase: { sign_in_provider: 'anonymous' } } : {});
        const db = ctx.firestore();
        await assertFails(getDoc(doc(db, DEVICE)));
        await assertFails(getDocs(collection(db, 'users/alice/pushDevices')));
    });

    it('denies an anonymous owner even with a preexisting profile', async () => {
        const db = env.authenticatedContext('alice', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
        await assertFails(getDoc(doc(db, DEVICE)));
    });

    it.each(['alice', 'bob', 'admin'])('blocks client token/generation/authority forgeries by %s', async uid => {
        const db = env.authenticatedContext(uid).firestore();
        await assertFails(setDoc(doc(db, `users/${uid}/pushDevices/new`), { tokenFCM: TOKEN, enabled: true }));
        await assertFails(updateDoc(doc(db, DEVICE), { generation: 'forged', tokenFCM: 'stolen' }));
        await assertFails(deleteDoc(doc(db, DEVICE)));
    });

    it.each(['alice', 'admin', 'unauthenticated'])('keeps global binding and throttle collections server-only for %s', async uid => {
        const db = (uid === 'unauthenticated' ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore();
        for (const target of ['pushTokenBindings/hash', 'pushDeviceState/alice']) {
            await assertFails(getDoc(doc(db, target)));
            await assertFails(setDoc(doc(db, target), { uid }));
            await assertFails(deleteDoc(doc(db, target)));
            await assertFails(getDocs(collection(db, target.split('/')[0])));
        }
    });

    it.each(['banned', 'deleting', 'tombstoned', 'missing'])('denies devices of an ineligible owner: %s', async state => {
        await env.withSecurityRulesDisabled(async ctx => {
            const db = ctx.firestore();
            if (state === 'missing') await deleteDoc(doc(db, 'users/alice'));
            else if (state === 'tombstoned') await setDoc(doc(db, 'accountDeletions/alice'), { deleting: false });
            else await updateDoc(doc(db, 'users/alice'), { [state === 'banned' ? 'isBanned' : 'deleting']: true });
        });
        const db = env.authenticatedContext('alice').firestore();
        await assertFails(getDoc(doc(db, DEVICE)));
        await assertFails(getDocs(collection(db, 'users/alice/pushDevices')));
    });
});
