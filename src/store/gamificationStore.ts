/**
 * Gamification store: XP, levels, streaks, badges, and stat tracking.
 *
 * The server is authoritative: every derived stat comes from
 * src/shared/gamificationCore.ts, which the Cloud Function mirrors exactly.
 * Local recalculation is optimistic UI only — the trigger confirms or corrects it.
 * The client owns exactly three fields: bonusXp, streak, lastActivityDate.
 */
import { logger } from '@/utils/logger';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Badge } from '@/types/badge';
import { useLibraryStore, type Work } from './libraryStore';
import {
    LEVEL_BASE,
    XP_REWARDS,
    calculateUserStats,
    clampBonusXp,
    computeStreak,
    cumulativeXpForLevel,
    levelFromTotalXp,
    streakBonusXp,
    xpRequiredForLevel,
} from '@/shared/gamificationCore';

export { XP_REWARDS };

export interface GamificationState {
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

    addBonusXp: (amount: number) => void;
    recordActivity: () => void;
    clearRecentUnlock: () => void;
    resetStore: () => void;
    recalculateStats: (works: Work[]) => void;
    clearLevelUpData: () => void;
    clearXpGained: () => void;
    syncFromProfile: (profile: Record<string, unknown>) => void;
}

const INITIAL_STATE = {
    level: 1,
    xp: 0,
    totalXp: 0,
    xpToNextLevel: LEVEL_BASE,
    bonusXp: 0,
    streak: 0,
    lastActivityDate: null,
    badges: [] as Badge[],
    recentUnlock: null,
    lastLevel: 1,
    xpGained: null,
    levelUpData: null,
    totalChaptersRead: 0,
    totalAnimeEpisodesWatched: 0,
    totalMoviesWatched: 0,
    totalWorksAdded: 0,
    totalWorksCompleted: 0,
};

export const useGamificationStore = create<GamificationState>()(
    persist(
        (set, get) => ({
            ...INITIAL_STATE,

            addBonusXp: (amount) => {
                const state = get();
                const nextBonus = clampBonusXp(state.bonusXp + amount);
                const delta = nextBonus - state.bonusXp;
                if (delta === 0) return;

                const totalXp = state.totalXp + delta;
                const derived = levelFromTotalXp(totalXp);

                set({
                    bonusXp: nextBonus,
                    totalXp,
                    ...derived,
                    lastLevel: state.level,
                    xpGained: { amount: delta, timestamp: Date.now() },
                    levelUpData: derived.level > state.level
                        ? { newLevel: derived.level, timestamp: Date.now() }
                        : state.levelUpData,
                });
            },

            recordActivity: () => {
                const { lastActivityDate, streak, addBonusXp } = get();
                const now = new Date();

                const result = computeStreak(streak, lastActivityDate, now);
                if (!result.changed) return;

                set({ streak: result.streak, lastActivityDate: now.toISOString() });
                addBonusXp(XP_REWARDS.DAILY_LOGIN + streakBonusXp(result.streak));
            },

            clearRecentUnlock: () => set({ recentUnlock: null }),
            clearLevelUpData: () => set({ levelUpData: null }),
            clearXpGained: () => set({ xpGained: null }),

            resetStore: () => set({ ...INITIAL_STATE }),

            recalculateStats: (works) => {
                // A cold start has an empty library until Firestore answers; recalculating
                // then would flash level 1 before the server corrects it.
                if (!useLibraryStore.getState().hydrated) {
                    logger.log('[GamificationStore] recalculateStats skipped - library not hydrated');
                    return;
                }

                const state = get();
                const stats = calculateUserStats(works, state.bonusXp);
                const delta = stats.totalXp - state.totalXp;

                set({
                    ...stats,
                    lastLevel: state.level,
                    xpGained: delta > 0 ? { amount: delta, timestamp: Date.now() } : state.xpGained,
                    levelUpData: stats.level > state.level
                        ? { newLevel: stats.level, timestamp: Date.now() }
                        : state.levelUpData,
                });
            },

            syncFromProfile: (profile: Record<string, unknown>) => {
                if (!profile || typeof profile !== 'object') return;
                if (profile.level === undefined && profile.totalXp === undefined) return;

                const state = get();

                // bonusXp / streak / lastActivityDate are client-owned: keep the local
                // value unless another device is further ahead.
                const remoteBonus = clampBonusXp(profile.bonusXp);
                const bonusXp = Math.max(state.bonusXp, remoteBonus);

                const remoteLastActivity = (profile.lastActivityDate as string) || null;
                const remoteTime = remoteLastActivity ? new Date(remoteLastActivity).getTime() : 0;
                const localTime = state.lastActivityDate ? new Date(state.lastActivityDate).getTime() : 0;
                const remoteIsNewer = remoteTime > localTime;
                const lastActivityDate = remoteIsNewer ? remoteLastActivity : state.lastActivityDate;
                const streak = remoteIsNewer ? ((profile.streak as number) || 0) : state.streak;

                // Everything below is server-derived and always wins, including downward
                // corrections — that is the whole point of the trigger.
                const remoteTotalXp = typeof profile.totalXp === 'number'
                    ? profile.totalXp
                    : cumulativeXpForLevel((profile.level as number) || 1) + ((profile.xp as number) || 0);

                // The server has not seen bonus XP earned locally yet; add it back so the
                // display does not dip for a second before the trigger catches up.
                const pendingBonus = Math.max(0, bonusXp - remoteBonus);
                const totalXp = remoteTotalXp + pendingBonus;
                const derived = levelFromTotalXp(totalXp);

                const next = {
                    ...derived,
                    totalXp,
                    streak,
                    lastActivityDate,
                    bonusXp,
                    badges: (profile.badges as Badge[]) || state.badges,
                    totalChaptersRead: (profile.totalChaptersRead as number) ?? state.totalChaptersRead,
                    totalAnimeEpisodesWatched: (profile.totalAnimeEpisodesWatched as number) ?? state.totalAnimeEpisodesWatched,
                    totalMoviesWatched: (profile.totalMoviesWatched as number) ?? state.totalMoviesWatched,
                    totalWorksAdded: (profile.totalWorksAdded as number) ?? state.totalWorksAdded,
                    totalWorksCompleted: (profile.totalWorksCompleted as number) ?? state.totalWorksCompleted,
                };

                const unchanged =
                    state.level === next.level &&
                    state.xp === next.xp &&
                    state.totalXp === next.totalXp &&
                    state.streak === next.streak &&
                    state.bonusXp === next.bonusXp &&
                    state.lastActivityDate === next.lastActivityDate &&
                    state.totalChaptersRead === next.totalChaptersRead &&
                    state.totalAnimeEpisodesWatched === next.totalAnimeEpisodesWatched &&
                    state.totalMoviesWatched === next.totalMoviesWatched &&
                    state.totalWorksAdded === next.totalWorksAdded &&
                    state.totalWorksCompleted === next.totalWorksCompleted &&
                    JSON.stringify(state.badges) === JSON.stringify(next.badges);

                if (unchanged) return;

                set({ ...next, lastLevel: state.level });
                logger.log('[GamificationStore] Synced from profile:', {
                    level: next.level, totalXp: next.totalXp, streak: next.streak,
                });
            },
        }),
        {
            name: 'bingeki-gamification-storage',

            partialize: (state: GamificationState) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { xpGained, levelUpData, recentUnlock, ...rest } = state;
                return rest;
            },
        }
    )
);

export { levelFromTotalXp, xpRequiredForLevel };
