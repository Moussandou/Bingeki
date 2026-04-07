import { logger } from '@/utils/logger';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Badge, MOCK_BADGES } from '@/types/badge';
import { type Work } from './libraryStore';

interface GamificationState {
    level: number;
    xp: number;
    totalXp: number; // Cumulative XP across all levels
    xpToNextLevel: number;
    bonusXp: number; // Tracks non-library XP (e.g. daily logins)
    streak: number;
    lastActivityDate: string | null;
    badges: Badge[];
    recentUnlock: Badge | null;
    lastLevel: number;
    xpGained: { amount: number; timestamp: number } | null;
    levelUpData: { newLevel: number; timestamp: number } | null;

    // Stats for badge tracking
    totalChaptersRead: number;
    totalAnimeEpisodesWatched: number;
    totalMoviesWatched: number;
    totalWorksAdded: number;
    totalWorksCompleted: number;

    addXp: (amount: number, isBonus?: boolean) => void;
    recordActivity: () => void;
    unlockBadge: (badgeId: string) => void;
    clearRecentUnlock: () => void;
    incrementStat: (stat: 'chapters' | 'episodes' | 'movies' | 'works' | 'completed') => void;
    checkBadges: () => void;
    resetStore: () => void;
    recalculateStats: (works: Work[]) => void;
    clearLevelUpData: () => void;
    clearXpGained: () => void;
    syncFromProfile: (profile: any) => void;
}

const LEVEL_BASE = 100;
const LEVEL_MULTIPLIER = 1.15;
const MAX_LEVEL = 100;

// XP Rewards — must match functions/index.js XP_REWARDS exactly
export const XP_REWARDS = {
    ADD_WORK: 15,
    UPDATE_PROGRESS: 5,
    COMPLETE_WORK: 50,
    DAILY_LOGIN: 25,
};

export const useGamificationStore = create<GamificationState>()(
    persist(
        (set, get) => ({
            level: 1,
            xp: 0,
            totalXp: 0,
            xpToNextLevel: LEVEL_BASE,
            bonusXp: 0,
            streak: 0,
            lastActivityDate: null,
            badges: [],
            recentUnlock: null,
            lastLevel: 1,
            xpGained: null,
            levelUpData: null,
            totalChaptersRead: 0,
            totalAnimeEpisodesWatched: 0,
            totalMoviesWatched: 0,
            totalWorksAdded: 0,
            totalWorksCompleted: 0,

            addXp: (amount, isBonus = false) => {
                const { xp, xpToNextLevel, level, bonusXp } = get();

                if (isBonus) {
                    set({ bonusXp: bonusXp + amount });
                }

                // If already at max level, we can still add XP for fun, but no leveling up
                let newXp = Math.max(0, xp + amount);
                let newLevel = level;
                let newXpToNext = xpToNextLevel;

                // Level up logic
                while (newXp >= newXpToNext && newLevel < MAX_LEVEL) {
                    newXp -= newXpToNext;
                    newLevel++;
                    newXpToNext = Math.floor(newXpToNext * LEVEL_MULTIPLIER);
                }

                // Calculate Total XP
                const newTotalXp = calculateCumulativeXp(newLevel, newXp);

                set({
                    xp: newXp,
                    level: newLevel,
                    totalXp: newTotalXp,
                    xpToNextLevel: newXpToNext,
                    lastLevel: level,
                    xpGained: { amount, timestamp: Date.now() },
                    levelUpData: newLevel > level ? { newLevel, timestamp: Date.now() } : get().levelUpData
                });
            },

            recordActivity: () => {
                const { lastActivityDate, streak, addXp } = get();
                const now = new Date();
                const localTodayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

                if (lastActivityDate) {
                    const lastDate = new Date(lastActivityDate);
                    const lastLocalStr = `${lastDate.getFullYear()}-${lastDate.getMonth() + 1}-${lastDate.getDate()}`;
                    if (localTodayStr === lastLocalStr) {
                        return; // Already recorded today
                    }
                }

                let newStreak = 1;
                if (lastActivityDate) {
                    const lastDate = new Date(lastActivityDate);
                    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

                    // 48 hours tolerance for generous streak continuity
                    if (hoursDiff <= 48) {
                        newStreak = streak + 1;
                    }
                }

                set({ streak: newStreak, lastActivityDate: now.toISOString() });

                // Add daily login XP + streak bonus (+5 XP per day of streak, max 100 bonus)
                const streakBonus = Math.min((newStreak - 1) * 5, 100);
                addXp(XP_REWARDS.DAILY_LOGIN + streakBonus, true); // Mark as bonus XP
            },

            unlockBadge: (badgeId) => {
                const { badges } = get();
                if (badges.find(b => b.id === badgeId)) return; // Already unlocked

                const badge = MOCK_BADGES.find(b => b.id === badgeId);
                if (badge) {
                    set({
                        badges: [...badges, { ...badge, unlockedAt: Date.now() }],
                        recentUnlock: badge
                    });
                }
            },

            clearRecentUnlock: () => set({ recentUnlock: null }),
            clearLevelUpData: () => set({ levelUpData: null }),
            clearXpGained: () => set({ xpGained: null }),

            incrementStat: (stat) => {
                const { totalChaptersRead, totalAnimeEpisodesWatched, totalMoviesWatched, totalWorksAdded, totalWorksCompleted, checkBadges } = get();

                if (stat === 'chapters') {
                    set({ totalChaptersRead: totalChaptersRead + 1 });
                } else if (stat === 'episodes') {
                    set({ totalAnimeEpisodesWatched: totalAnimeEpisodesWatched + 1 });
                } else if (stat === 'movies') {
                    set({ totalMoviesWatched: totalMoviesWatched + 1 });
                } else if (stat === 'works') {
                    set({ totalWorksAdded: totalWorksAdded + 1 });
                } else if (stat === 'completed') {
                    set({ totalWorksCompleted: totalWorksCompleted + 1 });
                }

                checkBadges();
            },

            checkBadges: () => {
                // Badges are now calculated server-side by onLibraryUpdate trigger.
                // This function is kept as a no-op to avoid breaking call sites.
                // Badge data is synced from Firestore when the gamification doc updates.
            },

            resetStore: () => set({
                level: 1,
                xp: 0,
                totalXp: 0,
                xpToNextLevel: LEVEL_BASE,
                bonusXp: 0,
                streak: 0,
                lastActivityDate: null,
                badges: [],
                recentUnlock: null,
                totalChaptersRead: 0,
                totalAnimeEpisodesWatched: 0,
                totalWorksAdded: 0,
                totalWorksCompleted: 0
            }),

            recalculateStats: (works) => {
                let chapters = 0;
                let episodes = 0;
                let movies = 0;
                const worksAdded = works.length;
                let worksCompleted = 0;
                let calculatedXp = 0;

                // Calculate raw stats
                works.forEach(w => {
                    const progress = w.currentChapter || 0;
                    const total = w.totalChapters;
                    const type = w.type ? w.type.toLowerCase() : 'manga';

                    // Anti-cheat: if total is unknown, don't count progress XP (0)
                    // if total is known, cap progress by it.
                    let effectiveProgress = 0;
                    if (total && total > 0) {
                        effectiveProgress = Math.min(progress, total);
                    } else if (progress > 0) {
                        // If no total is set by API, we don't grant XP for progress to prevent abuse
                        // but we still track it in the stats UI (raw chapters read).
                        effectiveProgress = 0;
                    }

                    if (type === 'manga') {
                        chapters += progress;
                        calculatedXp += effectiveProgress * XP_REWARDS.UPDATE_PROGRESS;
                    } else if (type === 'anime') {
                        if (w.format === 'Movie') {
                            movies += progress;
                            calculatedXp += Math.min(progress, 1) * XP_REWARDS.UPDATE_PROGRESS; // Movies usually 1 episode
                        } else {
                            episodes += progress;
                            calculatedXp += effectiveProgress * XP_REWARDS.UPDATE_PROGRESS;
                        }
                    } else {
                        chapters += progress;
                        calculatedXp += effectiveProgress * XP_REWARDS.UPDATE_PROGRESS;
                    }

                    if (w.status === 'completed') worksCompleted++;
                });

                // 1. Works Added
                calculatedXp += worksAdded * XP_REWARDS.ADD_WORK;
                // 3. Completed
                calculatedXp += worksCompleted * XP_REWARDS.COMPLETE_WORK;

                // 4. Bonus XP
                calculatedXp += get().bonusXp || 0;

                // Calculate Level from XP
                let simLevel = 1;
                let simXp = calculatedXp;
                let simXpToNext = LEVEL_BASE;

                while (simXp >= simXpToNext && simLevel < MAX_LEVEL) {
                    simXp -= simXpToNext;
                    simLevel++;
                    simXpToNext = Math.floor(simXpToNext * LEVEL_MULTIPLIER);
                }

                const prevLevel = get().level;
                const prevTotalXp = get().totalXp;

                // Calculate Total XP
                const newTotalXp = calculateCumulativeXp(simLevel, simXp);

                // GUARD: If new calculates are significantly lower than current, 
                // and works list is small or empty, it's likely a loading state. 
                // Don't overwrite state with zeroed values.
                if (works.length === 0 && prevLevel > 1 && prevTotalXp > 100) {
                    logger.log('[GamificationStore] recalculateStats ignored - empty works with high level (likely loading)');
                    return;
                }

                if (newTotalXp < prevTotalXp && works.length < 5 && prevTotalXp > 500) {
                    logger.log('[GamificationStore] recalculateStats ignored - suspiciously low XP result (likely loading or incomplete list)');
                    return;
                }

                // Hack to show toast if XP increased (roughly)
                // If they level up, we can't easily rely on simXp > prevXp, so just use logic:
                const didIncreaseXP = newTotalXp > prevTotalXp;
                const xpGainGuesstimate = didIncreaseXP ? Math.min(100, Math.floor(newTotalXp - prevTotalXp)) : 0;

                set({
                    totalChaptersRead: chapters,
                    totalAnimeEpisodesWatched: episodes,
                    totalMoviesWatched: movies,
                    totalWorksAdded: worksAdded,
                    totalWorksCompleted: worksCompleted,
                    // Update XP and Level
                    xp: simXp,
                    level: simLevel,
                    totalXp: newTotalXp,
                    xpToNextLevel: simXpToNext,
                    lastLevel: prevLevel,
                    // Only show toast if it's a minor gain (manual action) 
                    // or if explicitly requested. Large jumps from recalculation are muted.
                    ...(didIncreaseXP && xpGainGuesstimate <= 100 ? {
                        xpGained: { amount: xpGainGuesstimate, timestamp: Date.now() },
                        levelUpData: simLevel > prevLevel ? { newLevel: simLevel, timestamp: Date.now() } : get().levelUpData
                    }
                        : (simLevel > prevLevel ? { levelUpData: { newLevel: simLevel, timestamp: Date.now() } } : {}))
                });
            },

            syncFromProfile: (profile: any) => {
                if (!profile) return;

                // Only update if we actually have gamification data in the profile
                if (profile.level === undefined && profile.xp === undefined) return;

                const state = get();
                const level = profile.level || 1;
                const xp = profile.xp || 0;
                const streak = profile.streak || 0;
                const totalChaptersRead = profile.totalChaptersRead ?? state.totalChaptersRead;
                const totalAnimeEpisodesWatched = profile.totalAnimeEpisodesWatched ?? state.totalAnimeEpisodesWatched;
                const totalMoviesWatched = profile.totalMoviesWatched ?? state.totalMoviesWatched;
                const totalWorksAdded = profile.totalWorksAdded ?? state.totalWorksAdded;
                const totalWorksCompleted = profile.totalWorksCompleted ?? state.totalWorksCompleted;
                const bonusXp = profile.bonusXp ?? state.bonusXp;

                // Sync lastActivityDate from cloud only if cloud is more recent
                // This is critical for streak continuity across devices
                const cloudLastActivity = profile.lastActivityDate || null;
                const localLastActivity = state.lastActivityDate || null;
                let lastActivityDate = localLastActivity;
                if (cloudLastActivity) {
                    const cloudTime = new Date(cloudLastActivity).getTime();
                    const localTime = localLastActivity ? new Date(localLastActivity).getTime() : 0;
                    if (cloudTime > localTime) {
                        lastActivityDate = cloudLastActivity;
                    }
                }

                const totalXp = profile.totalXp || calculateCumulativeXp(level, xp);

                // Anti-regression guard: Only sync if incoming XP is higher or equal to current
                // This prevents stale cloud data from overwriting recent local progress
                if (state.totalXp > totalXp) {
                    logger.log('[GamificationStore] Skip profile sync - local XP is ahead:', { local: state.totalXp, remote: totalXp });
                    return;
                }

                // Quick equality check to prevent loops
                if (
                    state.level === level &&
                    state.xp === xp &&
                    state.streak === streak &&
                    state.totalXp === totalXp &&
                    state.bonusXp === bonusXp &&
                    state.lastActivityDate === lastActivityDate &&
                    state.totalChaptersRead === totalChaptersRead &&
                    state.totalAnimeEpisodesWatched === totalAnimeEpisodesWatched &&
                    state.totalMoviesWatched === totalMoviesWatched &&
                    state.totalWorksAdded === totalWorksAdded &&
                    state.totalWorksCompleted === totalWorksCompleted &&
                    JSON.stringify(state.badges) === JSON.stringify(profile.badges || [])
                ) {
                    return;
                }

                // Calculate xpToNextLevel for the given level
                let xpToNext = LEVEL_BASE;
                for (let i = 1; i < level; i++) {
                    xpToNext = Math.floor(xpToNext * LEVEL_MULTIPLIER);
                }

                set({
                    level: level,
                    xp: xp,
                    totalXp: totalXp,
                    xpToNextLevel: xpToNext,
                    streak: streak,
                    lastActivityDate,
                    bonusXp,
                    badges: profile.badges || [],
                    totalChaptersRead,
                    totalAnimeEpisodesWatched,
                    totalMoviesWatched,
                    totalWorksAdded,
                    totalWorksCompleted,
                });

                logger.log('[GamificationStore] Synced from profile:', { level, xp, totalXp, streak, lastActivityDate });
            }
        }),
        {
            name: 'bingeki-gamification-storage',
            // Exclude notification and transient states from persistence
            partialize: (state: GamificationState) => {
                const { xpGained, levelUpData, recentUnlock, ...rest } = state;
                return rest;
            },
        }
    )
);

/**
 * Calculates cumulative XP across all levels
 */
function calculateCumulativeXp(level: number, currentLevelXp: number): number {
    let total = 0;
    let levelXpReq = LEVEL_BASE;

    for (let l = 1; l < level; l++) {
        total += levelXpReq;
        levelXpReq = Math.floor(levelXpReq * LEVEL_MULTIPLIER);
    }

    return total + currentLevelXp;
}
