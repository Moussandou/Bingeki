/**
 * Drift guard: the client (TS) and the Cloud Function (CJS) must compute
 * identical XP, levels, stats and badges for every input.
 *
 * If this fails, src/shared/gamificationCore.ts and functions/gamificationCore.js
 * have diverged — fix the mirror, do not weaken the test.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as client from '../gamificationCore';
import type { ScorableWork } from '../gamificationCore';

const require_ = createRequire(import.meta.url);
const server = require_(
    path.resolve(__dirname, '../../../functions/gamificationCore.js')
) as typeof client;

const FIXED_NOW = 1700000000000;

const WORK_FIXTURES: ScorableWork[][] = [
    [],
    [{ type: 'manga', status: 'reading', currentChapter: 10, totalChapters: 100 }],
    // Progress beyond the declared total (the §3 divergence)
    [{ type: 'manga', status: 'reading', currentChapter: 8000, totalChapters: 100 }],
    // Past the per-work XP cap (the §2 divergence)
    [{ type: 'manga', status: 'reading', currentChapter: 4000, totalChapters: null }],
    [{ type: 'manga', status: 'reading', currentChapter: 99999, totalChapters: null }],
    [{ type: 'anime', status: 'reading', currentChapter: 9999, totalEpisodes: null }],
    [{ type: 'anime', format: 'Movie', status: 'completed' }],
    // Case variations on a free-form field
    [{ type: 'anime', format: 'movie', status: 'completed' }],
    [{ type: 'ANIME', format: 'MOVIE', status: 'completed' }],
    [{ type: 'anime', format: 'Movie', status: 'reading' }],
    [{ type: 'anime', format: 'TV', status: 'completed', currentChapter: 24, totalEpisodes: 24 }],
    // Legacy currentEpisode field
    [{ type: 'anime', status: 'reading', currentEpisode: 12, totalEpisodes: 24 }],
    // Malformed / hostile inputs
    [{ type: 'manga', status: 'reading', currentChapter: -5, totalChapters: 100 }],
    [{ type: 'manga', status: 'reading', currentChapter: 1.9, totalChapters: 100 }],
    [{ type: undefined, status: 'completed' }],
    [{ type: 'novel', status: 'reading', currentChapter: 40, totalChapters: 60 }],
    // Mixed library
    [
        { type: 'manga', status: 'completed', currentChapter: 100, totalChapters: 100 },
        { type: 'anime', status: 'reading', currentChapter: 12, totalEpisodes: 24 },
        { type: 'anime', format: 'Movie', status: 'completed' },
        { type: 'manga', status: 'plan_to_read' },
    ],
    // Large library
    Array.from({ length: 60 }, (_, i) => ({
        type: i % 2 === 0 ? 'manga' : 'anime',
        status: i % 3 === 0 ? 'completed' : 'reading',
        currentChapter: i * 17,
        totalChapters: i % 4 === 0 ? null : i * 20,
    })),
];

const BONUS_FIXTURES = [0, 25, 500, 49999, 50000, 123456, -10, NaN];

describe('gamificationCore parity (client TS vs server CJS)', () => {
    it('exports the same constants', () => {
        expect(server.LEVEL_BASE).toBe(client.LEVEL_BASE);
        expect(server.LEVEL_MULTIPLIER).toBe(client.LEVEL_MULTIPLIER);
        expect(server.MAX_LEVEL).toBe(client.MAX_LEVEL);
        expect(server.MAX_EPISODES).toBe(client.MAX_EPISODES);
        expect(server.MAX_CHAPTERS).toBe(client.MAX_CHAPTERS);
        expect(server.MAX_XP_PER_WORK).toBe(client.MAX_XP_PER_WORK);
        expect(server.MAX_BONUS_XP).toBe(client.MAX_BONUS_XP);
        expect(server.STREAK_BONUS_PER_DAY).toBe(client.STREAK_BONUS_PER_DAY);
        expect(server.MAX_STREAK_BONUS).toBe(client.MAX_STREAK_BONUS);
        expect(server.XP_REWARDS).toEqual(client.XP_REWARDS);
        expect(server.BADGE_DEFINITIONS).toEqual(client.BADGE_DEFINITIONS);
    });

    it('computes identical stats across the fixture matrix', () => {
        for (const works of WORK_FIXTURES) {
            for (const bonus of BONUS_FIXTURES) {
                expect(server.calculateUserStats(works, bonus)).toEqual(
                    client.calculateUserStats(works, bonus)
                );
            }
        }
    });

    it('computes identical badges across the fixture matrix', () => {
        for (const works of WORK_FIXTURES) {
            for (const streak of [0, 1, 3, 7, 30, 365]) {
                const stats = client.calculateUserStats(works, 0);
                expect(server.calculateBadges(stats, streak, [], FIXED_NOW)).toEqual(
                    client.calculateBadges(stats, streak, [], FIXED_NOW)
                );
            }
        }
    });

    it('maps totalXp to level identically', () => {
        const samples = [
            0, 1, 99, 100, 101, 205, 1000, 10_000, 100_000, 1_000_000,
            10_000_000, -5, NaN, Infinity,
        ];
        for (const totalXp of samples) {
            expect(server.levelFromTotalXp(totalXp)).toEqual(
                client.levelFromTotalXp(totalXp)
            );
        }
    });

    it('computes streaks identically', () => {
        const now = new Date('2024-03-10T12:00:00');
        const samples = [
            null,
            '2024-03-10T08:00:00',
            '2024-03-09T23:00:00',
            '2024-03-08T23:00:00',
            '2024-01-01T00:00:00',
            'not-a-date',
        ];
        for (const last of samples) {
            for (const prev of [0, 1, 5, 100]) {
                expect(server.computeStreak(prev, last, now)).toEqual(
                    client.computeStreak(prev, last, now)
                );
            }
        }
    });

    it('clamps claimed streaks identically', () => {
        for (const claimed of [0, 1, 2, 50, 9999]) {
            for (const stored of [0, 1, 10]) {
                expect(
                    server.clampClaimedStreak(claimed, stored, '2024-03-10T12:00:00', '2024-03-09T12:00:00')
                ).toEqual(
                    client.clampClaimedStreak(claimed, stored, '2024-03-10T12:00:00', '2024-03-09T12:00:00')
                );
            }
        }
    });
});

describe('gamificationCore behaviour', () => {
    it('caps XP per work at MAX_XP_PER_WORK', () => {
        const stats = client.calculateUserStats(
            [{ type: 'manga', status: 'reading', currentChapter: 4000 }],
            0
        );
        // 15 (add) + capped 15000, not 15 + 20000
        expect(stats.totalXp).toBe(client.XP_REWARDS.ADD_WORK + client.MAX_XP_PER_WORK);
    });

    it('counts stats from capped progress, never raw progress', () => {
        const stats = client.calculateUserStats(
            [{ type: 'manga', status: 'reading', currentChapter: 8000, totalChapters: 100 }],
            0
        );
        expect(stats.totalChaptersRead).toBe(100);
    });

    it('recognises movies regardless of case', () => {
        for (const format of ['Movie', 'movie', 'MOVIE']) {
            const stats = client.calculateUserStats(
                [{ type: 'anime', format, status: 'completed' }],
                0
            );
            expect(stats.totalMoviesWatched).toBe(1);
        }
    });

    it('clamps bonus XP to MAX_BONUS_XP', () => {
        const stats = client.calculateUserStats([], 999_999);
        expect(stats.totalXp).toBe(client.MAX_BONUS_XP);
    });

    it('keeps the level bar within bounds at max level', () => {
        const result = client.levelFromTotalXp(50_000_000);
        expect(result.level).toBe(client.MAX_LEVEL);
        expect(result.xp).toBeLessThanOrEqual(result.xpToNextLevel);
    });

    it('advances a streak by one calendar day, not by elapsed hours', () => {
        // Mon 23:00 -> Wed 08:00 is 33h but skips Tuesday: the streak must reset.
        const result = client.computeStreak(5, '2024-03-04T23:00:00', new Date('2024-03-06T08:00:00'));
        expect(result.streak).toBe(1);
    });

    it('advances a streak on consecutive days', () => {
        const result = client.computeStreak(5, '2024-03-04T23:00:00', new Date('2024-03-05T08:00:00'));
        expect(result.streak).toBe(6);
    });

    it('leaves the streak untouched on the same day', () => {
        const result = client.computeStreak(5, '2024-03-04T08:00:00', new Date('2024-03-04T23:00:00'));
        expect(result).toEqual({ streak: 5, changed: false });
    });

    it('rejects a streak claim that outpaces elapsed days', () => {
        const clamped = client.clampClaimedStreak(
            9999, 3, '2024-03-05T12:00:00', '2024-03-04T12:00:00'
        );
        expect(clamped).toBe(4);
    });

    it('emits badges in a stable order', () => {
        const stats = client.calculateUserStats(
            Array.from({ length: 30 }, () => ({ type: 'manga', status: 'completed', currentChapter: 200 })),
            0
        );
        const a = client.calculateBadges(stats, 30, [], FIXED_NOW).map((b) => b.id);
        const b = client.calculateBadges(stats, 30, [], FIXED_NOW).map((x) => x.id);
        expect(a).toEqual(b);
    });

    it('preserves the original unlock date of existing badges', () => {
        const stats = client.calculateUserStats([{ type: 'manga', status: 'completed' }], 0);
        const first = client.calculateBadges(stats, 0, [], 1000);
        const second = client.calculateBadges(stats, 0, first, 2000);
        expect(second.find((b) => b.id === 'first_work')?.unlockedAt).toBe(1000);
    });
});
