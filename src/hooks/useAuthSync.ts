import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
import {
    loadFullLibraryData, loadGamificationFromFirestore, saveUserProfileToFirestore,
    subscribeToLibrary, type LibraryData,
} from '@/firebase/firestore';
import { mergeGamificationData } from '@/utils/dataProtection';
import { mergeLibrarySnapshot } from '@/utils/librarySync';
import { activateLibraryOwner } from '@/utils/libraryAccountScope';
import { logger } from '@/utils/logger';
import { syncFlags } from './syncFlags';

export function useAuthSync() {
    useEffect(() => {
        let generation = 0;
        let profileUnsubscribe: (() => void) | undefined;
        let libraryUnsubscribe: (() => void) | undefined;
        const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
            const ownGeneration = ++generation;
            const isCurrent = () => ownGeneration === generation;
            profileUnsubscribe?.();
            libraryUnsubscribe?.();
            const { setUser, setUserProfile, setLoading } = useAuthStore.getState();
            // Gate subscriptions before any account-specific store changes.
            setLoading(true);
            setUser(null);
            setUserProfile(null);
            try {
                activateLibraryOwner(firebaseUser?.uid || null);
                if (!isCurrent()) return;
                useLibraryStore.setState({ hydrated: false, syncError: null });
                setUser(firebaseUser);
                if (!firebaseUser) {
                    useLibraryStore.getState().setHydrated(true);
                    syncFlags.skipGamificationSave = true;
                    try {
                        useGamificationStore.getState().recalculateStats(useLibraryStore.getState().works);
                    } finally {
                        syncFlags.skipGamificationSave = false;
                    }
                    return;
                }
                const uid = firebaseUser.uid;
                await saveUserProfileToFirestore(firebaseUser);
                if (!isCurrent()) return;
                profileUnsubscribe = useAuthStore.getState().subscribeToProfile(uid);
                const [cloudLibrary, cloudGamification] = await Promise.all([
                    loadFullLibraryData(uid),
                    loadGamificationFromFirestore(uid),
                ]);
                if (!isCurrent()) return;

                const applyCloud = (cloud: LibraryData | null) => {
                    if (!isCurrent() || useLibraryStore.getState().ownerId !== uid) return;
                    const state = useLibraryStore.getState();
                    const merged = mergeLibrarySnapshot({
                        works: state.works, folders: state.folders, deletedWorks: state.deletedWorks,
                        viewMode: state.viewMode, sortBy: state.sortBy,
                        metadataUpdatedAt: state.metadataUpdatedAt, lastUpdated: 0,
                    }, cloud);
                    syncFlags.skipLibrarySave = true;
                    syncFlags.skipGamificationSave = true;
                    try {
                        useLibraryStore.setState({
                            works: merged.works, folders: merged.folders,
                            deletedWorks: merged.deletedWorks, viewMode: merged.viewMode,
                            sortBy: merged.sortBy, metadataUpdatedAt: merged.metadataUpdatedAt,
                        });
                        useGamificationStore.getState().recalculateStats(merged.works);
                    } finally {
                        syncFlags.skipLibrarySave = false;
                        syncFlags.skipGamificationSave = false;
                    }
                };
                syncFlags.skipGamificationSave = true;
                try {
                    useGamificationStore.setState(mergeGamificationData(useGamificationStore.getState(), cloudGamification));
                } finally {
                    syncFlags.skipGamificationSave = false;
                }
                applyCloud(cloudLibrary);
                // Hydration becoming true schedules one save of the initial local/cloud union.
                useLibraryStore.getState().setHydrated(true);
                useGamificationStore.getState().recordActivity();
                libraryUnsubscribe = subscribeToLibrary(uid, applyCloud, error => {
                    if (!isCurrent()) return;
                    useLibraryStore.setState({ syncError: error.message });
                    logger.error('[AuthSync] Library listener failed:', error);
                });
            } catch (error) {
                if (!isCurrent()) return;
                useLibraryStore.setState({ syncError: error instanceof Error ? error.message : String(error) });
                logger.error('[AuthSync] Initial sync failed; cloud writes remain paused:', error);
            } finally {
                if (isCurrent()) setLoading(false);
            }
        });
        return () => {
            ++generation;
            unsubscribe();
            profileUnsubscribe?.();
            libraryUnsubscribe?.();
        };
    }, []);
}
