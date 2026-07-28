/**
 * Firestore Security Rules tests.
 *
 * These exercise the actual rules in firestore.rules against the emulator,
 * so they only run when the Firestore emulator is up (FIRESTORE_EMULATOR_HOST set,
 * e.g. via scripts/start-emulators.sh / the emulator CI job). They are skipped
 * during the plain `npm test` run so that suite stays green without an emulator.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

const runIfEmulator = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

runIfEmulator('Firestore security rules', () => {
    let testEnv: RulesTestEnvironment;

    const ALICE = 'alice';
    const BOB = 'bob';

    beforeAll(async () => {
        const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080').split(':');
        testEnv = await initializeTestEnvironment({
            projectId: 'bingeki-rules-test',
            firestore: {
                rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
                host,
                port: Number(port),
            },
        });
    });

    afterAll(async () => {
        if (testEnv) await testEnv.cleanup();
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
        // Seed two public profiles via the privileged (rules-bypassing) context.
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            await setDoc(doc(db, 'users', ALICE), {
                uid: ALICE,
                displayName: 'Alice',
                profileVisibility: 'public',
                isAdmin: false,
                isSuperAdmin: false,
                isBanned: false,
                createdAt: 1,
            });
            await setDoc(doc(db, 'users', ALICE, 'private', 'contact'), { email: 'alice@example.com' });
            await setDoc(doc(db, 'users', BOB), {
                uid: BOB,
                displayName: 'Bob',
                profileVisibility: 'public',
            });
        });
    });

    describe('users profile self-update', () => {
        it('lets the owner update their own bio', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(updateDoc(doc(db, 'users', ALICE), { bio: 'hello' }));
        });

        it('blocks a user from making themselves admin', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE), { isAdmin: true }));
        });

        it('blocks a user from making themselves super-admin', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE), { isSuperAdmin: true }));
        });

        it('blocks a user from changing their own ban flag', async () => {
            // Alice is seeded with isBanned:false; flipping it to true changes the
            // field, so the rule must reject it (same guard protects un-banning).
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE), { isBanned: true, bio: 'x' }));
        });

        it('blocks a user from editing someone else profile', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE), { bio: 'hacked' }));
        });

        it('blocks a user from inflating their own leaderboard XP', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE), { totalXp: 9_999_999, level: 99 }));
        });

        it('allows a non-stat profile write next to protected stat fields untouched', async () => {
            // Sanity: a normal profile field (not a server-managed stat) still works.
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(updateDoc(doc(db, 'users', ALICE), { themeColor: '#abcdef' }));
        });
    });

    describe('private (email) subcollection', () => {
        it('lets the owner read their own email', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(getDoc(doc(db, 'users', ALICE, 'private', 'contact')));
        });

        it('blocks another user from reading the email', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(getDoc(doc(db, 'users', ALICE, 'private', 'contact')));
        });

        it('blocks an anonymous/unauthenticated read of the email', async () => {
            const db = testEnv.unauthenticatedContext().firestore();
            await assertFails(getDoc(doc(db, 'users', ALICE, 'private', 'contact')));
        });
    });

    describe('translations collection', () => {
        it('lets an authed user request a translation (metadata only)', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(setDoc(doc(db, 'translations', 'work_1_title'), {
                input: 'タイトル',
                sourceId: 1,
                sourceType: 'work',
                sourceField: 'title',
            }));
        });

        it('blocks a client from writing the rendered `translated` payload', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(setDoc(doc(db, 'translations', 'work_1_title'), {
                input: 'タイトル',
                translated: { en: '<script>evil</script>' },
                sourceId: 1,
                sourceType: 'work',
                sourceField: 'title',
            }));
        });
    });

    describe('gamification anti-cheat', () => {
        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'users', ALICE, 'data', 'gamification'), {
                    level: 5,
                    xp: 20,
                    totalXp: 1000,
                    xpToNextLevel: 121,
                    badges: [],
                    totalChaptersRead: 100,
                    bonusXp: 200,
                    streak: 3,
                    verifiedStreak: 3,
                    lastActivityDate: '2024-03-04T10:00:00.000Z',
                });
            });
        });

        // --- client-owned fields ---

        it('allows a normal daily bonus sync', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                bonusXp: 230,
                streak: 4,
                lastActivityDate: '2024-03-05T10:00:00.000Z',
            }));
        });

        it('allows an exact reset to zero', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                bonusXp: 0,
                streak: 0,
                lastActivityDate: null,
            }));
        });

        it('blocks a partial bonusXp regression', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                bonusXp: 100,
            }));
        });

        it('blocks an absurd bonusXp jump', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                bonusXp: 40_000,
            }));
        });

        it('blocks bonusXp above the hard cap', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                bonusXp: 9_999_999,
            }));
        });

        it('blocks a negative streak', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                streak: -5,
            }));
        });

        // --- server-owned fields: the client must never touch these ---

        it('blocks the client from writing totalXp', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                totalXp: 2000,
            }));
        });

        it('blocks the client from writing level', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                level: 6,
            }));
        });

        it('blocks the client from writing badges', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                badges: [{ id: 'level_50', name: 'Légende', description: '', icon: '', rarity: 'legendary' }],
            }));
        });

        it('blocks the client from writing counters', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                totalChaptersRead: 99_999,
            }));
        });

        it('blocks the client from forging its verified streak', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                verifiedStreak: 365,
            }));
        });

        it('blocks another user from writing Alice gamification', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(updateDoc(doc(db, 'users', ALICE, 'data', 'gamification'), {
                bonusXp: 230,
            }));
        });
    });
});
