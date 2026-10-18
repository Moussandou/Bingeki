import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReviewComposer } from './ReviewComposer';
import { CommunityPostCard } from './CommunityPostCard';
import { CommunityFeed } from './CommunityFeed';
import type { CommunityPost } from '@/types/community';
import type { Work } from '@/store/libraryStore';
import { communityWrite, getCommunityFeed } from '@/firebase/community';

vi.mock('@/firebase/community', () => ({
    communityWrite: vi.fn(), getCommunityFeed: vi.fn(),
}));
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { uid: 'reader' } }) }));
vi.mock('@/store/libraryStore', () => ({ useLibraryStore: () => ({ works: [{ id: 42, type: 'manga', currentChapter: 2 }] }) }));
vi.mock('@/store/settingsStore', () => ({ useSettingsStore: () => ({ hideScores: false }) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/ui/OptimizedImage', () => ({ OptimizedImage: ({ src, alt }: { src?: string; alt: string }) => <img src={src} alt={alt} /> }));

const work: Work = { id: 42, type: 'manga', title: 'A real reading', image: '/logo.png', status: 'reading', currentChapter: 7 };
const post: CommunityPost = {
    id: 'review', userId: 'author', userName: 'Mina', userPhoto: '/logo.png', title: null,
    workId: 42, workType: 'manga', workKey: 'manga:42', workTitle: 'A real reading', workImage: '/logo.png',
    unit: 5, visibility: 'public', text: 'The hidden revelation', rating: 9, spoiler: false,
    concealed: false, createdAt: 1700000000000, updatedAt: 1700000000000,
    usefulCount: 3, replyCount: 2, reacted: false, following: false,
};

describe('native community experience', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(communityWrite).mockResolvedValue({ success: true });
        vi.mocked(getCommunityFeed).mockResolvedValue({ items: [], cursor: null });
    });
    it('does not render future chapter content or scores before explicit reveal', () => {
        const onOpen = vi.fn();
        render(<CommunityPostCard post={post} onOpen={onOpen} onChanged={vi.fn()} />);
        expect(screen.queryByText('The hidden revelation')).not.toBeInTheDocument();
        expect(screen.queryByText('9/10')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'reveal' }));
        expect(onOpen).toHaveBeenCalledWith('review', true);
        expect(screen.getByRole('button', { name: /useful/ })).toBeDisabled();
    });
    it('renders explicitly revealed text and never lets a reader edit someone else’s review', () => {
        render(<CommunityPostCard post={post} revealed onOpen={vi.fn()} onChanged={vi.fn()} />);
        expect(screen.getByText('The hidden revelation')).toBeVisible();
        expect(screen.queryByText('editReview')).not.toBeInTheDocument();
    });
    it('publishes a typed chapter review with an optional rating and keeps the draft after failure', async () => {
        vi.mocked(communityWrite).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ success: true, xp: 10 });
        const saved = vi.fn();
        render(<ReviewComposer works={[work]} initialUnit={5} onSaved={saved} onCancel={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('yourReview'), { target: { value: 'My original review.' } });
        fireEvent.submit(screen.getByRole('form', { name: 'writeReview' }));
        await screen.findByRole('alert');
        expect(screen.getByLabelText('yourReview')).toHaveValue('My original review.');
        expect(saved).not.toHaveBeenCalled();
        fireEvent.submit(screen.getByRole('form', { name: 'writeReview' }));
        await waitFor(() => expect(saved).toHaveBeenCalledOnce());
        expect(communityWrite).toHaveBeenLastCalledWith({
            action: 'publish', id: expect.any(String),
            review: { workId: 42, workType: 'manga', unit: 5, text: 'My original review.', rating: null, spoiler: true, visibility: 'public' },
        });
        expect(vi.mocked(communityWrite).mock.calls[0][0]).toEqual(vi.mocked(communityWrite).mock.calls[1][0]);
    });
    it('shows a real empty state and loads subsequent pages even if a filtered page is empty', async () => {
        vi.mocked(getCommunityFeed).mockResolvedValueOnce({ items: [], cursor: { id: 'cursor', createdAt: 1 } })
            .mockResolvedValueOnce({ items: [{ ...post, unit: null }], cursor: null });
        render(<CommunityFeed onOpen={vi.fn()} />);
        await screen.findByText('emptyTitle');
        fireEvent.click(screen.getByRole('button', { name: 'loadMore' }));
        expect(await screen.findByText('The hidden revelation')).toBeVisible();
        expect(getCommunityFeed).toHaveBeenLastCalledWith({ filter: 'discover', cursor: { id: 'cursor', createdAt: 1 } });
    });
    it('distinguishes loading failures from an empty community', async () => {
        vi.mocked(getCommunityFeed).mockRejectedValue(new Error('offline'));
        render(<CommunityFeed onOpen={vi.fn()} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('error');
        expect(screen.queryByText('emptyTitle')).not.toBeInTheDocument();
    });
});
