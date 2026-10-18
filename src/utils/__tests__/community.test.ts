import { beforeEach, describe, expect, it } from 'vitest';
import { canPromptForReview, reviewPromptKey, mustHideCommunityPost } from '../community';
import type { CommunityPost } from '@/types/community';

describe('review prompts and client-side spoiler defense', () => {
    beforeEach(() => localStorage.clear());
    it('limits invitations to one per day and scopes the cooldown to the account', () => {
        const now = 1800000000000;
        expect(canPromptForReview('alice', now)).toBe(true);
        localStorage.setItem(reviewPromptKey('alice'), String(now));
        expect(canPromptForReview('alice', now + 1000)).toBe(false);
        expect(canPromptForReview('alice', now + 86400000)).toBe(true);
        expect(canPromptForReview('bob', now + 1000)).toBe(true);
    });
    it('re-masks already-fetched posts after progress changes and distinguishes media types', () => {
        const post = { userId: 'alice', workKey: 'manga:1', unit: 5, concealed: false, spoiler: false } as CommunityPost;
        const work = { id: 1, type: 'manga' as const, title: 'Reading', status: 'reading' as const, image: '', currentChapter: 5 };
        expect(mustHideCommunityPost(post, [work], 'bob')).toBe(false);
        expect(mustHideCommunityPost(post, [{ ...work, currentChapter: 4 }], 'bob')).toBe(true);
        expect(mustHideCommunityPost(post, [{ ...work, type: 'anime' }], 'bob')).toBe(true);
        expect(mustHideCommunityPost(post, [], 'alice')).toBe(false);
    });
});
