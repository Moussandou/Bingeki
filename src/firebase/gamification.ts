import { doc, getDoc, setDoc, collection, query, where, getAggregateFromServer, count } from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';
import {
    validateGamificationWrite,
    logDataBackup,
    type ClientOwnedGamification,
    type GamificationData
} from '@/utils/dataProtection';
import { clampBonusXp } from '@/shared/gamificationCore';
import type { UserProfile } from './users';
import type { Work } from '@/store/libraryStore';
import { saveLibraryToFirestore, loadLibraryFromFirestore } from './library';

/**
 * Persists the client-owned part of gamification: bonusXp, streak, lastActivityDate.
 *
 * Everything else is derived by the onLibraryUpdate / onGamificationUpdate
 * triggers. Writing derived fields here is not just redundant — the security
 * rules reject it, which used to make this whole function throw on every save.
 */
export async function saveGamificationToFirestore(
    userId: string,
    data: ClientOwnedGamification
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'data', 'gamification');

        const existingDoc = await getDoc(docRef);
        const existing = existingDoc.exists() ? existingDoc.data() as GamificationData : null;

        const payload: ClientOwnedGamification = {
            bonusXp: clampBonusXp(data.bonusXp),
            streak: Math.max(0, Math.floor(Number(data.streak) || 0)),
            lastActivityDate: data.lastActivityDate || null,
        };

        if (!validateGamificationWrite(payload, existing)) {
            logger.warn('[Firestore] Gamification write blocked - invalid client-owned values');
            return;
        }

        if (existing) {
            logDataBackup(userId, 'gamification', existing);
        }

        await setDoc(docRef, {
            ...payload,
            lastUpdated: Date.now()
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

/**
 * Admin XP adjustment.
 *
 * level/xp are derived and would be overwritten by the next trigger run, so the
 * only durable lever is bonusXp: we set it to the amount needed to reach the
 * requested total on top of what the library already grants.
 */
export async function adminSetUserBonusXp(uid: string, bonusXp: number): Promise<void> {
    try {
        const gamificationDocRef = doc(db, 'users', uid, 'data', 'gamification');

        await setDoc(gamificationDocRef, {
            bonusXp: clampBonusXp(bonusXp),
            lastUpdated: Date.now()
        }, { merge: true });

        logger.log(`[Firestore] Admin set bonusXp for ${uid}: ${clampBonusXp(bonusXp)}`);
    } catch (error) {
        logger.error('[Firestore] Error updating user gamification:', error);
        throw error;
    }
}

export async function syncLocalDataToFirestore(
    userId: string,
    library: Work[],
    gamification: ClientOwnedGamification
): Promise<void> {
    const existingLibrary = await loadLibraryFromFirestore(userId);
    const existingGamification = await loadGamificationFromFirestore(userId);

    if (!existingLibrary && library.length > 0) {
        await saveLibraryToFirestore(userId, library);
        logger.log('[Firestore] Uploaded local library to cloud');
    }

    if (!existingGamification && (gamification.bonusXp > 0 || gamification.streak > 0)) {
        await saveGamificationToFirestore(userId, gamification);
        logger.log('[Firestore] Uploaded local gamification to cloud');
    }
}

export type LeaderboardPeriod = 'week' | 'month' | 'all';
export type LeaderboardCategory = 'xp' | 'chapters' | 'streak';

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

        // Competition ranking: everyone on the same score shares a rank. Counting
        // ties used to read every document with that score — at 0 XP, the whole base.
        const higherSnapshot = await getAggregateFromServer(
            query(collection(db, 'users'), where(field, '>', userScore)),
            { count: count() }
        );

        const rank = (higherSnapshot.data().count || 0) + 1;

        return { rank, profile: userProfile };
    } catch (error) {
        logger.error('[Firestore] Error getting user rank:', error);
        return null;
    }
}
