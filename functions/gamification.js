const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { CALLABLE_REGIONS } = require("./regions");
const {
    calculateUserStats,
    calculateBadges,
    clampBonusXp,
    clampClaimedStreak,
} = require("./gamificationCore");

// Fields the server owns. Clients never write these; the rules enforce it.
const SERVER_OWNED_FIELDS = [
    'level', 'xp', 'totalXp', 'xpToNextLevel',
    'totalChaptersRead', 'totalAnimeEpisodesWatched', 'totalMoviesWatched',
    'totalWorksAdded', 'totalWorksCompleted', 'badges', 'streak',
];

const MAX_ACTIVITIES_PER_WRITE = 5;
const ACTIVITY_PROGRESS_THRESHOLD = 5;

function db() {
    return admin.firestore();
}

function libraryRef(userId) {
    return db().collection('users').doc(userId).collection('data').doc('library');
}

function gamificationRef(userId) {
    return db().collection('users').doc(userId).collection('data').doc('gamification');
}

// Deep-equal for the derived payload; avoids rewriting identical docs (and re-triggering).
function isSamePayload(a, b) {
    if (!a || !b) return false;
    return SERVER_OWNED_FIELDS.every(
        (key) => JSON.stringify(a[key]) === JSON.stringify(b[key])
    );
}

/**
 * Recomputes every derived stat for a user from their library plus the
 * client-owned bonusXp/streak, and mirrors the result to both documents.
 * Returns null when nothing changed, so repeat triggers settle immediately.
 */
async function syncUserGamification(userId) {
    return db().runTransaction(async transaction => {
        const userRef = db().collection('users').doc(userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists || userSnap.data().deleting) return null;
        const [librarySnap, gamificationSnap] = await Promise.all([
            transaction.get(libraryRef(userId)),
            transaction.get(gamificationRef(userId)),
        ]);

        const works = librarySnap.exists ? (librarySnap.data().works || []) : [];
        const gamData = gamificationSnap.exists ? gamificationSnap.data() : {};

        const bonusXp = clampBonusXp(gamData.bonusXp);
        const validPastDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now();
        const activityDate = validPastDate(gamData.lastActivityDate)
            ? gamData.lastActivityDate
            : validPastDate(gamData.verifiedStreakAt) ? gamData.verifiedStreakAt : null;

        // The client claims a streak; the server only accepts a plausible advance.
        const verifiedStreak = clampClaimedStreak(
            gamData.streak,
            gamData.verifiedStreak,
            gamData.lastActivityDate,
            gamData.verifiedStreakAt
        );

        const communityXp = Math.min(50000, Math.max(0, Math.floor(gamData.communityXp || 0)));
        const stats = calculateUserStats(works, bonusXp, communityXp);
        const badges = calculateBadges(stats, verifiedStreak, gamData.badges || []);

        const payload = {
            ...stats,
            communityXp,
            badges,
            streak: verifiedStreak,
        };

        if (isSamePayload(payload, gamData) && gamData.verifiedStreak === verifiedStreak
        && gamData.lastActivityDate === activityDate && gamData.verifiedStreakAt === activityDate) {
            return null;
        }

        transaction.set(userRef, {
            ...payload,
            bonusXp,
            lastActivityDate: activityDate,
            lastUpdated: FieldValue.serverTimestamp(),
        }, { merge: true });

        transaction.set(gamificationRef(userId), {
            ...payload,
            verifiedStreak,
            lastActivityDate: activityDate,
            verifiedStreakAt: activityDate,
            lastUpdated: Date.now(),
        }, { merge: true });

        return payload;
    });
}

async function logLibraryActivities(userId, works, prevWorks) {
    return db().runTransaction(async transaction => {
        const userDoc = await transaction.get(db().collection('users').doc(userId));
        if (!userDoc.exists || userDoc.data().deleting) return;
        const userData = userDoc.exists ? userDoc.data() : {};
        const userName = userData.displayName || 'Héros';
        const userPhoto = userData.photoURL || '';
        const isVisible = userData.showActivityStatus !== false;
        const profileVisibility = userData.profileVisibility || 'public';

        const prevWorkMap = {};
        prevWorks.forEach((w) => { prevWorkMap[`${w.type}:${w.id}`] = w; });

        const activitiesToLog = [];
        for (const work of works) {
            const prev = prevWorkMap[`${work.type}:${work.id}`];
            const base = {
                userId, userName, userPhoto,
                workId: work.id, workTitle: work.title, workImage: work.image || '',
                workType: (work.type || 'manga').toLowerCase(),
                isVisible, profileVisibility, timestamp: Date.now(),
            };

            if (!prev) {
                activitiesToLog.push({ ...base, type: 'add_work' });
            } else if (work.status === 'completed' && prev.status !== 'completed') {
                activitiesToLog.push({ ...base, type: 'complete' });
            } else {
                const current = work.currentChapter || 0;
                const previous = prev.currentChapter || 0;
                if (current - previous >= ACTIVITY_PROGRESS_THRESHOLD) {
                    activitiesToLog.push({
                        ...base,
                        type: base.workType === 'anime' ? 'watch' : 'read',
                        episodeNumber: current,
                    });
                }
            }
        }

        const limited = activitiesToLog.slice(0, MAX_ACTIVITIES_PER_WRITE);
        if (limited.length === 0) return;

        for (const activity of limited) {
            const actRef = db().collection('activities').doc();
            transaction.set(actRef, { ...activity, id: actRef.id });
        }
    });
}

// --- CLOUD FUNCTIONS ---

exports.onLibraryUpdate = onDocumentWritten('users/{userId}/data/library', async (event) => {
    const userId = event.params.userId;
    const change = event.data;
    if (!change || !change.after.exists) return null;

    const libraryData = change.after.exists ? change.after.data() : { works: [] };
    const works = libraryData.works || [];
    const prevLibraryData = change.before.exists ? change.before.data() : { works: [] };
    const prevWorks = prevLibraryData.works || [];

    // viewMode/sortBy live in the same document: ignore writes that touch only those.
    if (JSON.stringify(works) === JSON.stringify(prevWorks)) {
        return null;
    }

    try {
        await syncUserGamification(userId);
    } catch (error) {
        console.error(`[Gamification] Error updating user ${userId}:`, error);
    }

    try {
        await logLibraryActivities(userId, works, prevWorks);
    } catch (actError) {
        console.error(`[Activity] Error logging activities for ${userId}:`, actError);
    }

    return null;
});

// Client-owned bonusXp/streak changes must also be re-derived server-side.
exports.onGamificationUpdate = onDocumentWritten('users/{userId}/data/gamification', async (event) => {
    const userId = event.params.userId;
    const change = event.data;
    if (!change || !change.after.exists) return null;

    const before = change.before.exists ? change.before.data() : {};
    const after = change.after.data();

    const clientOwnedChanged =
        (before.bonusXp || 0) !== (after.bonusXp || 0) ||
        (before.streak || 0) !== (after.streak || 0) ||
        (before.lastActivityDate || null) !== (after.lastActivityDate || null) ||
        (before.communityXp || 0) !== (after.communityXp || 0);

    if (!clientOwnedChanged) return null;

    try {
        await syncUserGamification(userId);
    } catch (error) {
        console.error(`[Gamification] Error syncing bonus/streak for ${userId}:`, error);
    }
    return null;
});

exports.recalculateAllUserStats = onCall({
    timeoutSeconds: 540,
    memory: '1GiB',
    cors: true,
    region: CALLABLE_REGIONS
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in.');

    const callerDoc = await db().collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || !callerDoc.data().isAdmin) {
        throw new HttpsError('permission-denied', 'Admin access required.');
    }

    const usersSnap = await db().collection('users').get();
    const results = { total: usersSnap.size, updated: 0, unchanged: 0, errors: 0 };

    for (const userDoc of usersSnap.docs) {
        try {
            const changed = await syncUserGamification(userDoc.id);
            if (changed) results.updated++;
            else results.unchanged++;
        } catch (e) {
            console.error(`Error processing user ${userDoc.id}:`, e);
            results.errors++;
        }
    }

    return results;
});

exports.getLeaderboard = onCall({ cors: true, region: CALLABLE_REGIONS }, async (request) => {
    const data = request.data || {};
    const category = data.category || 'xp';
    const limitCount = Math.min(Math.max(Number(data.limit) || 20, 1), 100);

    const fieldMap = {
        'xp': 'totalXp',
        'chapters': 'totalChaptersRead',
        'episodes': 'totalAnimeEpisodesWatched',
        'streak': 'streak'
    };
    const field = fieldMap[category] || 'totalXp';

    try {
        // Over-fetch so banned accounts can be dropped without shrinking the board.
        const usersSnap = await db()
            .collection('users').orderBy(field, 'desc').limit(limitCount * 2).get();

        const leaderboard = [];
        for (const userDoc of usersSnap.docs) {
            if (leaderboard.length >= limitCount) break;
            const d = userDoc.data();
            if (d.isBanned || d.deleting || (d.profileVisibility && d.profileVisibility !== 'public')) continue;
            if ((await db().collection('accountDeletions').doc(userDoc.id).get()).exists) continue;
            leaderboard.push({
                uid: userDoc.id, displayName: d.displayName || null, username: d.username || null,
                photoURL: d.photoURL || null, level: d.level || 1, totalXp: d.totalXp || 0,
                totalChaptersRead: d.totalChaptersRead || 0, totalAnimeEpisodesWatched: d.totalAnimeEpisodesWatched || 0,
                totalWorksCompleted: d.totalWorksCompleted || 0, streak: d.streak || 0,
                rank: leaderboard.length + 1
            });
        }
        return { leaderboard };
    } catch (error) {
        console.error('[Leaderboard] Error:', error);
        throw new HttpsError('internal', 'Failed to fetch leaderboard.');
    }
});
