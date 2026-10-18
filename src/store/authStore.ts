/**
 * Auth state store (Zustand)
 * Holds Firebase user and Firestore profile with real-time subscription
 */
import { logger } from '@/utils/logger';
import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/firebase/firestore';

/**
 * Email lives in users/{uid}/private/contact, not on the public profile doc.
 * For the signed-in owner it is already present in the auth token, so we hydrate
 * it from there — no extra Firestore read, and it stays out of public profiles.
 */
function withOwnEmail(profile: UserProfile | null): UserProfile | null {
    if (!profile) return null;
    const authedUser = useAuthStore.getState().user;
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

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    userProfile: null,
    loading: true,
    setUser: (user) => set({ user }),
    setUserProfile: (userProfile) => set({ userProfile }),
    setLoading: (loading) => set({ loading }),
    logout: () => set({ user: null, userProfile: null }),
    syncUserProfile: async (uid: string) => {
        try {
            const { getUserProfile } = await import('@/firebase/firestore');
            const profile = await getUserProfile(uid);
            if (profile && get().user?.uid === uid) {
                set({ userProfile: withOwnEmail(profile) });
            }
        } catch (error) {
            logger.error('Error syncing user profile:', error);
        }
    },
    subscribeToProfile: (uid: string) => {

        let disposed = false;
        let unsubscribe: (() => void) | undefined;
        void import('@/firebase/firestore').then(({ subscribeToUserProfile }) => {
            if (disposed || get().user?.uid !== uid) return;
            unsubscribe = subscribeToUserProfile(uid, profile => {
                if (disposed || get().user?.uid !== uid) return;
                logger.log('[AuthStore] Real-time profile update received:', profile?.isAdmin ? 'Admin' : 'User');
                set({ userProfile: withOwnEmail(profile) });
            });
        }).catch(error => logger.error('Error subscribing to user profile:', error));
        return () => {
            disposed = true;
            unsubscribe?.();
        };
    }
}));
