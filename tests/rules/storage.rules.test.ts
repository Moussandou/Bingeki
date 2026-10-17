import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

const suite = process.env.FIREBASE_STORAGE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

suite('Storage authorization regressions (#112)', () => {
    let env: RulesTestEnvironment;
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const upload = (uid: string | undefined, path: string, contentType = 'image/png', data = bytes) => {
        const storage = uid ? env.authenticatedContext(uid).storage() : env.unauthenticatedContext().storage();
        return uploadBytes(ref(storage, path), data, { contentType });
    };
    beforeAll(async () => {
        const [host, port] = process.env.FIREBASE_STORAGE_EMULATOR_HOST!.split(':');
        const [firestoreHost, firestorePort] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
        env = await initializeTestEnvironment({
            projectId: 'demo-bingeki-security',
            firestore: { host: firestoreHost, port: Number(firestorePort), rules: readFileSync('firestore.rules', 'utf8') },
            storage: { host, port: Number(port), rules: readFileSync('storage.rules', 'utf8') },
        });
    });
    afterAll(async () => { await env?.cleanup(); });
    beforeEach(async () => {
        await env.clearStorage();
        await env.clearFirestore();
        await env.withSecurityRulesDisabled(async ctx => {
            await setDoc(doc(ctx.firestore(), 'users/admin'), { isAdmin: true });
            await setDoc(doc(ctx.firestore(), 'users/banned'), { isBanned: true });
            await setDoc(doc(ctx.firestore(), 'accountDeletions/gone'), { deleting: false });
        });
    });

    it('allows guest feedback creation but never overwrite, metadata replacement or deletion', async () => {
        const path = 'feedback-attachments/ticket/image.png';
        await assertSucceeds(upload(undefined, path));
        await assertFails(upload(undefined, path));
        await assertFails(upload('alice', path));
        await assertFails(deleteObject(ref(env.unauthenticatedContext().storage(), path)));
        await assertSucceeds(deleteObject(ref(env.authenticatedContext('admin').storage(), path)));
    });

    it.each(['text/html', 'image/svg+xml', 'application/octet-stream'])('rejects active/unsupported MIME %s on every upload surface', async mime => {
        await assertFails(upload(undefined, 'feedback-attachments/ticket/unsafe', mime));
        await assertFails(upload('alice', 'users/alice/banners/unsafe', mime));
        await assertFails(upload('alice', 'avatars/alice', mime));
    });

    it('enforces exact size boundaries, including empty and oversized files', async () => {
        await assertFails(upload(undefined, 'feedback-attachments/ticket/empty', 'image/png', new Uint8Array()));
        await assertFails(upload('alice', 'users/alice/banners/large', 'image/png', new Uint8Array(10 * 1024 * 1024)));
        await assertSucceeds(upload('alice', 'users/alice/banners/valid', 'image/webp', new Uint8Array(10 * 1024 * 1024 - 1)));
    });

    it('preserves owner replacement/deletion and blocks cross-user and unauthenticated uploads', async () => {
        await assertSucceeds(upload('alice', 'users/alice/banners/image.png'));
        await assertSucceeds(upload('alice', 'users/alice/banners/image.png', 'image/jpeg'));
        await assertFails(upload('bob', 'users/alice/banners/image.png'));
        await assertFails(upload(undefined, 'users/alice/banners/new.png'));
        await assertSucceeds(deleteObject(ref(env.authenticatedContext('alice').storage(), 'users/alice/banners/image.png')));
        await assertSucceeds(upload('alice', 'avatars/alice'));
    });

    it.each(['banned', 'gone'])('blocks uploads by %s accounts', async uid => {
        await assertFails(upload(uid, `users/${uid}/banners/image.png`));
        await assertFails(upload(uid, 'feedback-attachments/ticket/image.png'));
    });
});
