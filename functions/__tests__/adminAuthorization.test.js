import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
function harness(profile, deleted = false) {
    class HttpsError extends Error {
        constructor(code, message) { super(message); this.code = code; }
    }
    const exports = {};
    vm.runInNewContext(readFileSync(require.resolve('../social/admin/callables.js'), 'utf8'), {
        exports, console,
        require: name => {
            if (name === 'firebase-admin') return {
                firestore: () => ({
                    doc: path => ({ get: async () => path.startsWith('users/')
                        ? { exists: !!profile, data: () => profile }
                        : { exists: deleted } }),
                }),
            };
            if (name === 'firebase-functions/v2/https') return { onCall: (...args) => args.at(-1), HttpsError };
            if (name === 'firebase-functions/params') return { defineSecret: value => value };
            return {};
        },
    });
    return exports.socialRejectPost;
}

describe('live admin callable authorization', () => {
    it('requires authentication', async () => {
        await expect(harness({ isAdmin: true })({ data: {} })).rejects.toHaveProperty('code', 'unauthenticated');
    });
    it.each([undefined, {}, { isAdmin: false }, { isAdmin: true, isBanned: true }, { isAdmin: true, deleting: true }])(
        'rejects stale admin claims for profile %j', async profile => {
            await expect(harness(profile)({ auth: { uid: 'alice', token: { admin: true, isAdmin: true } }, data: {} }))
                .rejects.toHaveProperty('code', 'permission-denied');
        },
    );
    it('rejects permanent tombstones even with a live admin profile', async () => {
        await expect(harness({ isAdmin: true }, true)({ auth: { uid: 'alice', token: { admin: true } }, data: {} }))
            .rejects.toHaveProperty('code', 'permission-denied');
    });
    it('preserves a live admin without a custom claim (then validates the request)', async () => {
        await expect(harness({ isAdmin: true })({ auth: { uid: 'alice', token: {} }, data: {} }))
            .rejects.toHaveProperty('code', 'invalid-argument');
    });
});
