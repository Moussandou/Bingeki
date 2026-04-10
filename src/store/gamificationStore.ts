/**
 * Gamification store: XP, levels, streaks, badges, and stat tracking
 * Recalculates from library works; syncs with Firestore profile
 */
import { logger } from '@/utils/logger';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Badge, MOCK_BADGES } from '@/types/badge';
import { type Work } from './libraryStore';

interface GamificationState {
    level: number;
    xp: number;
    totalXp: number;
    xpToNextLevel: number;
    bonusXp: number;
    streak: number;
    lastActivityDate: string | null;
    badges: Badge[];
    recentUnlock: Badge | null;
    lastLevel: number;
    xpGained: { amount: number; timestamp: number } | null;
    levelUpData: { newLevel: number; timestamp: number } | null;


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

// Must match functions/index.js XP_REWARDS
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


                let newXp = Math.max(0, xp + amount);
                let newLevel = level;
                let newXpToNext = xpToNextLevel;


                while (newXp >= newXpToNext && newLevel < MAX_LEVEL) {
                    newXp -= newXpToNext;
                    newLevel++;
                    newXpToNext = Math.floor(newXpToNext * LEVEL_MULTIPLIER);
                }


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
                        return;
                    }
                }

                let newStreak = 1;
                if (lastActivityDate) {
                    const lastDate = new Date(lastActivityDate);
                    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

                    // 48h streak tolerance
                    if (hoursDiff <= 48) {
                        newStreak = streak + 1;
                    }
                }

                set({ streak: newStreak, lastActivityDate: now.toISOString() });

                // Daily XP + streak bonus (capped at +100)
                const streakBonus = Math.min((newStreak - 1) * 5, 100);
                addXp(XP_REWARDS.DAILY_LOGIN + streakBonus, true);
            },

            unlockBadge: (badgeId) => {
                const { badges } = get();
                if (badges.find(b => b.id === badgeId)) return;

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
                // Badges are calculated server-side (onLibraryUpdate trigger)
                // Kept as no-op to avoid breaking call sites
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


                works.forEach(w => {
                    const progress = w.currentChapter || 0;
                    const total = w.totalChapters;
                    const type = w.type ? w.type.toLowerCase() : 'manga';

                    // Skip progress XP when total is unknown (anti-cheat)
                    let effectiveProgress = 0;
                    if (total && total > 0) {
                        effectiveProgress = Math.min(progress, total);
                    } else if (progress > 0) {
                        effectiveProgress = 0;
                    }

                    if (type === 'manga') {
                        chapters += progress;
                        calculatedXp += effectiveProgress * XP_REWARDS.UPDATE_PROGRESS;
                    } else if (type === 'anime') {
                        if (w.format === 'Movie') {
                            movies += progress;
                            calculatedXp += Math.min(progress, 1) * XP_REWARDS.UPDATE_PROGRESS;
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


                calculatedXp += worksAdded * XP_REWARDS.ADD_WORK;

                calculatedXp += worksCompleted * XP_REWARDS.COMPLETE_WORK;


                calculatedXp += get().bonusXp || 0;


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


                const newTotalXp = calculateCumulativeXp(simLevel, simXp);

                // Guard: don't overwrite with zeros during loading
                if (works.length === 0 && prevLevel > 1 && prevTotalXp > 100) {
                    logger.log('[GamificationStore] recalculateStats ignored - empty works with high level (likely loading)');
                    return;
                }

                if (newTotalXp < prevTotalXp && works.length < 5 && prevTotalXp > 500) {
                    logger.log('[GamificationStore] recalculateStats ignored - suspiciously low XP result (likely loading or incomplete list)');
                    return;
                }

                // Estimate XP gain for toast display
                const didIncreaseXP = newTotalXp > prevTotalXp;
                const xpGainGuesstimate = didIncreaseXP ? Math.min(100, Math.floor(newTotalXp - prevTotalXp)) : 0;

                set({
                    totalChaptersRead: chapters,
                    totalAnimeEpisodesWatched: episodes,
                    totalMoviesWatched: movies,
                    totalWorksAdded: worksAdded,
                    totalWorksCompleted: worksCompleted,

                    xp: simXp,
                    level: simLevel,
                    totalXp: newTotalXp,
                    xpToNextLevel: simXpToNext,
                    lastLevel: prevLevel,
                    // Only show toast for small gains; mute large recalculation jumps
                    ...(didIncreaseXP && xpGainGuesstimate <= 100 ? {
                        xpGained: { amount: xpGainGuesstimate, timestamp: Date.now() },
                        levelUpData: simLevel > prevLevel ? { newLevel: simLevel, timestamp: Date.now() } : get().levelUpData
                    }
                        : (simLevel > prevLevel ? { levelUpData: { newLevel: simLevel, timestamp: Date.now() } } : {}))
                });
            },

            syncFromProfile: (profile: any) => {
                if (!profile) return;


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

                // Use most recent lastActivityDate for streak continuity
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

                // Anti-regression: don't overwrite if local XP is ahead
                if (state.totalXp > totalXp) {
                    logger.log('[GamificationStore] Skip profile sync - local XP is ahead:', { local: state.totalXp, remote: totalXp });
                    return;
                }

                // Skip if nothing changed
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

            partialize: (state: GamificationState) => {
                const { xpGained, levelUpData, recentUnlock, ...rest } = state;
                return rest;
            },
        }
    )
);


function calculateCumulativeXp(level: number, currentLevelXp: number): number {
    let total = 0;
    let levelXpReq = LEVEL_BASE;

    for (let l = 1; l < level; l++) {
        total += levelXpReq;
        levelXpReq = Math.floor(levelXpReq * LEVEL_MULTIPLIER);
    }

    return total + currentLevelXp;
}
