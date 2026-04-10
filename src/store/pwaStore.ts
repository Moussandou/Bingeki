/**
 * PWA install prompt state management
 */
import { create } from 'zustand';
import { logger } from '@/utils/logger';

export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAState {
    deferredPrompt: BeforeInstallPromptEvent | null;
    isInstalled: boolean;
    showInstallModal: boolean;
    setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
    setIsInstalled: (isInstalled: boolean) => void;
    setShowInstallModal: (show: boolean) => void;
    triggerInstall: () => Promise<void>;
    clearPrompt: () => void;
}

export const usePWAStore = create<PWAState>((set, get) => ({
    deferredPrompt: null,
    isInstalled: false,
    showInstallModal: false,

    setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt, isInstalled: false }),
    setIsInstalled: (isInstalled) => set({ isInstalled }),
    setShowInstallModal: (showInstallModal) => set({ showInstallModal }),
    
    triggerInstall: async () => {
        const { deferredPrompt } = get();
        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    set({ deferredPrompt: null });
                }
            } catch (err) {
                logger.error('Error triggering PWA prompt:', err);
                set({ showInstallModal: true });
            }
        } else {
            // No native prompt available, show manual instructions
            set({ showInstallModal: true });
        }
    },

    clearPrompt: () => set({ deferredPrompt: null }),
}));
