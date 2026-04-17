const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

// --- XP & GAMIFICATION CONSTANTS ---

const LEVEL_BASE = 100;
const LEVEL_MULTIPLIER = 1.15;
const MAX_LEVEL = 100;

const XP_REWARDS = {
    ADD_WORK: 15,
    UPDATE_PROGRESS: 5,
    COMPLETE_WORK: 50,
};

const MAX_EPISODES = 2500;
const MAX_CHAPTERS = 5000;
const MAX_XP_PER_WORK = 15000;

const BADGE_DEFINITIONS = [
    { id: 'first_steps', name: 'Premiers Pas', description: 'Créer un compte Bingeki', icon: 'flag', rarity: 'common' },
    { id: 'first_work', name: 'Bibliophile', description: 'Ajouter votre première œuvre', icon: 'book', rarity: 'common' },
    { id: 'reader_5', name: 'Lecteur Assidu', description: 'Lire 5 chapitres', icon: 'book-open', rarity: 'common' },
    { id: 'reader_25', name: 'Dévoreur', description: 'Lire 25 chapitres', icon: 'flame', rarity: 'rare' },
    { id: 'reader_100', name: 'Binge Reader', description: 'Lire 100 chapitres', icon: 'zap', rarity: 'epic' },
    { id: 'collector_5', name: 'Collectionneur', description: 'Ajouter 5 œuvres', icon: 'library', rarity: 'common' },
    { id: 'collector_10', name: 'Amateur', description: 'Ajouter 10 œuvres', icon: 'layers', rarity: 'rare' },
    { id: 'collector_25', name: 'Otaku', description: 'Ajouter 25 œuvres', icon: 'database', rarity: 'epic' },
    { id: 'streak_3', name: 'Régulier', description: 'Maintenir un streak de 3 jours', icon: 'timer', rarity: 'common' },
    { id: 'streak_7', name: 'Motivé', description: 'Maintenir un streak de 7 jours', icon: 'calendar-check', rarity: 'rare' },
    { id: 'streak_30', name: 'Inarrêtable', description: 'Maintenir un streak de 30 jours', icon: 'crown', rarity: 'legendary' },
    { id: 'first_complete', name: 'Finisher', description: 'Terminer votre première œuvre', icon: 'check-circle', rarity: 'common' },
    { id: 'complete_5', name: 'Complétiste', description: 'Terminer 5 œuvres', icon: 'target', rarity: 'rare' },
    { id: 'level_5', name: 'Novice', description: 'Atteindre le niveau 5', icon: 'star', rarity: 'common' },
    { id: 'level_10', name: 'Apprenti', description: 'Atteindre le niveau 10', icon: 'medal', rarity: 'rare' },
    { id: 'level_25', name: 'Expert', description: 'Atteindre le niveau 25', icon: 'award', rarity: 'epic' },
    { id: 'level_50', name: 'Légende', description: 'Atteindre le niveau 50', icon: 'trophy', rarity: 'legendary' },
];

// --- LOGIC HELPERS ---

function calculateBadges(stats, streak, existingBadges = []) {
    const existingMap = {};
    existingBadges.forEach(b => { existingMap[b.id] = b; });

    const earnedIds = new Set();
    if (stats.totalWorksAdded >= 1) earnedIds.add('first_work');
    if (stats.totalWorksAdded >= 5) earnedIds.add('collector_5');
    if (stats.totalWorksAdded >= 10) earnedIds.add('collector_10');
    if (stats.totalWorksAdded >= 25) earnedIds.add('collector_25');

    if (stats.totalChaptersRead >= 5) earnedIds.add('reader_5');
    if (stats.totalChaptersRead >= 25) earnedIds.add('reader_25');
    if (stats.totalChaptersRead >= 100) earnedIds.add('reader_100');

    if (streak >= 3) earnedIds.add('streak_3');
    if (streak >= 7) earnedIds.add('streak_7');
    if (streak >= 30) earnedIds.add('streak_30');

    if (stats.totalWorksCompleted >= 1) earnedIds.add('first_complete');
    if (stats.totalWorksCompleted >= 5) earnedIds.add('complete_5');

    if (stats.level >= 5) earnedIds.add('level_5');
    if (stats.level >= 10) earnedIds.add('level_10');
    if (stats.level >= 25) earnedIds.add('level_25');
    if (stats.level >= 50) earnedIds.add('level_50');

    earnedIds.add('first_steps');

    const badges = [];
    for (const id of earnedIds) {
        if (existingMap[id]) {
            badges.push(existingMap[id]);
        } else {
            const def = BADGE_DEFINITIONS.find(d => d.id === id);
            if (def) {
                badges.push({ ...def, unlockedAt: Date.now() });
            }
        }
    }
    return badges;
}

function calculateUserStats(libraryWorks, bonusXp = 0) {
    let totalChaptersRead = 0;
    let totalAnimeEpisodesWatched = 0;
    let totalMoviesWatched = 0;
    const totalWorksAdded = libraryWorks.length;
    let totalWorksCompleted = 0;
    let totalXpFromLibrary = 0;

    libraryWorks.forEach(w => {
        const progress = w.currentChapter || w.currentEpisode || 0;
        const total = w.totalChapters || w.totalEpisodes || 0;
        const type = (w.type || 'manga').toLowerCase();

        totalXpFromLibrary += XP_REWARDS.ADD_WORK;

        let effectiveProgress = 0;
        if (total && total > 0) {
            effectiveProgress = Math.min(progress, total);
        }

        if (type === 'anime' || type === 'manga') {
            const cap = type === 'anime' ? MAX_EPISODES : MAX_CHAPTERS;
            effectiveProgress = Math.min(effectiveProgress, cap);

            if (type === 'anime') {
                if (w.format === 'Movie') {
                    totalMoviesWatched += (w.status === 'completed' ? 1 : 0);
                    totalXpFromLibrary += (w.status === 'completed' ? XP_REWARDS.UPDATE_PROGRESS : 0);
                } else {
                    totalAnimeEpisodesWatched += effectiveProgress;
                    totalXpFromLibrary += Math.min(effectiveProgress * XP_REWARDS.UPDATE_PROGRESS, MAX_XP_PER_WORK);
                }
            } else {
                totalChaptersRead += effectiveProgress;
                totalXpFromLibrary += Math.min(effectiveProgress * XP_REWARDS.UPDATE_PROGRESS, MAX_XP_PER_WORK);
            }
        } else {
            totalChaptersRead += effectiveProgress;
            totalXpFromLibrary += Math.min(effectiveProgress * XP_REWARDS.UPDATE_PROGRESS, MAX_XP_PER_WORK);
        }

        if (w.status === 'completed') {
            totalWorksCompleted += 1;
            totalXpFromLibrary += XP_REWARDS.COMPLETE_WORK;
        }
    });

    const totalXp = totalXpFromLibrary + bonusXp;

    let level = 1;
    let remainingXp = totalXp;
    let xpToNext = LEVEL_BASE;

    while (remainingXp >= xpToNext && level < MAX_LEVEL) {
        remainingXp -= xpToNext;
        level++;
        xpToNext = Math.floor(xpToNext * LEVEL_MULTIPLIER);
    }

    return {
        level,
        xp: remainingXp,
        totalXp,
        xpToNextLevel: xpToNext,
        totalChaptersRead,
        totalAnimeEpisodesWatched,
        totalMoviesWatched,
        totalWorksAdded,
        totalWorksCompleted
    };
}

// --- CLOUD FUNCTIONS ---

exports.onLibraryUpdate = onDocumentWritten('users/{userId}/data/library', async (event) => {
    const userId = event.params.userId;
    const change = event.data;
    if (!change) return null;
    const libraryData = change.after.exists ? change.after.data() : { works: [] };
    const works = libraryData.works || [];
    const prevLibraryData = change.before.exists ? change.before.data() : { works: [] };
    const prevWorks = prevLibraryData.works || [];

    try {
        const gamificationSnap = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('data')
            .doc('gamification')
            .get();

        const gamData = gamificationSnap.exists ? gamificationSnap.data() : {};
        const bonusXp = gamData.bonusXp || 0;
        const streak = gamData.streak || 0;
        const lastActivityDate = gamData.lastActivityDate || null;
        const existingBadges = gamData.badges || [];

        const stats = calculateUserStats(works, bonusXp);
        const badges = calculateBadges(stats, streak, existingBadges);

        await admin.firestore().collection('users').doc(userId).set({
            ...stats,
            badges,
            streak,
            lastActivityDate,
            bonusXp,
            lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });

        await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('data')
            .doc('gamification')
            .set({
                ...stats,
                badges,
                streak,
                lastActivityDate,
                bonusXp,
                lastUpdated: Date.now()
            }, { merge: true });

        // ACTIVITY LOGGING
        try {
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const userName = userData.displayName || 'Héros';
            const userPhoto = userData.photoURL || '';
            const isVisible = userData.showActivityStatus !== false;
            const profileVisibility = userData.profileVisibility || 'public';

            const prevWorkMap = {};
            prevWorks.forEach(w => { prevWorkMap[w.id] = w; });

            const activitiesToLog = [];
            for (const work of works) {
                const prev = prevWorkMap[work.id];
                if (!prev) {
                    activitiesToLog.push({
                        userId, userName, userPhoto, type: 'add_work',
                        workId: work.id, workTitle: work.title, workImage: work.image || '',
                        workType: (work.type || 'manga').toLowerCase(),
                        isVisible, profileVisibility, timestamp: Date.now()
                    });
                } else if (work.status === 'completed' && prev.status !== 'completed') {
                    activitiesToLog.push({
                        userId, userName, userPhoto, type: 'complete',
                        workId: work.id, workTitle: work.title, workImage: work.image || '',
                        workType: (work.type || 'manga').toLowerCase(),
                        isVisible, profileVisibility, timestamp: Date.now()
                    });
                } else if ((work.currentChapter || 0) > (prev.currentChapter || 0)) {
                    const diff = (work.currentChapter || 0) - (prev.currentChapter || 0);
                    if (diff >= 5) {
                        const workType = (work.type || 'manga').toLowerCase();
                        activitiesToLog.push({
                            userId, userName, userPhoto,
                            type: workType === 'anime' ? 'watch' : 'read',
                            workId: work.id, workTitle: work.title, workImage: work.image || '',
                            workType: workType, isVisible, profileVisibility,
                            episodeNumber: work.currentChapter || 0, timestamp: Date.now()
                        });
                    }
                }
            }

            const batch = admin.firestore().batch();
            const limitedActivities = activitiesToLog.slice(0, 5);
            for (const activity of limitedActivities) {
                const actRef = admin.firestore().collection('activities').doc();
                batch.set(actRef, { ...activity, id: actRef.id });
            }
            if (limitedActivities.length > 0) {
                await batch.commit();
            }
        } catch (actError) {
            console.error(`[Activity] Error logging activities for ${userId}:`, actError);
        }

        console.log(`[Gamification] Recalculated stats + badges for user ${userId}`);
        return null;
    } catch (error) {
        console.error(`[Gamification] Error updating user ${userId}:`, error);
        return null;
    }
});

exports.recalculateAllUserStats = onCall({
    timeoutSeconds: 540,
    memory: '1GiB',
    cors: true
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in.');

    const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || !callerDoc.data().isAdmin) {
        throw new HttpsError('permission-denied', 'Admin access required.');
    }

    const usersSnap = await admin.firestore().collection('users').get();
    const results = { total: usersSnap.size, updated: 0, errors: 0 };
    const batch = admin.firestore().batch();
    let batchCount = 0;

    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        try {
            const librarySnap = await admin.firestore()
                .collection('users').doc(userId).collection('data').doc('library').get();
            const works = librarySnap.exists ? (librarySnap.data().works || []) : [];

            const gamificationSnap = await admin.firestore()
                .collection('users').doc(userId).collection('data').doc('gamification').get();
            const gamData = gamificationSnap.exists ? gamificationSnap.data() : {};
            const bonusXp = gamData.bonusXp || 0;
            const streak = gamData.streak || 0;
            const existingBadges = gamData.badges || [];

            const stats = calculateUserStats(works, bonusXp);
            const badges = calculateBadges(stats, streak, existingBadges);

            batch.set(admin.firestore().collection('users').doc(userId), {
                ...stats, badges, lastUpdated: FieldValue.serverTimestamp()
            }, { merge: true });

            batch.set(admin.firestore().collection('users').doc(userId).collection('data').doc('gamification'), {
                ...stats, badges, lastUpdated: Date.now()
            }, { merge: true });

            results.updated++;
            batchCount++;
            if (batchCount >= 200) {
                await batch.commit();
                batchCount = 0;
            }
        } catch (e) {
            console.error(`Error processing user ${userId}:`, e);
            results.errors++;
        }
    }
    if (batchCount > 0) await batch.commit();
    return results;
});

exports.getLeaderboard = onCall({ cors: true }, async (request) => {
    const data = request.data || {};
    const category = data.category || 'xp';
    const limitCount = Math.min(data.limit || 20, 100);

    const fieldMap = {
        'xp': 'totalXp',
        'chapters': 'totalChaptersRead',
        'episodes': 'totalAnimeEpisodesWatched',
        'streak': 'streak'
    };
    const field = fieldMap[category] || 'totalXp';

    try {
        const usersSnap = await admin.firestore()
            .collection('users').orderBy(field, 'desc').limit(limitCount).get();

        const leaderboard = [];
        let rank = 1;
        for (const userDoc of usersSnap.docs) {
            const d = userDoc.data();
            leaderboard.push({
                uid: userDoc.id, displayName: d.displayName || null, username: d.username || null,
                photoURL: d.photoURL || null, level: d.level || 1, totalXp: d.totalXp || 0,
                totalChaptersRead: d.totalChaptersRead || 0, totalAnimeEpisodesWatched: d.totalAnimeEpisodesWatched || 0,
                totalWorksCompleted: d.totalWorksCompleted || 0, streak: d.streak || 0, rank
            });
            rank++;
        }
        return { leaderboard };
    } catch (error) {
        console.error('[Leaderboard] Error:', error);
        throw new HttpsError('internal', 'Failed to fetch leaderboard.');
    }
});
