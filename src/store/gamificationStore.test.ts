import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGamificationStore, XP_REWARDS } from './gamificationStore';
import { type Work } from './libraryStore';

describe('Gamification Store', () => {
    beforeEach(() => {
        useGamificationStore.getState().resetStore();
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

    it('should add XP and level up correctly', () => {
        const { addXp } = useGamificationStore.getState();
        
        // Add exact amount to level up (100 -> level 2)
        addXp(100);
        
        const state1 = useGamificationStore.getState();
        expect(state1.level).toBe(2);
        expect(state1.xp).toBe(0);
        expect(state1.totalXp).toBe(100); // 100 from level 1
        expect(state1.xpToNextLevel).toBe(105); // Math.floor(100 * 1.05)

        // Check if levelUpData is set
        expect(state1.levelUpData?.newLevel).toBe(2);

        // Add more XP to not level up
        addXp(50);
        const state2 = useGamificationStore.getState();
        expect(state2.level).toBe(2);
        expect(state2.xp).toBe(50);
        expect(state2.totalXp).toBe(150); // 100 + 50

        // Level up again (50 existing + 114 = 164 XP, needs 105, 59 remaining)
        addXp(114);
        const state3 = useGamificationStore.getState();
        expect(state3.level).toBe(3);
        expect(state3.xp).toBe(59);
        expect(state3.totalXp).toBe(100 + 105 + 59); // Lvl 1 req + Lvl 2 req + current XP
        expect(state3.xpToNextLevel).toBe(110); // Math.floor(105 * 1.05)
        expect(state3.lastLevel).toBe(2);
    });

    it('should handle recordActivity for streaks and rewards', () => {
        const { recordActivity } = useGamificationStore.getState();

        // 1st login (Day 1)
        const date1 = new Date('2024-03-20T10:00:00Z');
        vi.setSystemTime(date1);
        recordActivity();
        
        expect(useGamificationStore.getState().streak).toBe(1);
        // Expect daily login XP reward (25) even on Day 1
        expect(useGamificationStore.getState().xp).toBe(XP_REWARDS.DAILY_LOGIN);

        // Same day login (should ignore)
        const date2 = new Date('2024-03-20T15:00:00Z');
        vi.setSystemTime(date2);
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(1);
        expect(useGamificationStore.getState().xp).toBe(XP_REWARDS.DAILY_LOGIN);

        // Next calendar day, 30 hours later (Day 2)
        const date3 = new Date('2024-03-21T16:00:00Z');
        vi.setSystemTime(date3);
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(2);
        // Expect daily login XP (25) + streak bonus (1 * 5 = 5) = 30 bonus total
        const expectedXp = XP_REWARDS.DAILY_LOGIN + (XP_REWARDS.DAILY_LOGIN + 5);
        expect(useGamificationStore.getState().xp).toBe(expectedXp);
        expect(useGamificationStore.getState().bonusXp).toBe(XP_REWARDS.DAILY_LOGIN + (XP_REWARDS.DAILY_LOGIN + 5));

        // Day 3
        const date4 = new Date('2024-03-22T10:00:00Z');
        vi.setSystemTime(date4);
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(3);
        // Bonus for Day 3 = 25 + (2 * 5) = 35. Total bonus = 25 (D1) + 30 (D2) + 35 (D3) = 90
        expect(useGamificationStore.getState().bonusXp).toBe(90);

        // Next calendar day, 49 hours later (streak broken)
        const date5 = new Date('2024-03-24T12:00:01Z');
        vi.setSystemTime(date5);
        recordActivity();
        expect(useGamificationStore.getState().streak).toBe(1);
        // New Day 1 after reset: adds another 25 XP. 90 + 25 = 115
        expect(useGamificationStore.getState().bonusXp).toBe(115);
    });

    it('should calculate XP deterministically via recalculateStats', () => {
        const { recalculateStats } = useGamificationStore.getState();
        const mockWorks: Work[] = [
            { id: 1, title: 'Manga 1', type: 'manga', status: 'completed', totalChapters: 10, currentChapter: 10, rating: 0, notes: '', image: '', lastUpdated: 0, dateAdded: 0 },
            { id: 2, title: 'Anime 1', type: 'anime', status: 'reading', totalChapters: 12, currentChapter: 5, rating: 0, notes: '', image: '', lastUpdated: 0, dateAdded: 0 }
        ] as Work[];

        recalculateStats(mockWorks);
        
        const state = useGamificationStore.getState();
        // 2 works * 15 = 30
        // (10 + 5) * 5 = 75
        // 1 completed * 50 = 50
        // Total = 155 XP
        // Level 1: 100 XP -> Level 2 (Remaining 55)
        
        expect(state.level).toBe(2);
        expect(state.xp).toBe(55);
        expect(state.totalXp).toBe(155);
        expect(state.totalWorksAdded).toBe(2);
        expect(state.totalWorksCompleted).toBe(1);
    });

    it('should preserve bonusXp during recalculation', () => {
        const { addXp, recalculateStats } = useGamificationStore.getState();
        
        // Add 50 bonus XP (e.g. daily login)
        addXp(50, true);
        
        const mockWorks: Work[] = [
            { id: 1, title: 'Manga 1', type: 'manga', status: 'reading', totalChapters: 10, currentChapter: 0, rating: 0, notes: '', image: '', lastUpdated: 0, dateAdded: 0 }
        ] as Work[];
        
        recalculateStats(mockWorks);
        
        const state = useGamificationStore.getState();
        // 1 work * 15 = 15
        // 0 progress * 10 = 0
        // 0 completed * 50 = 0
        // Bonus XP = 50
        // Total = 65 XP
        
        expect(state.xp).toBe(65);
        expect(state.bonusXp).toBe(50);
    });
});
