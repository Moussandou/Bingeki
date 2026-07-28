/**
 * Debounced sync of Zustand stores to Firestore
 * Handles library, folders, and gamification state
 *
 * Uses store.subscribe() instead of reactive selectors so that
 * library/gamification changes never re-render the component tree
 * from the root (this hook is mounted in App).
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore, type GamificationState } from '@/store/gamificationStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  saveLibraryToFirestore,
  saveGamificationToFirestore
} from '@/firebase/firestore';
import type { ClientOwnedGamification } from '@/utils/dataProtection';
import { logger } from '@/utils/logger';
import { syncFlags } from './syncFlags';

const SAVE_DEBOUNCE_MS = 3000;

// Only the client-owned fields are saved. Everything else is derived by the
// Cloud Function, and the security rules reject client writes to it.
const GAMIFICATION_KEYS = ['bonusXp', 'streak', 'lastActivityDate'] as const;

function pickGamification(state: GamificationState): ClientOwnedGamification {
  return {
    bonusXp: state.bonusXp,
    streak: state.streak,
    lastActivityDate: state.lastActivityDate,
  };
}

export function useFirestoreSync() {
  useEffect(() => {
    let libraryTimeout: ReturnType<typeof setTimeout> | undefined;
    let gamificationTimeout: ReturnType<typeof setTimeout> | undefined;

    // Auto-save library (3s debounce)
    const unsubLibrary = useLibraryStore.subscribe((state, prevState) => {
      const user = useAuthStore.getState().user;
      if (!user) return;
      if (
        state.works === prevState.works &&
        state.folders === prevState.folders &&
        state.viewMode === prevState.viewMode &&
        state.sortBy === prevState.sortBy
      ) return;

      const uid = user.uid;
      clearTimeout(libraryTimeout);
      libraryTimeout = setTimeout(() => {
        // User may have logged out while the save was pending
        if (useAuthStore.getState().user?.uid !== uid) return;
        const { works, folders, viewMode, sortBy, deletedWorks } = useLibraryStore.getState();
        saveLibraryToFirestore(uid, works, folders, viewMode, sortBy, {
          tombstones: deletedWorks,
        }).catch((error) => {
          logger.error('[FirestoreSync] Library save failed:', error);
        });
      }, SAVE_DEBOUNCE_MS);
    });

    // Auto-save gamification (3s debounce)
    const unsubGamification = useGamificationStore.subscribe((state, prevState) => {
      const user = useAuthStore.getState().user;
      if (!user) return;
      if (GAMIFICATION_KEYS.every((key) => state[key] === prevState[key])) return;

      // Change comes from Firestore hydration: don't write it back
      if (syncFlags.skipGamificationSave) return;

      const uid = user.uid;
      clearTimeout(gamificationTimeout);
      gamificationTimeout = setTimeout(() => {
        if (useAuthStore.getState().user?.uid !== uid) return;
        saveGamificationToFirestore(
          uid,
          pickGamification(useGamificationStore.getState())
        ).catch((error) => {
          logger.error('[FirestoreSync] Gamification save failed:', error);
        });
      }, SAVE_DEBOUNCE_MS);
    });

    // Hydrate stores from profile changes (other devices, cloud functions)
    const unsubProfile = useAuthStore.subscribe((state, prevState) => {
      if (!state.user || !state.userProfile) return;
      if (state.userProfile === prevState.userProfile) return;

      syncFlags.skipGamificationSave = true;
      try {
        useGamificationStore.getState().syncFromProfile(state.userProfile as unknown as Record<string, unknown>);
        useSettingsStore.getState().syncFromProfile(state.userProfile as unknown as Record<string, unknown>);
      } finally {
        syncFlags.skipGamificationSave = false;
      }
    });

    return () => {
      unsubLibrary();
      unsubGamification();
      unsubProfile();
      clearTimeout(libraryTimeout);
      clearTimeout(gamificationTimeout);
    };
  }, []);
}
