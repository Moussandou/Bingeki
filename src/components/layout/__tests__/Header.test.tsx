import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from '../Header';
import { useAuthStore } from '@/store/authStore';
import { useGamificationStore } from '@/store/gamificationStore';

// Mock Firebase config
vi.mock('@/firebase/config', () => ({
    auth: { onAuthStateChanged: vi.fn() },
    db: {},
}));

// Mock Firestore functions
vi.mock('@/firebase/firestore', () => ({
    loadLibraryFromFirestore: vi.fn(),
    loadGamificationFromFirestore: vi.fn(),
    subscribeToGlobalConfig: vi.fn(),
}));

// Mock the status of stores
vi.mock('@/store/authStore');
vi.mock('@/store/gamificationStore');

describe('Header Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default gamification state
        (useGamificationStore as unknown as any).mockReturnValue({
            level: 5,
            xp: 120,
            streak: 3,
        });
    });

    it('renders login button for guest users', () => {
        // Mock guest state
        (useAuthStore as unknown as any).mockReturnValue({
            user: null,
            userProfile: null,
        });

        render(<Header />);
        
        expect(screen.getByText('header.login')).toBeInTheDocument();
        // Check for navigation links by their text or attributes
        expect(screen.getByText('header.discover')).toBeInTheDocument();
    });

    it('renders user stats and library link for authenticated users', () => {
        // Mock logged in state
        (useAuthStore as unknown as any).mockReturnValue({
            user: { uid: '123' },
            userProfile: { displayName: 'Test User' },
        });

        render(<Header />);
        
        expect(screen.queryByText('header.login')).not.toBeInTheDocument();
        expect(screen.getByText('header.library')).toBeInTheDocument();
        expect(screen.getByText('Lvl 5')).toBeInTheDocument();
        expect(screen.getByText('120 XP')).toBeInTheDocument();
    });

    it('does not show the tier list link for guest users in mobile dock', () => {
        (useAuthStore as unknown as any).mockReturnValue({
            user: null,
        });

        render(<Header />);
        
        // Ensure the tierlist link is NOT present
        const tierlistLink = screen.getAllByRole('link').find(link => 
            link.getAttribute('href')?.includes('/tierlist')
        );
        expect(tierlistLink).toBeUndefined();
    });
});
