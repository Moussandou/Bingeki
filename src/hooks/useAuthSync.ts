/**
 * Syncs Firebase auth state with local stores on login/logout
 * Merges cloud + local data to avoid overwrites
 */
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { 
    loadFullLibraryData, 
    loadGamificationFromFirestore, 
    saveUserProfileToFirestore 
} from '@/firebase/firestore';
import { mergeLibraryData, mergeGamificationData } from '@/utils/dataProtection';
import { logger } from '@/utils/logger';
import { syncFlags } from './syncFlags';

export function useAuthSync() {
    const { setUser, setUserProfile, setLoading } = useAuthStore();

    useEffect(() => {
        let profileUnsubscribe: (() => void) | undefined;

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {

                const localLibrary = useLibraryStore.getState().works;
                const localGamification = useGamificationStore.getState();


                await saveUserProfileToFirestore(firebaseUser);


                if (profileUnsubscribe) profileUnsubscribe();
                profileUnsubscribe = useAuthStore.getState().subscribeToProfile(firebaseUser.uid);


                try {
                    const cloudLibraryData = await loadFullLibraryData(firebaseUser.uid);
                    const cloudGamification = await loadGamificationFromFirestore(firebaseUser.uid);

                    const cloudWorks = cloudLibraryData?.works || null;

                    // Smart merge: prefer latest data from either side
                    const mergedLibrary = mergeLibraryData(
                        localLibrary,
                        cloudWorks,
                        useLibraryStore.getState().deletedWorks
                    );
                    const mergedGamification = mergeGamificationData(
                        {
                            ...localGamification,
                            badges: localGamification.badges || []
                        },
                        cloudGamification
                    );


                    useLibraryStore.setState({
                        works: mergedLibrary,
                        folders: cloudLibraryData?.folders || useLibraryStore.getState().folders,
                        viewMode: cloudLibraryData?.viewMode || useLibraryStore.getState().viewMode,
                        sortBy: cloudLibraryData?.sortBy || useLibraryStore.getState().sortBy,
                        hydrated: true
                    });
                    // Initial sync hydration: must not be written back to Firestore
                    syncFlags.skipGamificationSave = true;
                    try {
                        useGamificationStore.setState(mergedGamification);
                        // The merged library may differ from what the server last saw;
                        // re-derive now so the UI is right before the trigger catches up.
                        useGamificationStore.getState().recalculateStats(mergedLibrary);
                    } finally {
                        syncFlags.skipGamificationSave = false;
                    }

                    // Daily login streak, independent of any library change.
                    useGamificationStore.getState().recordActivity();

                    logger.log('[AuthSync] Data merged successfully');
                } catch (error) {
                    useLibraryStore.getState().setHydrated(true);
                    logger.error('[AuthSync] Error during initial data sync:', error);
                }
            } else {

                if (profileUnsubscribe) {
                    profileUnsubscribe();
                    profileUnsubscribe = undefined;
                }
                useLibraryStore.getState().resetStore();
                useGamificationStore.getState().resetStore();
                // Logged-out mode is local-only: nothing to wait for.
                useLibraryStore.getState().setHydrated(true);
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, [setUser, setLoading, setUserProfile]);
}
