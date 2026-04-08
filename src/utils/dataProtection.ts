import { logger } from '@/utils/logger';
import type { Work } from '@/store/libraryStore';
import type { Badge } from '@/types/badge';

// Interfaces matching Firestore data structures
export interface GamificationData {
    level: number;
    xp: number;
    totalXp: number; // Added
    xpToNextLevel: number;
    streak: number;
    lastActivityDate: string | null;
    bonusXp: number;
    badges: Badge[];
    totalChaptersRead: number;
    totalAnimeEpisodesWatched: number;
    totalMoviesWatched: number;
    totalWorksAdded: number;
    totalWorksCompleted: number;
    lastUpdated?: number;
    version?: number;
}

export interface LibraryData {
    works: Work[];
    lastUpdated?: number;
    version?: number;
}

/**
 * Safely merges gamification data, ensuring cumulative stats never decrease
 * @param local - Local Zustand state
 * @param cloud - Cloud Firestore data (can be null)
 * @returns Merged data with highest values
 */
export function mergeGamificationData(
    local: Partial<GamificationData>,
    cloud: Partial<GamificationData> | null
): GamificationData {
    // If no cloud data, use local
    if (!cloud) {
        return {
            level: local.level || 1,
            xp: local.xp || 0,
            totalXp: local.totalXp || 0,
            xpToNextLevel: local.xpToNextLevel || 100,
            streak: local.streak || 0,
            lastActivityDate: local.lastActivityDate || null,
            bonusXp: local.bonusXp || 0,
            badges: local.badges || [],
            totalChaptersRead: local.totalChaptersRead || 0,
            totalAnimeEpisodesWatched: local.totalAnimeEpisodesWatched || 0,
            totalMoviesWatched: local.totalMoviesWatched || 0,
            totalWorksAdded: local.totalWorksAdded || 0,
            totalWorksCompleted: local.totalWorksCompleted || 0,
            lastUpdated: Date.now(),
            version: (local.version || 0) + 1
        };
    }

    // If no local data, use cloud
    if (!local || Object.keys(local).length === 0) {
        return {
            ...cloud,
            lastUpdated: cloud.lastUpdated || Date.now(),
            version: cloud.version || 1
        } as GamificationData;
    }

    // Both exist - smart merge
    // For cumulative stats, always take the HIGHER value
    const MAX_LEVEL = 100;
    
    // Determine which source is "ahead" based on totalXp
    const localTotalXp = local.totalXp || 0;
    const cloudTotalXp = cloud.totalXp || 0;
    const isLocalAhead = localTotalXp >= cloudTotalXp;

    const mergedTotalXp = Math.max(localTotalXp, cloudTotalXp);
    const mergedLevel = Math.min(MAX_LEVEL, isLocalAhead ? (local.level || 1) : (cloud.level || 1));
    const mergedXp = isLocalAhead ? (local.xp || 0) : (cloud.xp || 0);

    const mergedTotalChapters = Math.max(local.totalChaptersRead || 0, cloud.totalChaptersRead || 0);
    const mergedTotalEpisodes = Math.max(local.totalAnimeEpisodesWatched || 0, cloud.totalAnimeEpisodesWatched || 0);
    const mergedTotalMovies = Math.max(local.totalMoviesWatched || 0, cloud.totalMoviesWatched || 0);
    const mergedTotalWorks = Math.max(local.totalWorksAdded || 0, cloud.totalWorksAdded || 0);
    const mergedTotalCompleted = Math.max(local.totalWorksCompleted || 0, cloud.totalWorksCompleted || 0);

    // For streak and lastActivityDate, use the most recent data (compare actual dates, not just timestamps)
    const localLastActivityTime = local.lastActivityDate ? new Date(local.lastActivityDate).getTime() : 0;
    const cloudLastActivityTime = cloud.lastActivityDate ? new Date(cloud.lastActivityDate).getTime() : 0;
    const useLocalStreak = localLastActivityTime >= cloudLastActivityTime;
    const mergedStreak = useLocalStreak ? (local.streak || 0) : (cloud.streak || 0);
    const mergedLastActivity = useLocalStreak ? local.lastActivityDate : cloud.lastActivityDate;

    // bonusXp: always take the higher value (never lose daily login XP)
    const mergedBonusXp = Math.max(local.bonusXp || 0, cloud.bonusXp || 0);

    // Merge badges - union of both sets
    const localBadges = local.badges || [];
    const cloudBadges = cloud.badges || [];
    const badgeMap = new Map<string, Badge>();

    [...cloudBadges, ...localBadges].forEach(badge => {
        const existing = badgeMap.get(badge.id);
        // Keep the earliest unlock time
        if (!existing || (badge.unlockedAt && (!existing.unlockedAt || badge.unlockedAt < existing.unlockedAt))) {
            badgeMap.set(badge.id, badge);
        }
    });
    const mergedBadges = Array.from(badgeMap.values());

    // Calculate xpToNextLevel based on merged level
    const LEVEL_BASE = 100;
    const LEVEL_MULTIPLIER = 1.15;
    let xpToNext = LEVEL_BASE;
    for (let i = 1; i < mergedLevel; i++) {
        xpToNext = Math.floor(xpToNext * LEVEL_MULTIPLIER);
    }

    logger.log('[DataProtection] Merged gamification:', {
        localLevel: local.level,
        cloudLevel: cloud.level,
        mergedLevel,
        localXp: local.xp,
        cloudXp: cloud.xp,
        mergedXp
    });

    return {
        level: mergedLevel,
        xp: mergedXp,
        totalXp: mergedTotalXp,
        xpToNextLevel: xpToNext,
        streak: mergedStreak,
        lastActivityDate: mergedLastActivity || null,
        bonusXp: mergedBonusXp,
        badges: mergedBadges,
        totalChaptersRead: mergedTotalChapters,
        totalAnimeEpisodesWatched: mergedTotalEpisodes,
        totalMoviesWatched: mergedTotalMovies,
        totalWorksAdded: mergedTotalWorks,
        totalWorksCompleted: mergedTotalCompleted,
        lastUpdated: Date.now(),
        version: Math.max(local.version || 0, cloud.version || 0) + 1
    };
}

/**
 * Safely merges library data, combining works from both sources
 * @param local - Local Zustand works array
 * @param cloud - Cloud Firestore works array (can be null)
 * @returns Merged works array with no duplicates
 */
export function mergeLibraryData(
    local: Work[] | undefined,
    cloud: Work[] | null
): Work[] {
    if (!cloud || cloud.length === 0) {
        return local || [];
    }

    if (!local || local.length === 0) {
        return cloud;
    }

    // Merge works by ID - keep the most recently updated version
    const workMap = new Map<number | string, Work>();

    // Add cloud works first
    cloud.forEach(work => {
        workMap.set(work.id, work);
    });

    // Add/update with local works (prefer local if more recent)
    local.forEach(work => {
        const existing = workMap.get(work.id);
        if (!existing) {
            workMap.set(work.id, work);
        } else {
            // Keep the more recently updated version
            const localTime = work.lastUpdated || 0;
            const cloudTime = existing.lastUpdated || 0;
            if (localTime >= cloudTime) {
                workMap.set(work.id, work);
            }
        }
    });

    const merged = Array.from(workMap.values());
    logger.log('[DataProtection] Merged library:', {
        localCount: local.length,
        cloudCount: cloud.length,
        mergedCount: merged.length
    });

    return merged;
}

/**
 * Validates that new gamification data is safe to write
 * Prevents accidental downgrades of cumulative stats
 */
export function validateGamificationWrite(
    newData: Partial<GamificationData>,
    existing: Partial<GamificationData> | null
): boolean {
    if (!existing) return true; // No existing data, safe to write

    // 1. Check cumulative stats don't decrease
    const checks = [
        { name: 'level', newVal: newData.level, oldVal: existing.level },
        { name: 'totalXp', newVal: newData.totalXp, oldVal: existing.totalXp },
        { name: 'totalChaptersRead', newVal: newData.totalChaptersRead, oldVal: existing.totalChaptersRead },
        { name: 'totalAnimeEpisodesWatched', newVal: newData.totalAnimeEpisodesWatched, oldVal: existing.totalAnimeEpisodesWatched },
        { name: 'totalMoviesWatched', newVal: newData.totalMoviesWatched, oldVal: existing.totalMoviesWatched },
        { name: 'totalWorksAdded', newVal: newData.totalWorksAdded, oldVal: existing.totalWorksAdded },
        { name: 'totalWorksCompleted', newVal: newData.totalWorksCompleted, oldVal: existing.totalWorksCompleted }
    ];

    for (const check of checks) {
        if (check.newVal !== undefined && check.oldVal !== undefined) {
            if (check.newVal < check.oldVal) {
                logger.warn(`[DataProtection] Validation failed: ${check.name} would decrease from ${check.oldVal} to ${check.newVal}`);
                return false;
            }
        }
    }

    // 2. SECURITY CHECK: Prevent massive jumps (Anti-Cheat)
    // Relaxed for legitimate syncs/backlogs
    if (newData.level && existing.level) {
        // Max 10 level increase per save
        if (newData.level > existing.level + 10) {
            logger.warn(`[DataProtection] SECURITY: Prevented suspicious level jump (${existing.level} -> ${newData.level})`);
            return false;
        }
    }

    if (newData.totalXp !== undefined && existing.totalXp !== undefined) {
        // Max 25000 totalXp increase per save (anti-cheat on cumulative XP)
        if (newData.totalXp > existing.totalXp + 25000) {
            logger.warn(`[DataProtection] SECURITY: Prevented suspicious totalXp jump (+${newData.totalXp - existing.totalXp})`);
            return false;
        }
    }

    return true;
}

/**
 * Creates a simple backup log in console
 * In production, this could write to a separate Firestore collection
 */
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

    // Store in sessionStorage as emergency recovery
    try {
        const key = `bingeki_backup_${dataType}_${userId}`;
        sessionStorage.setItem(key, JSON.stringify(backup));
    } catch (e) {
        logger.warn('[DataProtection] Could not store backup in sessionStorage:', e);
    }
}
