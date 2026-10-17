import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PublishedPostModal } from './PublishedPostModal';
import type { PublishedPost } from '@/shared/socialBot';
const mocks = vi.hoisted(() => ({ retry: vi.fn(), confirm: vi.fn() }));
vi.mock('@/firebase/socialBot', () => ({ retryPublish: mocks.retry, markPublished: mocks.confirm }));
const post: PublishedPost = {
    id: 'p', title: 'Synthetic', type: 'daily', caption: '', hashtags: '',
    createdAt: 1, scheduledAt: 1, publishedAt: 2, publishedBy: 'admin', status: 'published',
    slides: [], sourceData: {}, platforms: { insta: true, tiktok: true, x: false },
    results: { insta: { id: 'sent', permalink: '', publishedAt: 2 }, tiktok: null },
    errors: { tiktok: 'Publication outcome unknown' },
    publishAttempts: { tiktok: { state: 'unknown' } },
};
describe('uncertain social publication', () => {
    it('blocks automatic retry and requires explicit checked-in-Buffer confirmation', async () => {
        const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
        mocks.confirm.mockResolvedValue({ ok: true, complete: true });
        render(<PublishedPostModal post={post} onClose={() => {}} />);
        expect(screen.getByRole('button', { name: 'Retry publish' })).toBeDisabled();
        const reconcile = screen.getByRole('button', { name: /J'ai vérifié dans Buffer/ });
        fireEvent.click(reconcile);
        expect(mocks.confirm).not.toHaveBeenCalled();
        confirmation.mockReturnValue(true);
        fireEvent.click(reconcile);
        await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith('p', 'tiktok'));
        expect(mocks.retry).not.toHaveBeenCalled();
        confirmation.mockRestore();
    });
});
