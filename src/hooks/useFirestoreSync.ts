import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { 
  saveLibraryToFirestore, 
  saveGamificationToFirestore 
} from '@/firebase/firestore';
import { useAuthSync } from './useAuthSync';

/**
 * Hook to manage the debounced synchronization of local store data (Zustand)
 * to Firestore. Handles library works, folders, and gamification progress.
 */
export function useFirestoreSync() {
  const { user, userProfile } = useAuthStore();
  const { isInitialSync } = useAuthSync();
  const [shouldSaveGamification, setShouldSaveGamification] = useState(false);

  const libraryWorks = useLibraryStore((s) => s.works);
  const libraryFolders = useLibraryStore((s) => s.folders);
  const libraryViewMode = useLibraryStore((s) => s.viewMode);
  const librarySortBy = useLibraryStore((s) => s.sortBy);
  
  const gamificationState = useGamificationStore(useShallow((s) => ({
    level: s.level,
    xp: s.xp,
    totalXp: s.totalXp,
    xpToNextLevel: s.xpToNextLevel,
    streak: s.streak,
    lastActivityDate: s.lastActivityDate,
    badges: s.badges,
    totalChaptersRead: s.totalChaptersRead,
    totalWorksAdded: s.totalWorksAdded,
    totalWorksCompleted: s.totalWorksCompleted,
    totalAnimeEpisodesWatched: s.totalAnimeEpisodesWatched,
    totalMoviesWatched: s.totalMoviesWatched,
    bonusXp: s.bonusXp,
  })));

  // 1. Sync store state from profile changes (e.g. from Cloud Functions or other devices)
  useEffect(() => {
    if (!user || userProfile === undefined) return;
    
    if (userProfile) {
      useGamificationStore.getState().syncFromProfile(userProfile);
      useSettingsStore.getState().syncFromProfile(userProfile);
      setShouldSaveGamification(false);
    }
  }, [userProfile, user]);

  // 2. Set flag to allow saving when gamification state changes, but ONLY after initial sync
  useEffect(() => {
    if (!user) return;
    if (isInitialSync.current) {
      isInitialSync.current = false;
      setShouldSaveGamification(false);
      return;
    }
    setShouldSaveGamification(true);
  }, [gamificationState, user]);

  // 3. Auto-save Library to Firestore (3s debounce)
  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(() => {
      saveLibraryToFirestore(user.uid, libraryWorks, libraryFolders, libraryViewMode, librarySortBy);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [libraryWorks, libraryFolders, libraryViewMode, librarySortBy, user]);

  // 4. Auto-save Gamification to Firestore (3s debounce)
  useEffect(() => {
    if (!user || !shouldSaveGamification) return;
    const timeout = setTimeout(() => {
      saveGamificationToFirestore(user.uid, gamificationState);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [gamificationState, user, shouldSaveGamification]);
}
