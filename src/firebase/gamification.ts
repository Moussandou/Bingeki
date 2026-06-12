import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, updateDoc, getAggregateFromServer, count } from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';
import {
    mergeGamificationData,
    validateGamificationWrite,
    logDataBackup,
    type GamificationData
} from '@/utils/dataProtection';
import type { UserProfile } from './users';
import type { Work } from '@/store/libraryStore';
import { saveLibraryToFirestore, loadLibraryFromFirestore } from './library';

export async function saveGamificationToFirestore(
    userId: string,
    data: Omit<GamificationData, 'lastUpdated'>
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'gamification');

        const existingDoc = await getDoc(docRef);
        const existing = existingDoc.exists() ? existingDoc.data() as GamificationData : null;

        if (!validateGamificationWrite(data, existing)) {
            logger.warn('[Firestore] Gamification write blocked - would cause data downgrade');
            const safeData = mergeGamificationData(data, existing);
            data = safeData;
        }

        if (existing) {
            logDataBackup(userId, 'gamification', existing);
        }

        const mergedData = mergeGamificationData(data, existing);

        await setDoc(docRef, {
            ...mergedData,
            lastUpdated: Date.now()
        });

        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, {
            xp: mergedData.xp,
            level: mergedData.level,
            totalXp: mergedData.totalXp,
            streak: mergedData.streak,
            lastActivityDate: mergedData.lastActivityDate || null,
            bonusXp: mergedData.bonusXp || 0,
            badges: mergedData.badges,
            totalChaptersRead: mergedData.totalChaptersRead,
            totalAnimeEpisodesWatched: mergedData.totalAnimeEpisodesWatched || 0,
            totalMoviesWatched: mergedData.totalMoviesWatched || 0,
            totalWorksAdded: mergedData.totalWorksAdded,
            totalWorksCompleted: mergedData.totalWorksCompleted
        }, { merge: true });

        logger.log('[Firestore] Gamification saved safely');
    } catch (error) {
        logger.error('[Firestore] Error saving gamification:', error);
        if ((error as { code?: string }).code === 'permission-denied') {
            logger.error('[Firestore] PERMISSION DENIED: Check your Firestore Security Rules in Firebase Console.');
        }
        throw error;
    }
}

export async function loadGamificationFromFirestore(userId: string): Promise<Omit<GamificationData, 'lastUpdated'> | null> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'gamification');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const { lastUpdated: _lastUpdated, ...data } = docSnap.data() as GamificationData;
            logger.log('[Firestore] Gamification loaded');
            return data;
        }
        return null;
    } catch (error) {
        logger.error('[Firestore] Error loading gamification:', error);
        return null;
    }
}

export async function adminUpdateUserGamification(uid: string, level: number, xp: number): Promise<void> {
    try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, {
            level,
            xp
        });

        const gamificationDocRef = doc(db, 'users', uid, 'data', 'gamification');

        await setDoc(gamificationDocRef, {
            level,
            xp,
            lastUpdated: Date.now()
        }, { merge: true });

        logger.log(`[Firestore] Admin updated gamification for ${uid}: Level ${level}, XP ${xp}`);
    } catch (error) {
        logger.error('[Firestore] Error updating user gamification:', error);
        throw error;
    }
}

export async function syncLocalDataToFirestore(
    userId: string,
    library: Work[],
    gamification: Omit<GamificationData, 'lastUpdated'>
): Promise<void> {
    const existingLibrary = await loadLibraryFromFirestore(userId);
    const existingGamification = await loadGamificationFromFirestore(userId);

    if (!existingLibrary && library.length > 0) {
        await saveLibraryToFirestore(userId, library);
        logger.log('[Firestore] Uploaded local library to cloud');
    }

    if (!existingGamification && (gamification.level > 1 || gamification.totalWorksAdded > 0)) {
        await saveGamificationToFirestore(userId, gamification);
        logger.log('[Firestore] Uploaded local gamification to cloud');
    }
}

export type LeaderboardPeriod = 'week' | 'month' | 'all';
export type LeaderboardCategory = 'xp' | 'chapters' | 'streak';

export const getLeaderboard = async (limitCount = 10, _period?: 'week' | 'month' | 'all-time'): Promise<UserProfile[]> => {
    try {
        const q = query(
            collection(db, 'users'),
            orderBy('totalXp', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        return users;
    } catch (error) {
        logger.error('[Firestore] Error loading leaderboard:', error);
        return [];
    }
}

export async function getFilteredLeaderboard(
    category: LeaderboardCategory = 'xp',
    _period?: LeaderboardPeriod,
    limitCount: number = 10
): Promise<UserProfile[]> {
    try {
        const fieldMap: Record<LeaderboardCategory, string> = {
            'xp': 'totalXp',
            'chapters': 'totalChaptersRead',
            'streak': 'streak'
        };

        const field = fieldMap[category];

        const q = query(
            collection(db, 'users'),
            orderBy(field, 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        return users;
    } catch (error) {
        logger.error('[Firestore] Error loading filtered leaderboard:', error);
        return [];
    }
}

export async function getUserRank(
    userId: string,
    category: LeaderboardCategory = 'xp'
): Promise<{ rank: number; profile: UserProfile } | null> {
    try {
        const fieldMap: Record<LeaderboardCategory, string> = {
            'xp': 'totalXp',
            'chapters': 'totalChaptersRead',
            'streak': 'streak'
        };
        const field = fieldMap[category];

        const userDocSnap = await getDoc(doc(db, 'users', userId));
        if (!userDocSnap.exists()) return null;
        const userProfile = { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
        const userScore = (userProfile[field as keyof UserProfile] as number) || 0;

        const qHigher = query(collection(db, 'users'), where(field, '>', userScore));
        const qEqual = query(collection(db, 'users'), where(field, '==', userScore));

        const [higherSnapshot, equalSnapshot] = await Promise.all([
            getAggregateFromServer(qHigher, { count: count() }),
            getDocs(qEqual)
        ]);

        const higherCount = higherSnapshot.data().count || 0;
        let tiesBefore = 0;
        equalSnapshot.forEach((docSnap) => {
            if (docSnap.id < userId) tiesBefore++;
        });

        const rank = higherCount + tiesBefore + 1;

        return { rank, profile: userProfile };
    } catch (error) {
        logger.error('[Firestore] Error getting user rank:', error);
        return null;
    }
}
