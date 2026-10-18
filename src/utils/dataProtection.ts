/**
 * Safe merge strategies for library and gamification data
 * Prevents data loss during local/cloud conflict resolution
 */
import { logger } from '@/utils/logger';
import { workKey } from '@/utils/workIdentity';
import type { Tombstone, Work } from '@/store/libraryStore';
import type { Badge } from '@/types/badge';
import {
    MAX_BONUS_XP,
    MAX_LEVEL,
    clampBonusXp,
    levelFromTotalXp,
} from '@/shared/gamificationCore';


export interface GamificationData {
    level: number;
    xp: number;
    totalXp: number;
    xpToNextLevel: number;
    streak: number;
    lastActivityDate: string | null;
    bonusXp: number;
    communityXp?: number;
    badges: Badge[];
    totalChaptersRead: number;
    totalAnimeEpisodesWatched: number;
    totalMoviesWatched: number;
    totalWorksAdded: number;
    totalWorksCompleted: number;
    lastUpdated?: number;
    version?: number;
}

/** The only gamification fields a client is allowed to write. */
export interface ClientOwnedGamification {
    bonusXp: number;
    streak: number;
    lastActivityDate: string | null;
}

export const CLIENT_OWNED_GAMIFICATION_KEYS = [
    'bonusXp',
    'streak',
    'lastActivityDate',
] as const;

export interface LibraryData {
    works: Work[];
    lastUpdated?: number;
    version?: number;
}

/**
 * Login-time merge.
 *
 * Derived stats (level/xp/totalXp/counters/badges) belong to the server, so the
 * cloud copy wins. Only bonusXp, streak and lastActivityDate are client-owned,
 * and those are reconciled across devices. The caller recalculates from the
 * merged library right after, which corrects anything the server has not seen yet.
 */
export function mergeGamificationData(
    local: Partial<GamificationData>,
    cloud: Partial<GamificationData> | null
): GamificationData {
    const hasCloud = !!cloud && Object.keys(cloud).length > 0;
    const hasLocal = !!local && Object.keys(local).length > 0;
    const authoritative = (hasCloud ? cloud : local) || {};

    // Client-owned: highest bonus, and the streak attached to the latest activity.
    const bonusXp = clampBonusXp(
        Math.max(local?.bonusXp || 0, cloud?.bonusXp || 0)
    );

    const localActivityTime = local?.lastActivityDate ? new Date(local.lastActivityDate).getTime() : 0;
    const cloudActivityTime = cloud?.lastActivityDate ? new Date(cloud.lastActivityDate).getTime() : 0;
    const useLocalStreak = hasLocal && localActivityTime >= cloudActivityTime;
    const streak = useLocalStreak ? (local?.streak || 0) : (cloud?.streak || 0);
    const lastActivityDate = (useLocalStreak ? local?.lastActivityDate : cloud?.lastActivityDate) || null;

    // Badges: union of both sets, keeping the earliest unlock date.
    const badgeMap = new Map<string, Badge>();
    [...(cloud?.badges || []), ...(local?.badges || [])].forEach(badge => {
        if (!badge || !badge.id) return;
        const existing = badgeMap.get(badge.id);
        if (!existing || (badge.unlockedAt && (!existing.unlockedAt || badge.unlockedAt < existing.unlockedAt))) {
            badgeMap.set(badge.id, badge);
        }
    });

    const totalXp = Math.max(0, authoritative.totalXp || 0);
    const derived = levelFromTotalXp(totalXp);

    logger.log('[DataProtection] Merged gamification:', {
        source: hasCloud ? 'cloud' : 'local',
        totalXp,
        level: derived.level,
        bonusXp,
        communityXp: clampBonusXp(authoritative.communityXp),
    });

    return {
        level: Math.min(MAX_LEVEL, derived.level),
        xp: derived.xp,
        totalXp,
        xpToNextLevel: derived.xpToNextLevel,
        streak,
        lastActivityDate,
        bonusXp,
        badges: Array.from(badgeMap.values()),
        totalChaptersRead: authoritative.totalChaptersRead || 0,
        totalAnimeEpisodesWatched: authoritative.totalAnimeEpisodesWatched || 0,
        totalMoviesWatched: authoritative.totalMoviesWatched || 0,
        totalWorksAdded: authoritative.totalWorksAdded || 0,
        totalWorksCompleted: authoritative.totalWorksCompleted || 0,
        lastUpdated: Date.now(),
        version: Math.max(local?.version || 0, cloud?.version || 0) + 1
    };
}

/**
 * Merges library works - local order preserved, cloud additions appended.
 *
 * `tombstones` carries deletions made on this device. Without them a deleted
 * work reappears from the cloud copy on the very next save.
 */
export function mergeLibraryData(
    local: Work[] | undefined,
    cloud: Work[] | null,
    tombstones: Tombstone[] = []
): Work[] {
    const deletions = new Map(mergeTombstones(tombstones).map(t => [
        t.type ? workKey({ type: t.type, id: t.id }) : `legacy:${t.id}`, t.deletedAt,
    ]));
    const workMap = new Map<string, Work>();
    for (const work of [...(cloud || []), ...(local || [])]) {
        const key = workKey(work);
        const deletedAt = Math.max(deletions.get(key) ?? -1, deletions.get(`legacy:${work.id}`) ?? -1);
        if ((work.lastUpdated || 0) <= deletedAt) continue;
        const existing = workMap.get(key);
        if (!existing || (work.lastUpdated || 0) >= (existing.lastUpdated || 0)) workMap.set(key, work);
    }
    const ordered = new Map<string, Work>();
    for (const work of [...(local || []), ...(cloud || [])]) {
        const key = workKey(work);
        const latest = workMap.get(key);
        if (latest && !ordered.has(key)) ordered.set(key, latest);
    }
    return [...ordered.values()];
}

/** Keep deletion history indefinitely: an offline device can return after any TTL. */
export function mergeTombstones(...sources: (Tombstone[] | undefined)[]): Tombstone[] {
    const merged = new Map<string, Tombstone>();
    for (const tombstone of sources.flatMap(source => source || [])) {
        const key = tombstone.type
            ? workKey({ type: tombstone.type, id: tombstone.id })
            : `legacy:${tombstone.id}`;
        if ((merged.get(key)?.deletedAt ?? -1) < tombstone.deletedAt) merged.set(key, tombstone);
    }
    return [...merged.values()];
}

/** Bonus XP earned in a single save; a day's login plus streak bonus is far below this. */
export const MAX_BONUS_XP_JUMP = 1000;

/**
 * Validates the client-owned part of a gamification write.
 *
 * Derived stats are no longer checked here: the server owns them and MUST be
 * able to correct them downwards. Guarding them was what froze inflated totals
 * in place. Only bonusXp and streak come from the client, so only they are checked.
 */
export function validateGamificationWrite(
    newData: Partial<ClientOwnedGamification>,
    existing: Partial<GamificationData> | null
): boolean {
    if (newData.bonusXp !== undefined) {
        if (!Number.isFinite(newData.bonusXp) || newData.bonusXp < 0) {
            logger.warn('[DataProtection] Validation failed: bonusXp is not a positive number');
            return false;
        }
        if (newData.bonusXp > MAX_BONUS_XP) {
            logger.warn(`[DataProtection] Validation failed: bonusXp above cap (${newData.bonusXp})`);
            return false;
        }
    }

    if (newData.streak !== undefined && (!Number.isFinite(newData.streak) || newData.streak < 0)) {
        logger.warn('[DataProtection] Validation failed: streak is not a positive number');
        return false;
    }

    if (!existing) return true;

    // An exact reset to 0 is the "erase my data" path, not a downgrade.
    if (newData.bonusXp === 0) return true;

    if (newData.bonusXp !== undefined && existing.bonusXp !== undefined) {
        if (newData.bonusXp < existing.bonusXp) {
            logger.warn(`[DataProtection] Validation failed: bonusXp would decrease from ${existing.bonusXp} to ${newData.bonusXp}`);
            return false;
        }
        if (newData.bonusXp > existing.bonusXp + MAX_BONUS_XP_JUMP) {
            logger.warn(`[DataProtection] SECURITY: Prevented suspicious bonusXp jump (+${newData.bonusXp - existing.bonusXp})`);
            return false;
        }
    }

    return true;
}

// Stores emergency backup in sessionStorage
export function logDataBackup(
    userId: string,
    dataType: 'gamification' | 'library',
    data: unknown
): void {
    const backup = {
        userId,
        dataType,
        timestamp: Date.now(),
        data: JSON.stringify(data)
    };

    logger.log('[DataProtection] Backup created:', {
        type: dataType,
        timestamp: new Date(backup.timestamp).toISOString()
    });


    try {
        const key = `bingeki_backup_${dataType}_${userId}`;
        sessionStorage.setItem(key, JSON.stringify(backup));
    } catch (e) {
        logger.warn('[DataProtection] Could not store backup in sessionStorage:', e);
    }
}
