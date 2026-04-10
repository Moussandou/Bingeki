/**
 * Syncs Firebase auth state with local stores on login/logout
 * Merges cloud + local data to avoid overwrites
 */
import { useEffect, useRef } from 'react';
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

export function useAuthSync() {
    const { setUser, setUserProfile, setLoading } = useAuthStore();
    const isInitialSync = useRef(false);

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
                    const mergedLibrary = mergeLibraryData(localLibrary, cloudWorks);
                    const mergedGamification = mergeGamificationData(
                        {
                            ...localGamification,
                            badges: localGamification.badges || []
                        },
                        cloudGamification
                    );


                    isInitialSync.current = true;
                    useLibraryStore.setState({ 
                        works: mergedLibrary,
                        folders: cloudLibraryData?.folders || useLibraryStore.getState().folders,
                        viewMode: cloudLibraryData?.viewMode || useLibraryStore.getState().viewMode,
                        sortBy: cloudLibraryData?.sortBy || useLibraryStore.getState().sortBy
                    });
                    useGamificationStore.setState(mergedGamification);

                    logger.log('[AuthSync] Data merged successfully');
                } catch (error) {
                    logger.error('[AuthSync] Error during initial data sync:', error);
                }
            } else {

                if (profileUnsubscribe) {
                    profileUnsubscribe();
                    profileUnsubscribe = undefined;
                }
                useLibraryStore.getState().resetStore();
                useGamificationStore.getState().resetStore();
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, [setUser, setLoading, setUserProfile]);

    return { isInitialSync };
}
