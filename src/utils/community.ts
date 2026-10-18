import type { Work } from '@/store/libraryStore';
import type { CommunityPost } from '@/types/community';

export function mustHideCommunityPost(post: CommunityPost, works: Work[], viewerId?: string): boolean {
    if (post.userId === viewerId) return false;
    const work = works.find(w => `${w.type}:${w.id}` === post.workKey);
    const progress = work ? Number(work.currentChapter ?? work.currentEpisode ?? 0) : undefined;
    return post.concealed || post.spoiler || (post.unit !== null && (progress === undefined || progress < post.unit));
}

export function reviewPromptKey(uid: string): string {
    return `bingeki-community-prompt:${uid}`;
}

export function canPromptForReview(uid: string, now = Date.now()): boolean {
    const previous = Number(localStorage.getItem(reviewPromptKey(uid)) || 0);
    return now - previous >= 86400000;
}
