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

        it('blocks a client from forging the server provenance fields', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(setDoc(doc(db, 'translations', 'work_2_title'), {
                input: 'Hello',
                translatedInput: 'Hello',
                sourceId: 2,
                sourceType: 'work',
                sourceField: 'title',
            }));
        });

        it('blocks a client from injecting a payload onto an existing request', async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'translations', 'work_3_title'), {
                    input: 'Hello',
                    sourceId: 3,
                    sourceType: 'work',
                    sourceField: 'title',
                });
            });
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(updateDoc(doc(db, 'translations', 'work_3_title'), {
                translated: { fr: 'contenu injecté' },
            }));
        });

        it('still lets a client refresh the source input of an existing request', async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'translations', 'work_4_title'), {
                    input: 'Old',
                    sourceId: 4,
                    sourceType: 'work',
                    sourceField: 'title',
                });
            });
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(updateDoc(doc(db, 'translations', 'work_4_title'), { input: 'New' }));
        });

        it('lets everyone read a translation (guests included)', async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'translations', 'work_5_title'), {
                    input: 'Hello',
                    translated: { fr: 'Bonjour' },
                    translatedInput: 'Hello',
                });
            });
            const db = testEnv.unauthenticatedContext().firestore();
            await assertSucceeds(getDoc(doc(db, 'translations', 'work_5_title')));
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

    describe('feedback submission', () => {
        const guestTicket = {
            message: 'The share link opens a blank page',
            userId: null,
            userName: 'Guest',
            contactEmail: 'guest@example.com',
            category: 'bug',
            rating: 0,
            status: 'open',
            priority: 'medium',
            attachments: [],
            adminResponses: [],
            userAgent: 'jsdom',
            timestamp: 1,
            lastUpdated: 1,
        };

        it('lets a logged-out visitor submit feedback', async () => {
            const db = testEnv.unauthenticatedContext().firestore();
            await assertSucceeds(setDoc(doc(db, 'feedback', 'guest1'), guestTicket));
        });

        it('blocks an anonymous ticket that claims someone else uid', async () => {
            const db = testEnv.unauthenticatedContext().firestore();
            await assertFails(setDoc(doc(db, 'feedback', 'forged'), { ...guestTicket, userId: ALICE }));
        });

        it('blocks an empty anonymous ticket', async () => {
            const db = testEnv.unauthenticatedContext().firestore();
            await assertFails(setDoc(doc(db, 'feedback', 'empty'), { ...guestTicket, message: '' }));
        });

        it('lets an authed user submit feedback under their own uid', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(setDoc(doc(db, 'feedback', 'alice1'), { ...guestTicket, userId: ALICE }));
        });

        it('blocks an authed user from attributing feedback to someone else', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(setDoc(doc(db, 'feedback', 'spoof'), { ...guestTicket, userId: ALICE }));
        });
    });

    describe('comment likes', () => {
        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'comments', 'c1'), {
                    userId: ALICE,
                    userName: 'Alice',
                    workId: 1,
                    text: 'Great arc',
                    likes: [],
                    timestamp: 1,
                });
            });
        });

        it('lets a non-author like someone else comment', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertSucceeds(updateDoc(doc(db, 'comments', 'c1'), { likes: [BOB] }));
        });

        it('lets a non-author remove their own like', async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await updateDoc(doc(ctx.firestore(), 'comments', 'c1'), { likes: [BOB] });
            });
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertSucceeds(updateDoc(doc(db, 'comments', 'c1'), { likes: [] }));
        });

        it('blocks a non-author from liking on behalf of someone else', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(updateDoc(doc(db, 'comments', 'c1'), { likes: [ALICE] }));
        });

        it('blocks a non-author from editing the comment text', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(updateDoc(doc(db, 'comments', 'c1'), { text: 'hacked' }));
        });

        it('blocks a non-author from smuggling a text edit alongside a like', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(updateDoc(doc(db, 'comments', 'c1'), { likes: [BOB], text: 'hacked' }));
        });

        it('blocks an anonymous like', async () => {
            const db = testEnv.unauthenticatedContext().firestore();
            await assertFails(updateDoc(doc(db, 'comments', 'c1'), { likes: ['ghost'] }));
        });
    });

    describe('user-created challenges', () => {
        const challenge = (createdBy: string, participantIds: string[]) => ({
            title: 'Who finishes One Piece first?',
            type: 'race_to_finish',
            participants: participantIds.map((id) => ({ id, name: id, progress: 0, joinedAt: 1, status: 'pending' })),
            participantIds,
            startDate: 1,
            status: 'active',
            createdBy,
        });

        it('lets a user create a challenge they own', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertSucceeds(setDoc(doc(db, 'challenges', 'ch1'), challenge(ALICE, [ALICE, BOB])));
        });

        it('blocks creating a challenge attributed to someone else', async () => {
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(setDoc(doc(db, 'challenges', 'ch2'), challenge(ALICE, [ALICE])));
        });

        it('blocks a creator who is not a participant', async () => {
            const db = testEnv.authenticatedContext(ALICE).firestore();
            await assertFails(setDoc(doc(db, 'challenges', 'ch3'), challenge(ALICE, [BOB])));
        });

        it('lets an invited participant update their progress', async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'challenges', 'ch4'), challenge(ALICE, [ALICE, BOB]));
            });
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertSucceeds(updateDoc(doc(db, 'challenges', 'ch4'), {
                participants: [{ id: BOB, name: 'Bob', progress: 12, joinedAt: 1, status: 'accepted' }],
            }));
        });

        it('blocks an outsider from reading a challenge they are not in', async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'challenges', 'ch5'), challenge(ALICE, [ALICE]));
            });
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(getDoc(doc(db, 'challenges', 'ch5')));
        });

        it('blocks an outsider from tampering with a challenge', async () => {
            await testEnv.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'challenges', 'ch6'), challenge(ALICE, [ALICE]));
            });
            const db = testEnv.authenticatedContext(BOB).firestore();
            await assertFails(updateDoc(doc(db, 'challenges', 'ch6'), { status: 'cancelled' }));
        });
    });
});
