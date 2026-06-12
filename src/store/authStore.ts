/**
 * Auth state store (Zustand)
 * Holds Firebase user and Firestore profile with real-time subscription
 */
import { logger } from '@/utils/logger';
import { create } from 'zustand';
import { type User } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { type UserProfile, getUserProfile, subscribeToUserProfile } from '@/firebase/firestore';

/**
 * Email lives in users/{uid}/private/contact, not on the public profile doc.
 * For the signed-in owner it is already present in the auth token, so we hydrate
 * it from there — no extra Firestore read, and it stays out of public profiles.
 */
function withOwnEmail(profile: UserProfile | null): UserProfile | null {
    if (!profile) return null;
    const authedUser = auth.currentUser;
    if (authedUser && authedUser.uid === profile.uid && authedUser.email) {
        return { ...profile, email: authedUser.email };
    }
    return profile;
}

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
                set({ userProfile: withOwnEmail(profile) });
            }
        } catch (error) {
            logger.error('Error syncing user profile:', error);
        }
    },
    subscribeToProfile: (uid: string) => {

        return subscribeToUserProfile(uid, (profile) => {
            logger.log('[AuthStore] Real-time profile update received:', profile?.isAdmin ? 'Admin' : 'User');
            set({ userProfile: withOwnEmail(profile) });
        });
    }
}));
