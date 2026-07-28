/**
 * Canonical XP / level / badge logic.
 *
 * This file is mirrored in CommonJS at functions/gamificationCore.js so the
 * Cloud Function can run the exact same math. Any change here MUST be applied
 * there too — src/shared/__tests__/gamificationParity.test.ts fails otherwise.
 */

export const LEVEL_BASE = 100;
export const LEVEL_MULTIPLIER = 1.05;
export const MAX_LEVEL = 100;

export const XP_REWARDS = {
    ADD_WORK: 15,
    UPDATE_PROGRESS: 5,
    COMPLETE_WORK: 50,
    WATCH_MOVIE: 20,
    DAILY_LOGIN: 25,
} as const;

export const MAX_EPISODES = 2500;
export const MAX_CHAPTERS = 5000;
export const MAX_XP_PER_WORK = 15000;
export const MAX_BONUS_XP = 50000;

export const STREAK_BONUS_PER_DAY = 5;
export const MAX_STREAK_BONUS = 100;

/**
 * Streak accepted the first time the server verifies an account.
 * Existing users must keep the streak they already earned, so the first run
 * adopts it instead of resetting to 1; from then on it can only grow one day
 * at a time. A brand-new account gets a single bounded claim and no more.
 */
export const MAX_BOOTSTRAP_STREAK = 365;

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface EarnedBadge extends BadgeDefinition {
    unlockedAt?: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
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

/** Minimal structural shape needed from a library work. */
export interface ScorableWork {
    type?: string;
    format?: string;
    status?: string;
    currentChapter?: number;
    currentEpisode?: number;
    totalChapters?: number | null;
    totalEpisodes?: number | null;
}

export interface UserStats {
    level: number;
    xp: number;
    totalXp: number;
    xpToNextLevel: number;
    totalChaptersRead: number;
    totalAnimeEpisodesWatched: number;
    totalMoviesWatched: number;
    totalWorksAdded: number;
    totalWorksCompleted: number;
}

function toSafeInt(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(n);
}

/** Progress is stored in currentChapter for every type; currentEpisode is legacy. */
export function getWorkProgress(work: ScorableWork): number {
    return toSafeInt(work.currentChapter) || toSafeInt(work.currentEpisode);
}

export function getWorkTotal(work: ScorableWork): number {
    return toSafeInt(work.totalChapters) || toSafeInt(work.totalEpisodes);
}

export function isAnime(work: ScorableWork): boolean {
    return String(work.type || 'manga').toLowerCase() === 'anime';
}

export function isMovie(work: ScorableWork): boolean {
    return String(work.format || '').toLowerCase() === 'movie';
}

/** Progress capped by the work's own total and by the per-type hard ceiling. */
export function getEffectiveProgress(work: ScorableWork): number {
    const progress = getWorkProgress(work);
    const total = getWorkTotal(work);
    const typeCap = isAnime(work) ? MAX_EPISODES : MAX_CHAPTERS;
    return total > 0
        ? Math.min(progress, total, typeCap)
        : Math.min(progress, typeCap);
}

/** Total XP required to go from `level` to `level + 1`. */
export function xpRequiredForLevel(level: number): number {
    let requirement = LEVEL_BASE;
    for (let l = 1; l < level; l++) {
        requirement = Math.floor(requirement * LEVEL_MULTIPLIER);
    }
    return requirement;
}

/** Cumulative XP needed to reach `level` from zero. */
export function cumulativeXpForLevel(level: number): number {
    let total = 0;
    let requirement = LEVEL_BASE;
    for (let l = 1; l < level; l++) {
        total += requirement;
        requirement = Math.floor(requirement * LEVEL_MULTIPLIER);
    }
    return total;
}

/** Single source of truth for turning a total XP amount into level/progress. */
export function levelFromTotalXp(totalXp: number): {
    level: number;
    xp: number;
    xpToNextLevel: number;
} {
    let remaining = toSafeInt(totalXp);
    let level = 1;
    let xpToNextLevel = LEVEL_BASE;

    while (level < MAX_LEVEL && remaining >= xpToNextLevel) {
        remaining -= xpToNextLevel;
        level++;
        xpToNextLevel = Math.floor(xpToNextLevel * LEVEL_MULTIPLIER);
    }

    // At max level the overflow has nowhere to go: show a full bar, keep totalXp exact.
    if (level >= MAX_LEVEL) {
        remaining = Math.min(remaining, xpToNextLevel);
    }

    return { level, xp: remaining, xpToNextLevel };
}

export function clampBonusXp(bonusXp: unknown): number {
    return Math.min(toSafeInt(bonusXp), MAX_BONUS_XP);
}

/** Derives every stat from the library. Deterministic: same works in, same stats out. */
export function calculateUserStats(
    libraryWorks: ScorableWork[],
    bonusXp: number = 0
): UserStats {
    const works = Array.isArray(libraryWorks) ? libraryWorks : [];

    let totalChaptersRead = 0;
    let totalAnimeEpisodesWatched = 0;
    let totalMoviesWatched = 0;
    let totalWorksCompleted = 0;
    let totalXpFromLibrary = 0;

    const totalWorksAdded = works.length;

    for (const work of works) {
        const completed = work.status === 'completed';
        const effectiveProgress = getEffectiveProgress(work);

        totalXpFromLibrary += XP_REWARDS.ADD_WORK;

        if (isAnime(work) && isMovie(work)) {
            totalMoviesWatched += completed ? 1 : 0;
            totalXpFromLibrary += completed ? XP_REWARDS.WATCH_MOVIE : 0;
        } else {
            if (isAnime(work)) {
                totalAnimeEpisodesWatched += effectiveProgress;
            } else {
                totalChaptersRead += effectiveProgress;
            }
            totalXpFromLibrary += Math.min(
                effectiveProgress * XP_REWARDS.UPDATE_PROGRESS,
                MAX_XP_PER_WORK
            );
        }

        if (completed) {
            totalWorksCompleted += 1;
            totalXpFromLibrary += XP_REWARDS.COMPLETE_WORK;
        }
    }

    const totalXp = totalXpFromLibrary + clampBonusXp(bonusXp);
    const { level, xp, xpToNextLevel } = levelFromTotalXp(totalXp);

    return {
        level,
        xp,
        totalXp,
        xpToNextLevel,
        totalChaptersRead,
        totalAnimeEpisodesWatched,
        totalMoviesWatched,
        totalWorksAdded,
        totalWorksCompleted,
    };
}

export function calculateBadges(
    stats: UserStats,
    streak: number = 0,
    existingBadges: EarnedBadge[] = [],
    now: number = Date.now()
): EarnedBadge[] {
    const existingMap = new Map<string, EarnedBadge>();
    (existingBadges || []).forEach((b) => {
        if (b && b.id) existingMap.set(b.id, b);
    });

    const earnedIds = new Set<string>(['first_steps']);

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

    // Emitted in definition order so two runs produce byte-identical arrays.
    const badges: EarnedBadge[] = [];
    for (const def of BADGE_DEFINITIONS) {
        if (!earnedIds.has(def.id)) continue;
        const existing = existingMap.get(def.id);
        badges.push(existing ? existing : { ...def, unlockedAt: now });
    }
    return badges;
}

/** Local-calendar day key; streaks are counted in days, never in elapsed hours. */
export function dayKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function calendarDaysBetween(from: Date, to: Date): number {
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export interface StreakResult {
    streak: number;
    changed: boolean;
}

/** Same day: unchanged. Next day: +1. Any gap: back to 1. */
export function computeStreak(
    previousStreak: number,
    lastActivityDate: string | null | undefined,
    now: Date
): StreakResult {
    const prev = toSafeInt(previousStreak);

    if (!lastActivityDate) {
        return { streak: 1, changed: true };
    }

    const last = new Date(lastActivityDate);
    if (Number.isNaN(last.getTime())) {
        return { streak: 1, changed: true };
    }

    const days = calendarDaysBetween(last, now);
    if (days <= 0) return { streak: prev || 1, changed: false };
    if (days === 1) return { streak: (prev || 0) + 1, changed: true };
    return { streak: 1, changed: true };
}

export function streakBonusXp(streak: number): number {
    const days = toSafeInt(streak);
    if (days <= 1) return 0;
    return Math.min((days - 1) * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS);
}

/**
 * Server-side guard: a client may advance its streak by at most one day per
 * calendar day, and only if its lastActivityDate actually moved forward.
 */
export function clampClaimedStreak(
    claimedStreak: unknown,
    storedStreak: unknown,
    claimedLastActivity: string | null | undefined,
    storedLastActivity: string | null | undefined
): number {
    const claimed = toSafeInt(claimedStreak);
    const stored = toSafeInt(storedStreak);

    if (claimed <= stored) return claimed;

    if (!claimedLastActivity) return stored;

    const claimedDate = new Date(claimedLastActivity);
    if (Number.isNaN(claimedDate.getTime())) return stored;

    // First verification for this account: adopt the existing streak once.
    if (!storedLastActivity) return Math.min(claimed, MAX_BOOTSTRAP_STREAK);

    const storedDate = new Date(storedLastActivity);
    if (Number.isNaN(storedDate.getTime())) return Math.min(claimed, MAX_BOOTSTRAP_STREAK);

    const days = calendarDaysBetween(storedDate, claimedDate);
    if (days <= 0) return stored;

    return Math.min(claimed, stored + days);
}
