import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { canReadProfile, projectSharedLibrary } from '../sharedLibraryCore.js';

const require = createRequire(import.meta.url);
const folder = (id, access = 'public', enabled = true) => ({
    id, name: id, color: '#000', emoji: '', createdAt: 1, sharing: { enabled, access }, privateMetadata: 'secret',
});
const library = {
    works: [
        { id: 1, type: 'manga', title: 'Unfiled', notes: 'secret notes', privateFutureField: 'secret future' },
        { id: 2, type: 'anime', title: 'Public', collections: ['public', 'private'], notes: 'secret' },
        { id: 3, title: 'Friends', collections: ['friends'] },
        { id: 4, title: 'Hidden', collections: ['private'] },
    ],
    folders: [folder('public'), folder('friends', 'friends'), folder('private', 'public', false)],
    sharing: { enabled: true, access: 'public' },
    lastUpdated: 123,
    deletedWorks: [{ id: 9, deletedAt: 1 }],
};

describe('shared library projection', () => {
    it('shares only authorized works/folders without notes, private memberships or future fields', () => {
        const result = projectSharedLibrary(library, false);
        expect(result.works.map(w => w.id)).toEqual([1, 2]);
        expect(result.works[1].collections).toEqual(['public']);
        expect(result.folders.map(f => f.id)).toEqual(['public']);
        expect(result.lastUpdated).toBe(123);
        expect(JSON.stringify(result)).not.toMatch(/secret|private|deletedWorks/);
    });

    it('allows accepted friends but never pending strangers into friends-only shares', () => {
        const shared = { ...library, sharing: { enabled: true, access: 'friends' } };
        expect(projectSharedLibrary(shared, false)).toBeNull();
        expect(projectSharedLibrary(shared, true).works.map(w => w.id)).toEqual([1, 2, 3]);
    });

    it('supports isolated folder sharing with global sharing disabled', () => {
        const shared = { ...library, sharing: { enabled: false, access: 'public' } };
        expect(projectSharedLibrary(shared, false)).toBeNull();
        expect(projectSharedLibrary(shared, false, 'public').works.map(w => w.id)).toEqual([2]);
        expect(projectSharedLibrary(shared, false, 'private')).toBeNull();
        expect(projectSharedLibrary(shared, false, 'friends')).toBeNull();
        expect(projectSharedLibrary(shared, true, 'friends').works.map(w => w.id)).toEqual([3]);
    });

    it('fails closed for missing sharing or private/deleting profiles', () => {
        expect(projectSharedLibrary({ works: [] }, true)).toBeNull();
        expect(canReadProfile({ profileVisibility: 'private' }, true)).toBe(false);
        expect(canReadProfile({ profileVisibility: 'friends' }, false)).toBe(false);
        expect(canReadProfile({ profileVisibility: 'friends' }, true)).toBe(true);
        expect(canReadProfile({ profileVisibility: 'public', deleting: true }, true)).toBe(false);
        expect(canReadProfile({}, false)).toBe(true);
    });
});

function callableHarness(documents) {
    const firestore = {
        collection: name => ({
            doc: id => ({
                path: `${name}/${id}`,
                collection: nested => firestore.collection(`${name}/${id}/${nested}`),
            }),
        }),
        runTransaction: callback => callback({
            get: async ref => ({ exists: documents[ref.path] !== undefined, data: () => documents[ref.path] }),
        }),
    };
    class HttpsError extends Error {
        constructor(code, message) { super(message); this.code = code; }
    }
    const exports = {};
    vm.runInNewContext(readFileSync(require.resolve('../sharedLibrary.js'), 'utf8'), {
        exports,
        require: name => {
            if (name === 'firebase-admin') return { firestore: () => firestore };
            if (name === 'firebase-functions/v2/https') return { onCall: (_, handler) => handler, HttpsError };
            return require(`../${name.replace('./', '')}`);
        },
    });
    return exports.getSharedLibraryFn;
}

describe('getSharedLibraryFn callable boundary (mock Admin SDK)', () => {
    const docs = () => ({
        'users/alice': { profileVisibility: 'public' },
        'users/alice/data/library': library,
        'users/bob': {},
    });
    it('allows a public guest share and strips private data', async () => {
        const result = await callableHarness(docs())({ data: { userId: 'alice' } });
        expect(result.works).toHaveLength(2);
        expect(JSON.stringify(result)).not.toContain('secret');
    });
    it.each(['pending', 'accepted'])('checks the server friendship status %s', async status => {
        const documents = docs();
        documents['users/alice'].profileVisibility = 'friends';
        documents['users/alice/friends/bob'] = { status };
        const result = callableHarness(documents)({ auth: { uid: 'bob' }, data: { userId: 'alice' } });
        if (status === 'accepted') await expect(result).resolves.toHaveProperty('works');
        else await expect(result).rejects.toHaveProperty('code', 'permission-denied');
    });
    it.each([{ isBanned: true }, { deleting: true }])('rejects restricted callers %j', async flags => {
        const documents = docs();
        documents['users/bob'] = flags;
        await expect(callableHarness(documents)({ auth: { uid: 'bob' }, data: { userId: 'alice' } }))
            .rejects.toHaveProperty('code', 'permission-denied');
    });
    it('honors permanent deletion tombstones for both owner and viewer', async () => {
        const documents = docs();
        documents['accountDeletions/bob'] = { deleting: false };
        await expect(callableHarness(documents)({ auth: { uid: 'bob' }, data: { userId: 'alice' } }))
            .rejects.toHaveProperty('code', 'permission-denied');
        documents['accountDeletions/alice'] = { deleting: false };
        await expect(callableHarness(documents)({ data: { userId: 'alice' } }))
            .rejects.toHaveProperty('code', 'not-found');
    });
    it('rejects malformed identifiers before touching the database', async () => {
        await expect(callableHarness({})({ data: { userId: 'alice/private' } }))
            .rejects.toHaveProperty('code', 'invalid-argument');
    });
});
