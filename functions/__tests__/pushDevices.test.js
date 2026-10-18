import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Firestore } from '@google-cloud/firestore';

const require = createRequire(import.meta.url);
const { mutateDevice, hashToken, COOLDOWN_MS } = require('../pushDevicesCore');
const { cleanupAccount } = require('../accountCore');
const ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'synthetic-fcm:abcdefghijklmnopqrstuvwxyz';
const ROTATED = 'synthetic-fcm:rotated-abcdefghijklmnopqrstuvwxyz';
const path = (uid = 'alice', id = ID) => `users/${uid}/pushDevices/${id}`;
const registration = (changes = {}) => ({
    installationId: ID, expectedGeneration: null, tokenFCM: TOKEN,
    platform: 'ios', bundleId: 'com.bingeki.ios', permission: 'authorized', enabled: true, ...changes,
});
const revoke = generation => ({ installationId: ID, expectedGeneration: generation });

function harness(documents = { 'users/alice': {}, 'users/bob': {} }) {
    const ref = path => ({ path, collection: name => collection(`${path}/${name}`) });
    const collection = path => ({ doc: id => ref(`${path}/${id}`) });
    const db = {
        collection,
        runTransaction: async callback => {
            const pending = [];
            const result = await callback({
                get: async ref => {
                    if (pending.length) throw new Error('Read after write');
                    const value = documents[ref.path];
                    return { exists: value !== undefined, data: () => value };
                },
                set: (ref, data, options) => pending.push(() => {
                    documents[ref.path] = options?.merge ? { ...documents[ref.path], ...data } : data;
                }),
                create: (ref, data) => pending.push(() => {
                    if (documents[ref.path] !== undefined) throw Object.assign(new Error('Already exists'), { code: 6 });
                    documents[ref.path] = data;
                }),
                delete: ref => pending.push(() => { delete documents[ref.path]; }),
            });
            pending.forEach(write => write());
            return result;
        },
    };
    return { db, documents };
}

describe('private push registry transitions', () => {
    it('registers, retries without quota penalty, rotates and strips the old binding', async () => {
        const { db, documents } = harness();
        const first = await mutateDevice(db, 'alice', registration(), 'register', 0);
        expect(first).toMatchObject({ ok: true, enabled: true });
        expect(documents[path()]).toMatchObject({ tokenFCM: TOKEN, tokenHash: hashToken(TOKEN), generation: first.generation });
        expect(documents[`pushTokenBindings/${hashToken(TOKEN)}`]).toMatchObject({ uid: 'alice', generation: first.generation });
        expect(await mutateDevice(db, 'alice', registration(), 'register', 1)).toEqual(first);
        const second = await mutateDevice(db, 'alice', registration({
            tokenFCM: ROTATED, expectedGeneration: first.generation,
        }), 'register', COOLDOWN_MS);
        expect(second.generation).not.toBe(first.generation);
        expect(documents[`pushTokenBindings/${hashToken(TOKEN)}`]).toBeUndefined();
        expect(await mutateDevice(db, 'alice', revoke(first.generation), 'revoke', COOLDOWN_MS)).toEqual({ ok: true, revoked: false });
        expect(documents[path()].tokenFCM).toBe(ROTATED);
    });

    it('transfers A to B, removes the old token, and rejects late revoke/register from A', async () => {
        const { db, documents } = harness();
        const a = await mutateDevice(db, 'alice', registration(), 'register', 0);
        const b = await mutateDevice(db, 'bob', registration(), 'register', 0);
        expect(documents[path()]).toMatchObject({ enabled: false });
        expect(documents[path()]).not.toHaveProperty('tokenFCM');
        expect(documents[path()]).not.toHaveProperty('tokenHash');
        expect(await mutateDevice(db, 'alice', revoke(a.generation), 'revoke', 1)).toEqual({ ok: true, revoked: false });
        await expect(mutateDevice(db, 'alice', registration({ expectedGeneration: a.generation }), 'register', COOLDOWN_MS))
            .rejects.toHaveProperty('code', 'aborted');
        expect(documents[`pushTokenBindings/${hashToken(TOKEN)}`]).toMatchObject({ uid: 'bob', generation: b.generation });
        expect(documents[path('bob')].tokenFCM).toBe(TOKEN);
        const rotatedB = await mutateDevice(db, 'bob', registration({
            tokenFCM: ROTATED, expectedGeneration: b.generation,
        }), 'register', COOLDOWN_MS);
        expect(await mutateDevice(db, 'alice', revoke(a.generation), 'revoke', COOLDOWN_MS + 1))
            .toEqual({ ok: true, revoked: false });
        expect(documents[`pushTokenBindings/${hashToken(TOKEN)}`]).toBeUndefined();
        expect(documents[`pushTokenBindings/${hashToken(ROTATED)}`]).toMatchObject({ uid: 'bob', generation: rotatedB.generation });
        expect(documents[path('bob')].tokenFCM).toBe(ROTATED);
    });

    it('transfers between installations on one account without duplicate leases', async () => {
        const { db, documents } = harness();
        await mutateDevice(db, 'alice', registration(), 'register', 0);
        await mutateDevice(db, 'alice', registration({ installationId: OTHER_ID }), 'register', COOLDOWN_MS);
        expect(documents[path()]).not.toHaveProperty('tokenFCM');
        expect(documents[path('alice', OTHER_ID)].tokenFCM).toBe(TOKEN);
    });

    it('revokes immediately after registration, preserves a generation tombstone and never resurrects on retry', async () => {
        const { db, documents } = harness();
        const first = await mutateDevice(db, 'alice', registration(), 'register', 0);
        expect(await mutateDevice(db, 'alice', revoke(first.generation), 'revoke', 1)).toEqual({ ok: true, revoked: true });
        expect(documents[path()]).not.toHaveProperty('tokenFCM');
        expect(documents[`pushTokenBindings/${hashToken(TOKEN)}`]).toBeUndefined();
        expect(await mutateDevice(db, 'alice', revoke(first.generation), 'revoke', 2)).toEqual({ ok: true, revoked: false });
        await expect(mutateDevice(db, 'alice', registration(), 'register', COOLDOWN_MS))
            .rejects.toHaveProperty('code', 'aborted');
        const next = await mutateDevice(db, 'alice', registration({ expectedGeneration: documents[path()].generation }), 'register', COOLDOWN_MS);
        expect(next.generation).not.toBe(first.generation);
    });

    it('rejects stale generations even for deleted/missing installations and makes revoke a no-op', async () => {
        const { db } = harness();
        await expect(mutateDevice(db, 'alice', registration({ expectedGeneration: ID }), 'register'))
            .rejects.toHaveProperty('code', 'aborted');
        expect(await mutateDevice(db, 'alice', revoke(ID), 'revoke')).toEqual({ ok: true, revoked: false });
    });

    it('rate limits changed registrations per account, not per installation, with explicit retry information', async () => {
        const { db, documents } = harness();
        await mutateDevice(db, 'alice', registration(), 'register', 100);
        await expect(mutateDevice(db, 'alice', registration({ installationId: OTHER_ID, tokenFCM: ROTATED }), 'register', 101))
            .rejects.toMatchObject({ code: 'resource-exhausted', details: { retryAfterMs: 9999 } });
        expect(documents[path('alice', OTHER_ID)]).toBeUndefined();
    });

    it('rate limits effective revocations separately without penalizing retries', async () => {
        const { db } = harness();
        const a = await mutateDevice(db, 'alice', registration(), 'register', 0);
        const b = await mutateDevice(db, 'alice', registration({ installationId: OTHER_ID, tokenFCM: ROTATED }), 'register', COOLDOWN_MS);
        await mutateDevice(db, 'alice', revoke(a.generation), 'revoke', COOLDOWN_MS);
        await expect(mutateDevice(db, 'alice', { installationId: OTHER_ID, expectedGeneration: b.generation }, 'revoke', COOLDOWN_MS + 1))
            .rejects.toHaveProperty('code', 'resource-exhausted');
    });

    it.each([undefined, { isBanned: true }, { deleting: true }])('rejects unavailable account %j for both operations', async profile => {
        const { db, documents } = harness();
        if (profile === undefined) delete documents['users/alice'];
        else documents['users/alice'] = profile;
        for (const [operation, data] of [['register', registration()], ['revoke', revoke(ID)]]) {
            await expect(mutateDevice(db, 'alice', data, operation)).rejects.toHaveProperty('code', 'failed-precondition');
        }
    });

    it('rejects a permanent tombstone even when deleting=false and a profile was recreated', async () => {
        const { db, documents } = harness();
        documents['accountDeletions/alice'] = { deleting: false };
        await expect(mutateDevice(db, 'alice', registration(), 'register')).rejects.toHaveProperty('code', 'failed-precondition');
    });

    it.each([
        null, [], {}, registration({ uid: 'bob' }), registration({ installationId: 'alice/private' }),
        registration({ expectedGeneration: 1 }), registration({ platform: 'android' }),
        registration({ bundleId: 'com.other' }), registration({ permission: 'unknown' }),
        registration({ permission: 'denied', enabled: true }), registration({ enabled: 'true' }),
        registration({ tokenFCM: 'a'.repeat(64) }), registration({ tokenFCM: 'bad token' }),
        registration({ tokenFCM: 'a'.repeat(4097) }), registration({ createdAt: 1 }),
    ])('rejects malformed input without echoing secrets: case %#', async data => {
        const { db } = harness();
        const error = await mutateDevice(db, 'alice', data, 'register').catch(error => error);
        expect(error.code).toBe('invalid-argument');
        expect(error.message).not.toContain(TOKEN);
    });

    it.each(['denied', 'notDetermined', 'authorized', 'provisional', 'ephemeral'])('supports disabled permission %s without implying delivery', async permission => {
        const { db } = harness();
        expect(await mutateDevice(db, 'alice', registration({ permission, enabled: false }), 'register'))
            .toMatchObject({ enabled: false });
    });

    it('rejects null-generation/forged revoke fields and does not expose tokens in responses', async () => {
        const { db } = harness();
        await expect(mutateDevice(db, 'alice', revoke(null), 'revoke')).rejects.toHaveProperty('code', 'invalid-argument');
        await expect(mutateDevice(db, 'alice', { ...revoke(ID), tokenFCM: TOKEN }, 'revoke')).rejects.toHaveProperty('code', 'invalid-argument');
        expect(JSON.stringify(await mutateDevice(db, 'alice', registration(), 'register'))).not.toMatch(/token|synthetic/);
    });
});

describe('push callable boundary', () => {
    function load(fail = false) {
        const { HttpsError } = require('firebase-functions/v2/https');
        const mutate = vi.fn(async () => {
            if (fail) throw new Error(TOKEN);
            return { ok: true };
        });
        const log = vi.fn();
        const exports = {};
        vm.runInNewContext(readFileSync(require.resolve('../pushDevices.js'), 'utf8'), {
            exports, require: name => {
                if (name === 'firebase-functions/v2/https') return { onCall: (_, handler) => handler, HttpsError };
                if (name === 'firebase-admin') return { firestore: () => 'database' };
                if (name === 'firebase-functions/logger') return { error: log };
                if (name === './pushDevicesCore') return { mutateDevice: mutate };
                return require(`../${name.replace('./', '')}`);
            },
        });
        return { ...exports, mutate, log };
    }
    it('requires auth, rejects anonymous guests and uses only the authenticated UID', async () => {
        const api = load();
        for (const name of ['registerPushDevice', 'revokePushDevice']) {
            await expect(api[name]({ data: {} })).rejects.toHaveProperty('code', 'unauthenticated');
            await expect(api[name]({ auth: { uid: 'guest', token: { firebase: { sign_in_provider: 'anonymous' } } } }))
                .rejects.toHaveProperty('code', 'permission-denied');
            await api[name]({ auth: { uid: 'alice' }, data: { uid: 'bob' } });
            expect(api.mutate.mock.calls.at(-1)[1]).toBe('alice');
        }
    });
    it('reports unexpected errors without logging or returning SDK payloads/tokens', async () => {
        const api = load(true);
        const error = await api.registerPushDevice({ auth: { uid: 'alice' }, data: registration() }).catch(error => error);
        expect(error.code).toBe('internal');
        expect(error.message).not.toContain(TOKEN);
        expect(JSON.stringify(api.log.mock.calls)).not.toContain(TOKEN);
        expect(api.log).toHaveBeenCalledOnce();
    });
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('push registry real Firestore transactions and cleanup', () => {
    let db;
    beforeAll(() => {
        if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw new Error('Local emulator required');
        db = new Firestore({ projectId: 'demo-bingeki-push-transactions' });
    });
    beforeEach(async () => {
        for (const collection of await db.listCollections()) await db.recursiveDelete(collection);
        await db.doc('users/alice').set({});
        await db.doc('users/bob').set({});
    });
    afterAll(async () => { await db?.terminate(); });

    it('serializes simultaneous A/B ownership claims to exactly one token holder', async () => {
        const uids = ['alice', 'bob'];
        const results = await Promise.allSettled(uids.map(uid => mutateDevice(db, uid, registration(), 'register', 0)));
        expect(results.some(result => result.status === 'fulfilled')).toBe(true);
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected') {
                expect(results[i].reason.code).toBe('aborted');
                await mutateDevice(db, uids[i], registration(), 'register', 0);
            }
        }
        const binding = (await db.doc(`pushTokenBindings/${hashToken(TOKEN)}`).get()).data();
        for (const uid of ['alice', 'bob']) {
            const device = (await db.doc(path(uid)).get()).data();
            expect(Boolean(device.tokenFCM)).toBe(uid === binding.uid);
            if (uid === binding.uid) expect(device.generation).toBe(binding.generation);
        }
    }, 30_000);

    it('uses server timestamps and survives real rotation, retry, transfer and late revocation', async () => {
        const first = await mutateDevice(db, 'alice', registration(), 'register', 0);
        expect(await mutateDevice(db, 'alice', registration(), 'register', 1)).toEqual(first);
        const createdAt = (await db.doc(path()).get()).data().createdAt;
        expect(createdAt.toMillis()).toBeGreaterThan(0);
        const rotation = registration({ tokenFCM: ROTATED, expectedGeneration: first.generation });
        const second = await mutateDevice(db, 'alice', rotation, 'register', COOLDOWN_MS);
        expect(await mutateDevice(db, 'alice', rotation, 'register', COOLDOWN_MS + 1)).toEqual(second);
        expect((await db.doc(path()).get()).data().createdAt.isEqual(createdAt)).toBe(true);
        expect((await db.doc(`pushTokenBindings/${hashToken(TOKEN)}`).get()).exists).toBe(false);
        const b = await mutateDevice(db, 'bob', registration({ tokenFCM: ROTATED }), 'register', 0);
        expect(await mutateDevice(db, 'alice', revoke(second.generation), 'revoke', COOLDOWN_MS)).toEqual({ ok: true, revoked: false });
        expect((await db.doc(`pushTokenBindings/${hashToken(ROTATED)}`).get()).data().generation).toBe(b.generation);
        expect(await mutateDevice(db, 'bob', revoke(b.generation), 'revoke', 1)).toEqual({ ok: true, revoked: true });
        expect((await db.doc(path('bob')).get()).data()).not.toHaveProperty('tokenFCM');
    }, 30_000);

    it('rechecks binding ownership after the cleanup query snapshot so a concurrent transfer survives', async () => {
        const target = db.doc('pushTokenBindings/transferring');
        await target.set({ uid: 'alice', installationId: ID, generation: ID });
        const run = db.runTransaction.bind(db);
        let transferred = false;
        const spy = vi.spyOn(db, 'runTransaction').mockImplementation(callback => run(async tx => {
            const get = tx.get.bind(tx);
            tx.get = async ref => {
                if (ref.path === target.path && !transferred) {
                    transferred = true;
                    await target.set({ uid: 'bob', installationId: ID, generation: OTHER_ID });
                }
                return get(ref);
            };
            return callback(tx);
        }));
        try {
            const bucket = { deleteFiles: vi.fn(), file: () => ({ delete: vi.fn() }) };
            await cleanupAccount(db, bucket, { deleteUser: vi.fn() }, 'alice');
            expect(transferred).toBe(true);
            expect((await target.get()).data()).toMatchObject({ uid: 'bob', generation: OTHER_ID });
        } finally {
            spy.mockRestore();
        }
    }, 30_000);

    it('serializes registration against account deletion without orphaned tokens', async () => {
        const bucket = { deleteFiles: vi.fn(), file: () => ({ delete: vi.fn() }) };
        const result = await Promise.allSettled([
            mutateDevice(db, 'alice', registration(), 'register'),
            cleanupAccount(db, bucket, { deleteUser: vi.fn() }, 'alice'),
        ]);
        expect(result[1].status).toBe('fulfilled');
        if (result[0].status === 'rejected') expect(result[0].reason.code).toBe('failed-precondition');
        expect((await db.doc(path()).get()).exists).toBe(false);
        expect((await db.collection('pushTokenBindings').where('uid', '==', 'alice').get()).empty).toBe(true);
    }, 30_000);

    it('cleans orphaned bindings globally and retries after partial failure without touching transferred B leases', async () => {
        const a = await mutateDevice(db, 'alice', registration(), 'register', 0);
        const b = await mutateDevice(db, 'bob', registration(), 'register', 0);
        await db.doc('pushTokenBindings/orphan').set({ uid: 'alice', installationId: OTHER_ID, generation: a.generation });
        const auth = { deleteUser: vi.fn() };
        const brokenBucket = { deleteFiles: vi.fn().mockRejectedValue(new Error('synthetic storage failure')) };
        await expect(cleanupAccount(db, brokenBucket, auth, 'alice')).rejects.toThrow('synthetic storage failure');
        expect(auth.deleteUser).not.toHaveBeenCalled();
        expect((await db.doc('pushTokenBindings/orphan').get()).exists).toBe(false);
        expect((await db.doc('pushDeviceState/alice').get()).exists).toBe(false);
        const bucket = { deleteFiles: vi.fn(), file: () => ({ delete: vi.fn() }) };
        await cleanupAccount(db, bucket, auth, 'alice');
        await cleanupAccount(db, bucket, auth, 'alice');
        expect((await db.doc(path()).get()).exists).toBe(false);
        expect((await db.doc('accountDeletions/alice').get()).exists).toBe(true);
        expect((await db.doc(`pushTokenBindings/${hashToken(TOKEN)}`).get()).data()).toMatchObject({ uid: 'bob', generation: b.generation });
        expect((await db.doc(path('bob')).get()).data().tokenFCM).toBe(TOKEN);
        await expect(mutateDevice(db, 'alice', registration(), 'register')).rejects.toHaveProperty('code', 'failed-precondition');
    }, 30_000);
});
