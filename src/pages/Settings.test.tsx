import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
const mocks = vi.hoisted(() => ({
    removeAccount: vi.fn(), reauthenticate: vi.fn(), toast: vi.fn(),
    user: { uid: 'synthetic', providerData: [{ providerId: 'google.com' }] },
}));
vi.mock('@/components/layout/Layout', () => ({ Layout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/layout/SEO', () => ({ SEO: () => null }));
vi.mock('@/components/library/MALImportModal', () => ({ MALImportModal: () => null }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ addToast: mocks.toast }) }));
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: mocks.user }) }));
vi.mock('@/firebase/account', () => ({ deleteOwnAccount: mocks.removeAccount }));
vi.mock('@/firebase/config', () => ({ db: {}, functions: {} }));
vi.mock('@/firebase/firestore', () => ({
    saveLibraryToFirestore: vi.fn(), saveGamificationToFirestore: vi.fn(), saveUserProfileToFirestore: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
    reauthenticateWithPopup: mocks.reauthenticate,
    GoogleAuthProvider: class {}, OAuthProvider: class {},
}));
import Settings from './Settings';
import { useLibraryStore, type Work } from '@/store/libraryStore';

describe('Settings deletion and reauthentication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.removeAccount.mockReset();
        mocks.reauthenticate.mockReset();
    });
    it('retries the server cleanup after reauthentication even while the UI is busy', async () => {
        const work: Work = { id: 1, title: 'Synthetic', image: '', type: 'anime', status: 'reading' };
        const guest: Work = { ...work, id: 2, title: 'Restored guest' };
        useLibraryStore.setState({ works: [work] });
        mocks.removeAccount.mockRejectedValueOnce({ details: { reason: 'requires-recent-login' } })
            .mockImplementationOnce(async () => { useLibraryStore.setState({ works: [guest] }); });
        mocks.reauthenticate.mockResolvedValue(undefined);
        render(<Settings />);
        fireEvent.click(screen.getByText('settings.data.delete_account'));
        fireEvent.click(screen.getByText('settings.data.goodbye'));
        const verify = await screen.findByText('settings.data.verify_identity');
        expect(useLibraryStore.getState().works).toEqual([work]);
        fireEvent.click(verify);
        await waitFor(() => expect(mocks.removeAccount).toHaveBeenCalledTimes(2));
        expect(mocks.reauthenticate).toHaveBeenCalledOnce();
        await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('settings.toast.account_deleted', 'success'));
        expect(useLibraryStore.getState().works).toEqual([guest]);
    });
    it('keeps data and reports incomplete cleanup instead of showing success', async () => {
        mocks.removeAccount.mockRejectedValueOnce(new Error('cleanup unavailable'));
        render(<Settings />);
        fireEvent.click(screen.getByText('settings.data.delete_account'));
        fireEvent.click(screen.getByText('settings.data.goodbye'));
        await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('settings.toast.delete_error', 'error'));
        expect(mocks.toast).not.toHaveBeenCalledWith('settings.toast.account_deleted', 'success');
    });
});
