import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, readFileSync, statSync, chmodSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { Firestore } from '@google-cloud/firestore';

const require = createRequire(import.meta.url);
const { repairTierListCounts, planTierListCounts, savePlan, loadPlan, applyTierListCounts, verifyTierListCounts } =
    require('../../scripts/repair-tierlist-counts.cjs');
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST) || process.env.RUN_MIGRATION_EMULATOR_TESTS === '1';

describe('migration CLI access guard without a database connection', () => {
    it('refuses production reads without explicit matching approval and never prints identifiers or SDK errors', () => {
        const env = { ...process.env, GCLOUD_PROJECT: 'demo-migration-denied' };
        delete env.FIRESTORE_EMULATOR_HOST;
        const result = spawnSync(process.execPath, ['scripts/repair-tierlist-counts.cjs', '--plan=/tmp/unused-plan.json'], { env, encoding: 'utf8' });
        expect(result.status).toBe(1);
        expect(result.stdout).toBe('');
        expect(result.stderr).toContain('Production access refused');
        expect(result.stderr).not.toContain('demo-migration-denied');
        expect(result.stderr).not.toContain('Error:');
    });
});

describe.skipIf(!enabled)('historical tier-list migration on a disposable demo emulator', () => {
    let emulator;
    let db;
    let directory;
    let planFile;
    let previousHost;
    let output = '';
    const testCollections = ['users', 'tierLists', 'accountDeletions', 'migrationReceipts'];
    const cleanup = async () => {
        for (const name of testCollections) await db.recursiveDelete(db.collection(name));
    };

    beforeAll(async () => {
        previousHost = process.env.FIRESTORE_EMULATOR_HOST;
        if (previousHost) {
            if (!/^(127\.0\.0\.1|localhost):\d+$/.test(previousHost)) throw new Error('Local emulator host required.');
            db = new Firestore({ projectId: 'demo-bingeki-migration' });
            return;
        }
        const jar = process.env.FIRESTORE_EMULATOR_JAR;
        if (!jar) throw new Error('Set FIRESTORE_EMULATOR_JAR to the installed Firestore emulator jar.');
        const server = createServer();
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const port = server.address().port;
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${port}`;
        emulator = spawn('java', ['-jar', jar, '--host', '127.0.0.1', '--port', String(port), '--project_id', 'demo-bingeki-migration'], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let spawnError;
        emulator.on('error', error => { spawnError = error; });
        for (const stream of [emulator.stdout, emulator.stderr]) stream.on('data', chunk => { output += chunk; });
        const deadline = Date.now() + 45000;
        while (true) {
            if (spawnError) throw spawnError;
            if (emulator.exitCode !== null) throw new Error(`Emulator exited: ${output}`);
            try {
                const response = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}`, { signal: AbortSignal.timeout(1000) });
                if (response.ok) break;
            } catch {
                // Local emulator startup only; timeout below reports its complete diagnostics.
            }
            if (Date.now() > deadline) throw new Error(`Emulator not ready: ${output}`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        db = new Firestore({ projectId: 'demo-bingeki-migration' });
    }, 60000);

    beforeEach(async () => {
        await cleanup();
        directory = mkdtempSync(join(homedir(), '.bingeki-migration-'));
        planFile = join(directory, 'plan.json');
        await db.doc('users/owner').set({ profileVisibility: 'private', email: 'synthetic-secret', displayName: 'not-in-backup' });
    });

    afterAll(async () => {
        try {
            if (db) await cleanup();
        } finally {
            if (db) await db.terminate();
            if (emulator && emulator.exitCode === null) {
                const exit = once(emulator, 'exit');
                emulator.kill('SIGTERM');
                await exit;
            }
            if (previousHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
            else process.env.FIRESTORE_EMULATOR_HOST = previousHost;
        }
    });

    // Remove only directories created by this suite, including on assertion failures.
    const directories = [];
    beforeEach(() => { if (directory) directories.push(directory); });
    afterAll(() => { for (const name of directories) rmSync(name, { recursive: true }); });

    const seed = (id, data = {}) => db.doc(`tierLists/${id}`).set({ userId: 'owner', likes: ['a', 'a', 'b'], ...data });
    const plan = options => repairTierListCounts(db, { planFile, ...options });
    const apply = options => applyTierListCounts(db, { planFile, ...options });

    it('defaults to zero writes, pages beyond 200, saves only changed fields privately, applies and verifies idempotently', async () => {
        const batch = db.batch();
        for (let i = 0; i < 205; i++) batch.set(db.doc(`tierLists/list-${String(i).padStart(3, '0')}`), {
            userId: 'owner', likes: ['a', 'a', 'b'], likesCount: i % 2 ? -2 : 'invalid',
            title: 'not-in-backup', email: 'synthetic-secret',
        });
        await batch.commit();
        const writes = vi.spyOn(db, 'runTransaction');
        const planned = await plan({ maxDocuments: 205 });
        expect(planned.scanned).toBe(205);
        expect(planned.entries).toHaveLength(205);
        expect(writes).not.toHaveBeenCalled();
        writes.mockRestore();
        expect((await db.doc('tierLists/list-000').get()).data().likes).toEqual(['a', 'a', 'b']);
        expect((await db.collection('migrationReceipts').listDocuments())).toHaveLength(0);
        expect(statSync(planFile).mode & 0o777).toBe(0o600);
        const backup = readFileSync(planFile, 'utf8');
        for (const secret of ['synthetic-secret', 'not-in-backup', 'profileVisibility', '"userId"']) expect(backup).not.toContain(secret);
        expect(await apply()).toMatchObject({ changed: 205, verified: 205 });
        expect(await apply()).toMatchObject({ changed: 0, verified: 205 });
        expect(await verifyTierListCounts(db, { planFile })).toMatchObject({ verified: 205 });
        expect((await planTierListCounts(db)).entries).toHaveLength(0);
        expect((await db.doc('users/owner').get()).data().profileVisibility).toBe('private');
    }, 60000);

    it('aborts on scan bound or any invalid likes before creating a plan or writing', async () => {
        await seed('a');
        await seed('z', { likes: [12] });
        await expect(plan({ maxDocuments: 1 })).rejects.toThrow('limit exceeded');
        await expect(plan()).rejects.toThrow('Invalid likes');
        expect(() => statSync(planFile)).toThrow();
        expect((await db.doc('tierLists/a').get()).data().likes).toEqual(['a', 'a', 'b']);
        await db.doc('tierLists/z').update({ likes: [], likesCount: { unsafe: 'object' } });
        await expect(plan()).rejects.toThrow('Unsupported counter');
    });

    it('validates the complete plan before any write and rejects target mismatch, unsafe backup and arbitrary patches', async () => {
        await seed('a');
        await seed('z');
        const planned = await plan();
        const altered = structuredClone(planned);
        altered.entries[1].after.likesCount = 123;
        const badFile = join(directory, 'bad.json');
        savePlan(badFile, altered);
        await expect(applyTierListCounts(db, { planFile: badFile })).rejects.toThrow('canonical repair');
        expect((await db.doc('tierLists/a').get()).data().likes).toEqual(['a', 'a', 'b']);
        altered.target.projectId = 'other-project';
        expect(() => savePlan(planFile, planned)).toThrow();
        const otherFile = join(directory, 'other.json');
        savePlan(otherFile, altered);
        expect(() => loadPlan(otherFile, db)).toThrow('target mismatch');
        chmodSync(planFile, 0o644);
        await expect(apply()).rejects.toThrow('private regular file');
        chmodSync(planFile, 0o600);
        const link = join(directory, 'link.json');
        symlinkSync(planFile, link);
        expect(() => loadPlan(link, db)).toThrow();
        expect(() => savePlan(join(process.cwd(), 'unsafe-migration.json'), planned)).toThrow('outside');
    });

    it('rechecks all planned versions before writes and guards changes racing with transaction execution', async () => {
        await seed('a');
        await seed('z');
        await plan();
        await db.doc('tierLists/z').update({ title: 'new title' });
        await expect(apply()).rejects.toThrow('changed since planning');
        expect((await db.doc('tierLists/a').get()).data().likes).toEqual(['a', 'a', 'b']);
        planFile = join(directory, 'new.json');
        await plan();
        const run = db.runTransaction.bind(db);
        const spy = vi.spyOn(db, 'runTransaction').mockImplementationOnce(async callback => {
            await db.doc('tierLists/a').update({ likes: ['concurrent'], likesCount: 1 });
            return run(callback);
        });
        try {
            await expect(apply()).rejects.toThrow('changed since planning');
        } finally {
            spy.mockRestore();
        }
        expect((await db.doc('tierLists/a').get()).data().likes).toEqual(['concurrent']);
    });

    it('resumes after a committed transaction loses its response; rollback restores only original fields', async () => {
        await seed('a');
        await seed('z', { likes: null, likesCount: Number.NaN, title: 'keep' });
        await plan();
        const run = db.runTransaction.bind(db);
        const spy = vi.spyOn(db, 'runTransaction').mockImplementationOnce(async callback => {
            await run(callback);
            throw new Error('simulated lost response');
        });
        try {
            await expect(apply()).rejects.toThrow('lost response');
        } finally {
            spy.mockRestore();
        }
        expect(await apply()).toMatchObject({ changed: 1, verified: 2 });
        expect(await apply({ rollback: true })).toMatchObject({ changed: 2, verified: 2 });
        expect(await apply({ rollback: true })).toMatchObject({ changed: 0, verified: 2 });
        const a = (await db.doc('tierLists/a').get()).data();
        expect(a.likes).toEqual(['a', 'a', 'b']);
        expect(Object.hasOwn(a, 'likesCount')).toBe(false);
        const z = (await db.doc('tierLists/z').get()).data();
        expect(z.likes).toBeNull();
        expect(z.likesCount).toBeNaN();
        expect(z.title).toBe('keep');
        await expect(apply()).rejects.toThrow('rolled back');
    });

    it('refuses rollback after any subsequent write, including unchanged count values', async () => {
        await seed('a');
        await plan();
        await apply();
        await db.doc('tierLists/a').update({ title: 'concurrent edit', likesCount: 2 });
        await expect(apply({ rollback: true })).rejects.toThrow('changed after migration');
        await expect(verifyTierListCounts(db, { planFile })).rejects.toThrow('verification failed');
        expect((await db.doc('tierLists/a').get()).data()).toMatchObject({ title: 'concurrent edit', likes: ['a', 'b'] });
    });

    it('admits concurrent applications exactly once through transaction retry', async () => {
        await seed('a');
        await plan();
        const outcomes = await Promise.all([apply(), apply()]);
        expect(outcomes.reduce((total, result) => total + result.changed, 0)).toBe(1);
        expect((await db.doc('tierLists/a').get()).data()).toMatchObject({ likes: ['a', 'b'], likesCount: 2 });
    }, 30000);

    it('restores missing likes, null counters and non-finite numeric counters without losing types', async () => {
        await db.doc('tierLists/missing').set({ userId: 'owner', likesCount: null });
        await seed('infinite', { likesCount: Infinity });
        await seed('negative-infinite', { likesCount: -Infinity });
        await plan();
        await apply();
        await apply({ rollback: true });
        expect((await db.doc('tierLists/missing').get()).data()).toEqual({ userId: 'owner', likesCount: null });
        expect((await db.doc('tierLists/infinite').get()).data().likesCount).toBe(Infinity);
        expect((await db.doc('tierLists/negative-infinite').get()).data().likesCount).toBe(-Infinity);
    });

    it('never infers privacy and excludes missing/banned/deleting/tombstoned owners', async () => {
        for (const [id, profile] of Object.entries({
            unknown: {}, null: { profileVisibility: null }, invalid: { profileVisibility: 'unknown' },
            friends: { profileVisibility: 'friends' }, banned: { isBanned: true },
            deleting: { deleting: true }, deleted: { deletedAt: 123 }, tombstone: {},
        })) {
            await db.doc(`users/${id}`).set(profile);
            await seed(id, { userId: id });
        }
        await db.doc('accountDeletions/tombstone').set({});
        await seed('missing', { userId: 'absent' });
        await db.doc('tierLists/no-owner').set({ likes: [] });
        const profiles = await db.collection('users').get();
        const planned = await plan();
        expect(planned.skippedOwners).toBe(6);
        expect(planned.entries.map(entry => entry.id).sort()).toEqual(['friends', 'invalid', 'null', 'unknown']);
        await apply();
        for (const profile of profiles.docs) expect((await profile.ref.get()).data()).toEqual(profile.data());
    });

    it('rejects an owner deletion racing after preflight without writing the list', async () => {
        await seed('a');
        await plan();
        const run = db.runTransaction.bind(db);
        const spy = vi.spyOn(db, 'runTransaction').mockImplementationOnce(async callback => {
            await db.doc('accountDeletions/owner').set({});
            return run(callback);
        });
        try {
            await expect(apply()).rejects.toThrow('no longer active');
        } finally {
            spy.mockRestore();
        }
        expect((await db.doc('tierLists/a').get()).data().likes).toEqual(['a', 'a', 'b']);
    });
});
