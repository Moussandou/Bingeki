/**
 * Server-side guards that have no client equivalent: streak clamping and the
 * payload-equality check that stops the gamification trigger from looping.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as core from '../gamificationCore';

const require_ = createRequire(import.meta.url);
const server = require_(
    path.resolve(__dirname, '../../../functions/gamificationCore.js')
) as typeof core;

describe('clampClaimedStreak', () => {
    it('accepts a one-day advance', () => {
        expect(server.clampClaimedStreak(4, 3, '2024-03-05T10:00:00', '2024-03-04T10:00:00')).toBe(4);
    });

    it('caps a claim that outpaces the elapsed days', () => {
        expect(server.clampClaimedStreak(500, 3, '2024-03-05T10:00:00', '2024-03-04T10:00:00')).toBe(4);
    });

    it('allows catching up over several days', () => {
        expect(server.clampClaimedStreak(6, 3, '2024-03-07T10:00:00', '2024-03-04T10:00:00')).toBe(6);
    });

    it('refuses to grow within the same day', () => {
        expect(server.clampClaimedStreak(99, 3, '2024-03-04T22:00:00', '2024-03-04T08:00:00')).toBe(3);
    });

    it('refuses to grow without a claimed activity date', () => {
        expect(server.clampClaimedStreak(99, 3, null, '2024-03-04T08:00:00')).toBe(3);
    });

    it('rejects a malformed claimed date', () => {
        expect(server.clampClaimedStreak(99, 3, 'garbage', '2024-03-04T08:00:00')).toBe(3);
    });

    it('lets a streak decrease freely', () => {
        expect(server.clampClaimedStreak(1, 30, '2024-03-05T10:00:00', '2024-03-04T10:00:00')).toBe(1);
    });

    it('adopts an existing streak on first verification, so migration keeps it', () => {
        expect(server.clampClaimedStreak(30, 0, '2024-03-05T10:00:00', null)).toBe(30);
    });

    it('bounds that one-off bootstrap claim', () => {
        expect(server.clampClaimedStreak(9999, 0, '2024-03-05T10:00:00', null))
            .toBe(core.MAX_BOOTSTRAP_STREAK);
    });

    it('reverts to one-day-at-a-time once bootstrapped', () => {
        // Same claim replayed after bootstrap can no longer grow freely.
        expect(server.clampClaimedStreak(9999, 30, '2024-03-06T10:00:00', '2024-03-05T10:00:00'))
            .toBe(31);
    });
});

describe('bonus XP clamping', () => {
    it('rejects hostile values', () => {
        expect(server.clampBonusXp(-100)).toBe(0);
        expect(server.clampBonusXp(NaN)).toBe(0);
        expect(server.clampBonusXp('abc')).toBe(0);
        // Corrupt rather than large: granting the cap would reward the corruption.
        expect(server.clampBonusXp(Infinity)).toBe(0);
        expect(server.clampBonusXp(10_000_000)).toBe(core.MAX_BONUS_XP);
    });
});

describe('derived payload equality', () => {
    // Mirrors isSamePayload in functions/gamification.js: identical stats must not
    // be rewritten, otherwise the onGamificationUpdate trigger re-fires forever.
    const SERVER_OWNED = [
        'level', 'xp', 'totalXp', 'xpToNextLevel',
        'totalChaptersRead', 'totalAnimeEpisodesWatched', 'totalMoviesWatched',
        'totalWorksAdded', 'totalWorksCompleted', 'badges', 'streak',
    ];

    function isSamePayload(a: Record<string, unknown>, b: Record<string, unknown>) {
        return SERVER_OWNED.every(k => JSON.stringify(a[k]) === JSON.stringify(b[k]));
    }

    it('treats a recomputation of unchanged data as a no-op', () => {
        const works = [{ type: 'manga', status: 'completed', currentChapter: 10, totalChapters: 10 }];
        const stats = server.calculateUserStats(works, 0);
        const badges = server.calculateBadges(stats, 1, [], 1000);

        const stored = { ...stats, badges, streak: 1 };
        const recomputed = {
            ...server.calculateUserStats(works, 0),
            badges: server.calculateBadges(stats, 1, badges, 2000),
            streak: 1,
        };

        expect(isSamePayload(recomputed, stored)).toBe(true);
    });

    it('detects a real change', () => {
        const a = server.calculateUserStats([{ type: 'manga', currentChapter: 10 }], 0);
        const b = server.calculateUserStats([{ type: 'manga', currentChapter: 20 }], 0);
        expect(isSamePayload({ ...a, badges: [] }, { ...b, badges: [] })).toBe(false);
    });
});
