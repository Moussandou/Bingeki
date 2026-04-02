import { logger } from '@/utils/logger';
import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export const useHaptics = () => {
    const triggerHaptic = useCallback((pattern: HapticPattern) => {
        if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) {
            return;
        }

        try {
            switch (pattern) {
                case 'light':
                    window.navigator.vibrate(10);
                    break;
                case 'medium':
                    window.navigator.vibrate(40);
                    break;
                case 'heavy':
                    window.navigator.vibrate(80);
                    break;
                case 'selection':
                    window.navigator.vibrate(15);
                    break;
                case 'success':
                    window.navigator.vibrate([50, 30, 50]);
                    break;
                case 'warning':
                    window.navigator.vibrate([30, 50, 30]);
                    break;
                case 'error':
                    window.navigator.vibrate([50, 50, 50, 50, 100]);
                    break;
                default:
                    window.navigator.vibrate(10);
            }
        } catch (e) {
            logger.warn('Haptic feedback failed', e);
        }
    }, []);

    return { triggerHaptic };
};
