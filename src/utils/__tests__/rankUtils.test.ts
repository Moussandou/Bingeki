import { describe, it, expect } from 'vitest';
import { calculateRank, getRankColor } from '../rankUtils';

describe('rankUtils', () => {
    describe('calculateRank', () => {
        it('returns F for level 0', () => {
            expect(calculateRank(0)).toBe('F');
        });

        it('returns E for level 5', () => {
            expect(calculateRank(5)).toBe('E');
        });

        it('returns D for level 10', () => {
            expect(calculateRank(10)).toBe('D');
        });

        it('returns C for level 20', () => {
            expect(calculateRank(20)).toBe('C');
        });

        it('returns B for level 30', () => {
            expect(calculateRank(30)).toBe('B');
        });

        it('returns A for level 50', () => {
            expect(calculateRank(50)).toBe('A');
        });

        it('returns S for level 75', () => {
            expect(calculateRank(75)).toBe('S');
        });

        it('returns 臭 for level 100', () => {
            expect(calculateRank(100)).toBe('臭');
        });
    });

    describe('getRankColor', () => {
        it('returns Gold for S rank', () => {
            expect(getRankColor('S')).toBe('#D4AF37');
        });

        it('returns Black for default/unknown rank', () => {
            expect(getRankColor('Z')).toBe('#000000');
        });
    });
});
