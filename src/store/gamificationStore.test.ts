import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGamificationStore, XP_REWARDS } from './gamificationStore';
import { useLibraryStore, type Work } from './libraryStore';
import { MAX_BONUS_XP, MAX_XP_PER_WORK } from '@/shared/gamificationCore';

function work(partial: Partial<Work>): Work {
    return {
        id: Math.random(),
        title: 'W',
        type: 'manga',
        status: 'reading',
        image: '',
        rating: 0,
        notes: '',
        lastUpdated: 0,
        dateAdded: 0,
        ...partial,
    } as Work;
}

describe('Gamification Store', () => {
    beforeEach(() => {
        useGamificationStore.getState().resetStore();
        useLibraryStore.getState().resetStore();
        // recalculateStats is a no-op until the cloud library has landed.
        useLibraryStore.getState().setHydrated(true);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with correct default values', () => {
        const state = useGamificationStore.getState();
        expect(state.level).toBe(1);
        expect(state.xp).toBe(0);
        expect(state.totalXp).toBe(0);
        expect(state.streak).toBe(0);
        expect(state.bonusXp).toBe(0);
        expect(state.xpToNextLevel).toBe(100);
    });

    it('should add bonus XP and level up correctly', () => {
        useGamificationStore.getState().addBonusXp(100);

        const state1 = useGamificationStore.getState();
        expect(state1.level).toBe(2);
        expect(state1.xp).toBe(0);
        expect(state1.totalXp).toBe(100);
        expect(state1.xpToNextLevel).toBe(105); // Math.floor(100 * 1.05)
        expect(state1.levelUpData?.newLevel).toBe(2);

        useGamificationStore.getState().addBonusXp(50);
        expect(useGamificationStore.getState().level).toBe(2);
        expect(useGamificationStore.getState().xp).toBe(50);
        expect(useGamificationStore.getState().totalXp).toBe(150);
    });

    it('should cap bonus XP at MAX_BONUS_XP', () => {
        useGamificationStore.getState().addBonusXp(999_999);
        expect(useGamificationStore.getState().bonusXp).toBe(MAX_BONUS_XP);
        expect(useGamificationStore.getState().totalXp).toBe(MAX_BONUS_XP);

        // A further grant must be a no-op, not a totalXp bump.
        useGamificationStore.getState().addBonusXp(500);
        expect(useGamificationStore.getState().totalXp).toBe(MAX_BONUS_XP);
    });

    it('should handle recordActivity for streaks and rewards', () => {
        const { recordActivity } = useGamificationStore.getState();

        // Day 1
        vi.setSystemTime(new Date(2024, 2, 20, 10, 0, 0));
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(1);
        expect(useGamificationStore.getState().xp).toBe(XP_REWARDS.DAILY_LOGIN);

        // Same day: ignored
        vi.setSystemTime(new Date(2024, 2, 20, 15, 0, 0));
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(1);
        expect(useGamificationStore.getState().xp).toBe(XP_REWARDS.DAILY_LOGIN);

        // Day 2: +25 daily +5 streak bonus
        vi.setSystemTime(new Date(2024, 2, 21, 16, 0, 0));
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(2);
        expect(useGamificationStore.getState().bonusXp).toBe(25 + 30);

        // Day 3
        vi.setSystemTime(new Date(2024, 2, 22, 10, 0, 0));
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(3);
        expect(useGamificationStore.getState().bonusXp).toBe(90);

        // Skips Day 4 entirely: streak resets
        vi.setSystemTime(new Date(2024, 2, 24, 12, 0, 0));
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(1);
        expect(useGamificationStore.getState().bonusXp).toBe(115);
    });

    it('should not inflate a streak across a skipped day', () => {
        const { recordActivity } = useGamificationStore.getState();

        // 23:00 Monday
        vi.setSystemTime(new Date(2024, 2, 4, 23, 0, 0));
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(1);

        // 08:00 Wednesday: 33 elapsed hours, but Tuesday was skipped.
        vi.setSystemTime(new Date(2024, 2, 6, 8, 0, 0));
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(1);
    });

    it('should calculate XP deterministically via recalculateStats', () => {
        const { recalculateStats } = useGamificationStore.getState();
        const mockWorks: Work[] = [
            work({ id: 1, type: 'manga', status: 'completed', totalChapters: 10, currentChapter: 10 }),
            work({ id: 2, type: 'anime', status: 'reading', totalChapters: 12, currentChapter: 5 }),
        ];

        recalculateStats(mockWorks);

        const state = useGamificationStore.getState();
        // 2 * 15 (add) + (10 + 5) * 5 (progress) + 1 * 50 (complete) = 155
        expect(state.totalXp).toBe(155);
        expect(state.level).toBe(2);
        expect(state.xp).toBe(55);
        expect(state.totalWorksAdded).toBe(2);
        expect(state.totalWorksCompleted).toBe(1);
    });

    it('should preserve bonusXp during recalculation', () => {
        useGamificationStore.getState().addBonusXp(50);
        useGamificationStore.getState().recalculateStats([
            work({ id: 1, type: 'manga', status: 'reading', totalChapters: 10, currentChapter: 0 }),
        ]);

        const state = useGamificationStore.getState();
        expect(state.totalXp).toBe(65); // 15 add + 50 bonus
        expect(state.bonusXp).toBe(50);
    });

    it('should cap XP per work, matching the server', () => {
        useGamificationStore.getState().recalculateStats([
            work({ id: 1, type: 'manga', status: 'reading', currentChapter: 4000 }),
        ]);
        expect(useGamificationStore.getState().totalXp).toBe(
            XP_REWARDS.ADD_WORK + MAX_XP_PER_WORK
        );
    });

    it('should count chapters from capped progress, not raw progress', () => {
        useGamificationStore.getState().recalculateStats([
            work({ id: 1, type: 'manga', status: 'reading', currentChapter: 8000, totalChapters: 100 }),
        ]);
        expect(useGamificationStore.getState().totalChaptersRead).toBe(100);
    });

    it('should apply a downward correction when works are removed', () => {
        const { recalculateStats } = useGamificationStore.getState();
        const works = [
            work({ id: 1, type: 'manga', status: 'completed', totalChapters: 100, currentChapter: 100 }),
            work({ id: 2, type: 'manga', status: 'completed', totalChapters: 100, currentChapter: 100 }),
        ];

        recalculateStats(works);
        const before = useGamificationStore.getState().totalXp;
        expect(before).toBeGreaterThan(500);

        // Removing a work must give the XP back, whatever the library size.
        recalculateStats([works[0]]);
        expect(useGamificationStore.getState().totalXp).toBeLessThan(before);
        expect(useGamificationStore.getState().totalWorksAdded).toBe(1);
    });

    it('should ignore recalculation until the library is hydrated', () => {
        useGamificationStore.getState().recalculateStats([
            work({ id: 1, type: 'manga', status: 'completed', currentChapter: 100 }),
        ]);
        const seeded = useGamificationStore.getState().totalXp;
        expect(seeded).toBeGreaterThan(0);

        useLibraryStore.getState().setHydrated(false);
        useGamificationStore.getState().recalculateStats([]);
        expect(useGamificationStore.getState().totalXp).toBe(seeded);
    });

    describe('syncFromProfile', () => {
        it('accepts a downward correction from the server', () => {
            useGamificationStore.setState({ totalXp: 99_999, level: 40, xp: 10 });

            useGamificationStore.getState().syncFromProfile({
                totalXp: 155, level: 2, xp: 55, bonusXp: 0,
            });

            const state = useGamificationStore.getState();
            expect(state.totalXp).toBe(155);
            expect(state.level).toBe(2);
        });

        it('keeps locally earned bonus XP the server has not seen yet', () => {
            useGamificationStore.setState({ bonusXp: 100, totalXp: 200 });

            // Server still reports the pre-bonus totals.
            useGamificationStore.getState().syncFromProfile({
                totalXp: 100, level: 2, xp: 0, bonusXp: 0,
            });

            const state = useGamificationStore.getState();
            expect(state.bonusXp).toBe(100);
            expect(state.totalXp).toBe(200); // 100 server + 100 pending bonus
        });

        it('adopts a higher bonusXp coming from another device', () => {
            useGamificationStore.setState({ bonusXp: 10, totalXp: 10 });

            useGamificationStore.getState().syncFromProfile({
                totalXp: 500, level: 5, xp: 0, bonusXp: 300,
            });

            expect(useGamificationStore.getState().bonusXp).toBe(300);
            expect(useGamificationStore.getState().totalXp).toBe(500);
        });
    });
});
