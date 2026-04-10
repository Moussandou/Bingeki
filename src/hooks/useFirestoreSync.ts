/**
 * Debounced sync of Zustand stores to Firestore
 * Handles library, folders, and gamification state
 */
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

  // Hydrate stores from profile changes (other devices, cloud functions)
  useEffect(() => {
    if (!user || userProfile === undefined) return;
    
    if (userProfile) {
      useGamificationStore.getState().syncFromProfile(userProfile);
      useSettingsStore.getState().syncFromProfile(userProfile);
      setShouldSaveGamification(false);
    }
  }, [userProfile, user]);

  // Skip first save after initial sync to avoid write loop
  useEffect(() => {
    if (!user) return;
    if (isInitialSync.current) {
      isInitialSync.current = false;
      setShouldSaveGamification(false);
      return;
    }
    setShouldSaveGamification(true);
  }, [gamificationState, user]);

  // Auto-save library (3s debounce)
  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(() => {
      saveLibraryToFirestore(user.uid, libraryWorks, libraryFolders, libraryViewMode, librarySortBy);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [libraryWorks, libraryFolders, libraryViewMode, librarySortBy, user]);

  // Auto-save gamification (3s debounce)
  useEffect(() => {
    if (!user || !shouldSaveGamification) return;
    const timeout = setTimeout(() => {
      saveGamificationToFirestore(user.uid, gamificationState);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [gamificationState, user, shouldSaveGamification]);
}
