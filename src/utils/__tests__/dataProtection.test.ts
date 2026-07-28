import { describe, it, expect } from 'vitest';
import {
    mergeGamificationData,
    mergeLibraryData,
    validateGamificationWrite,
    MAX_BONUS_XP_JUMP,
} from '../dataProtection';
import type { Work, Tombstone } from '@/store/libraryStore';
import { LEVEL_MULTIPLIER, MAX_BONUS_XP } from '@/shared/gamificationCore';

function work(id: number, lastUpdated = 1000): Work {
    return {
        id,
        title: `W${id}`,
        type: 'manga',
        status: 'reading',
        image: '',
        lastUpdated,
    } as Work;
}

describe('mergeLibraryData', () => {
    it('keeps cloud-only works when there is no tombstone', () => {
        const merged = mergeLibraryData([work(1)], [work(1), work(2)]);
        expect(merged.map(w => w.id)).toEqual([1, 2]);
    });

    it('does not resurrect a work deleted on this device', () => {
        const tombstones: Tombstone[] = [{ id: 2, deletedAt: 5000 }];
        const merged = mergeLibraryData([work(1)], [work(1), work(2, 1000)], tombstones);
        expect(merged.map(w => w.id)).toEqual([1]);
    });

    it('keeps a work edited elsewhere after the deletion', () => {
        const tombstones: Tombstone[] = [{ id: 2, deletedAt: 5000 }];
        // Cloud edit is newer than the deletion: the edit wins.
        const merged = mergeLibraryData([work(1)], [work(1), work(2, 9000)], tombstones);
        expect(merged.map(w => w.id)).toEqual([1, 2]);
    });

    it('returns local when every cloud work is tombstoned', () => {
        const tombstones: Tombstone[] = [{ id: 2, deletedAt: 5000 }];
        const merged = mergeLibraryData([], [work(2, 1000)], tombstones);
        expect(merged).toEqual([]);
    });

    it('prefers the newer copy of the same work', () => {
        const merged = mergeLibraryData([work(1, 2000)], [work(1, 9000)]);
        expect(merged[0].lastUpdated).toBe(9000);
    });
});

describe('mergeGamificationData', () => {
    it('uses the level curve shared with the server', () => {
        const merged = mergeGamificationData({}, { totalXp: 100 });
        expect(merged.level).toBe(2);
        // Regression: this used to be computed with 1.15 instead of 1.05.
        expect(merged.xpToNextLevel).toBe(Math.floor(100 * LEVEL_MULTIPLIER));
    });

    it('lets the server value win over a higher local one', () => {
        const merged = mergeGamificationData(
            { totalXp: 99_999, level: 40 },
            { totalXp: 155, level: 2 }
        );
        expect(merged.totalXp).toBe(155);
        expect(merged.level).toBe(2);
    });

    it('keeps the highest bonusXp across devices', () => {
        const merged = mergeGamificationData({ bonusXp: 300 }, { bonusXp: 50, totalXp: 0 });
        expect(merged.bonusXp).toBe(300);
    });

    it('clamps bonusXp to the shared cap', () => {
        const merged = mergeGamificationData({ bonusXp: 10_000_000 }, { totalXp: 0 });
        expect(merged.bonusXp).toBe(MAX_BONUS_XP);
    });

    it('takes the streak attached to the most recent activity', () => {
        const merged = mergeGamificationData(
            { streak: 2, lastActivityDate: '2024-03-01T00:00:00.000Z' },
            { streak: 9, lastActivityDate: '2024-03-05T00:00:00.000Z', totalXp: 0 }
        );
        expect(merged.streak).toBe(9);
    });

    it('unions badges and keeps the earliest unlock', () => {
        const merged = mergeGamificationData(
            { badges: [{ id: 'a', name: 'A', description: '', icon: '', rarity: 'common', unlockedAt: 100 }] },
            { badges: [{ id: 'a', name: 'A', description: '', icon: '', rarity: 'common', unlockedAt: 500 }],
              totalXp: 0 }
        );
        expect(merged.badges).toHaveLength(1);
        expect(merged.badges[0].unlockedAt).toBe(100);
    });

    it('falls back to local when there is no cloud copy', () => {
        const merged = mergeGamificationData({ totalXp: 155, bonusXp: 5 }, null);
        expect(merged.totalXp).toBe(155);
        expect(merged.bonusXp).toBe(5);
    });
});

describe('validateGamificationWrite', () => {
    it('accepts a normal daily bonus gain', () => {
        expect(validateGamificationWrite({ bonusXp: 130, streak: 3 }, { bonusXp: 100 })).toBe(true);
    });

    it('rejects a bonusXp decrease', () => {
        expect(validateGamificationWrite({ bonusXp: 50 }, { bonusXp: 100 })).toBe(false);
    });

    it('allows an exact reset to zero', () => {
        expect(validateGamificationWrite({ bonusXp: 0, streak: 0 }, { bonusXp: 5000 })).toBe(true);
    });

    it('rejects an implausible bonusXp jump', () => {
        expect(
            validateGamificationWrite({ bonusXp: 100 + MAX_BONUS_XP_JUMP + 1 }, { bonusXp: 100 })
        ).toBe(false);
    });

    it('rejects values above the hard cap', () => {
        expect(validateGamificationWrite({ bonusXp: MAX_BONUS_XP + 1 }, null)).toBe(false);
    });

    it('rejects negative or non-finite values', () => {
        expect(validateGamificationWrite({ bonusXp: -1 }, null)).toBe(false);
        expect(validateGamificationWrite({ bonusXp: NaN }, null)).toBe(false);
        expect(validateGamificationWrite({ streak: -3 }, null)).toBe(false);
    });

    it('no longer blocks derived stats from decreasing', () => {
        // The server must be able to correct an inflated total downwards.
        expect(validateGamificationWrite({ bonusXp: 100 }, { bonusXp: 100, totalXp: 99_999 })).toBe(true);
    });
});
