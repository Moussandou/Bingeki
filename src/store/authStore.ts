/**
 * Auth state store (Zustand)
 * Holds Firebase user and Firestore profile with real-time subscription
 */
import { logger } from '@/utils/logger';
import { create } from 'zustand';
import { type User } from 'firebase/auth';
import { type UserProfile, getUserProfile, subscribeToUserProfile } from '@/firebase/firestore';

interface AuthState {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setUserProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
    syncUserProfile: (uid: string) => Promise<void>;
    subscribeToProfile: (uid: string) => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    userProfile: null,
    loading: true,
    setUser: (user) => set({ user }),
    setUserProfile: (userProfile) => set({ userProfile }),
    setLoading: (loading) => set({ loading }),
    logout: () => set({ user: null, userProfile: null }),
    syncUserProfile: async (uid: string) => {
        try {
            const profile = await getUserProfile(uid);
            if (profile) {
                set({ userProfile: profile });
            }
        } catch (error) {
            logger.error('Error syncing user profile:', error);
        }
    },
    subscribeToProfile: (uid: string) => {

        return subscribeToUserProfile(uid, (profile) => {
            logger.log('[AuthStore] Real-time profile update received:', profile?.isAdmin ? 'Admin' : 'User');
            set({ userProfile: profile });
        });
    }
}));
