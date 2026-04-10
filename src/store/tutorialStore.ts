/**
 * Onboarding tutorial state
 * Persists completion flag to localStorage and Firestore
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from './authStore';

interface TutorialState {
    isActive: boolean;
    currentStep: number;
    hasSeenTutorial: boolean;
    startTutorial: () => void;
    endTutorial: () => void;
    nextStep: () => void;
    prevStep: () => void;
    setHasSeenTutorial: (hasSeen: boolean) => void;
    resetTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>()(
    persist(
        (set, get) => ({
            isActive: false,
            currentStep: 0,
            hasSeenTutorial: false,

            startTutorial: () => set({ isActive: true, currentStep: 0 }),

            endTutorial: () => {
                set({ isActive: false });
                get().setHasSeenTutorial(true);
            },

            nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),

            prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

            setHasSeenTutorial: async (hasSeen) => {
                set({ hasSeenTutorial: hasSeen });


                const user = useAuthStore.getState().user;
                if (user) {
                    try {
                        await setDoc(doc(db, 'users', user.uid), { hasSeenTutorial: hasSeen }, { merge: true });
                    } catch (e) {
                        console.error("Failed to sync tutorial state", e);
                    }
                }
            },

            resetTutorial: () => set({ hasSeenTutorial: false })
        }),
        {
            name: 'bingeki-tutorial-storage',
            partialize: (state) => ({ hasSeenTutorial: state.hasSeenTutorial }),
        }
    )
);
